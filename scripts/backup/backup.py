"""Encrypted logical DB backup. No credentials or database content in logs."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import urllib.error
import urllib.parse
import urllib.request

PROJECT = 'ezbdoudxtgqqewkrzzyg'
IMAGE = 'postgres:17.6-bookworm'
APP = 'rabin-engine-backup-v1'
API = 'https://www.googleapis.com/drive/v3/files'


def required(name):
    value = os.environ.get(name, '')
    if not value:
        raise RuntimeError('Missing configuration: ' + name)
    return value


def digest(path):
    h = hashlib.sha256()
    with open(path, 'rb') as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b''):
            h.update(block)
    return h.hexdigest()


class Drive:
    def __init__(self):
        payload = urllib.parse.urlencode({
            'client_id': required('GDRIVE_CLIENT_ID'),
            'client_secret': required('GDRIVE_CLIENT_SECRET'),
            'refresh_token': required('GDRIVE_REFRESH_TOKEN'),
            'grant_type': 'refresh_token',
        }).encode()
        with urllib.request.urlopen(urllib.request.Request(
                'https://oauth2.googleapis.com/token', data=payload), timeout=30) as r:
            self.token = json.load(r)['access_token']

    def request(self, url, method='GET', data=None, headers=None):
        hdr = {'Authorization': 'Bearer ' + self.token, **(headers or {})}
        if isinstance(data, dict):
            data = json.dumps(data).encode()
            hdr['Content-Type'] = 'application/json'
        return urllib.request.urlopen(urllib.request.Request(
            url, data=data, headers=hdr, method=method), timeout=120)

    def json(self, url, method='GET', data=None):
        with self.request(url, method, data) as response:
            return json.load(response)

    def files(self, query):
        result, page = [], None
        while True:
            args = {'q': query, 'pageSize': 1000,
                    'fields': 'nextPageToken,files(id,name,createdTime,appProperties)'}
            if page:
                args['pageToken'] = page
            data = self.json(API + '?' + urllib.parse.urlencode(args))
            result.extend(data.get('files', []))
            page = data.get('nextPageToken')
            if not page:
                return result

    def folder(self):
        query = ("trashed=false and mimeType='application/vnd.google-apps.folder' "
                 "and appProperties has { key='backupApp' and value='" + APP + "' }")
        folders = self.files(query)
        if len(folders) > 1:
            raise RuntimeError('Multiple backup folders: operator review required')
        folder = folders[0] if folders else self.json(API, 'POST', {
            'name': 'Rabin Engineering - Encrypted Backups',
            'mimeType': 'application/vnd.google-apps.folder',
            'appProperties': {'backupApp': APP}})
        permissions = self.json(API + '/' + folder['id'] + '/permissions?fields=permissions(type,role)')
        if any(p['type'] != 'user' or p['role'] != 'owner'
               for p in permissions.get('permissions', [])):
            raise RuntimeError('Backup folder must be private and owner-only')
        return folder['id']

    def upload(self, path, folder):
        size = path.stat().st_size
        metadata = {'name': path.name, 'parents': [folder],
                    'appProperties': {'backupApp': APP, 'project': PROJECT,
                                      'sha256': digest(path)}}
        with self.request('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable',
                          'POST', metadata, {'X-Upload-Content-Type': 'application/octet-stream',
                                             'X-Upload-Content-Length': str(size)}) as response:
            location = response.headers['Location']
        parsed = urllib.parse.urlparse(location)
        if parsed.scheme != 'https' or parsed.hostname != 'www.googleapis.com':
            raise RuntimeError('Unexpected upload destination')
        # Streaming iterable avoids loading the whole backup into RAM.
        with path.open('rb') as stream:
            with self.request(location, 'PUT', iter(lambda: stream.read(1024 * 1024), b''),
                              {'Content-Type': 'application/octet-stream',
                               'Content-Length': str(size)}) as response:
                uploaded = json.load(response)
        remote_hash = hashlib.sha256()
        with self.request(API + '/' + uploaded['id'] + '?alt=media') as response:
            for chunk in iter(lambda: response.read(1024 * 1024), b''):
                remote_hash.update(chunk)
        if remote_hash.hexdigest() != metadata['appProperties']['sha256']:
            raise RuntimeError('Remote backup checksum mismatch; retention not run')
        return uploaded['id']


def retention_keep(files):
    """Union of latest 7 calendar days, 4 ISO weeks and 3 calendar months."""
    keep = set()
    for mode, limit in [('day', 7), ('week', 4), ('month', 3)]:
        seen = set()
        for item in sorted(files, key=lambda x: x['createdTime'], reverse=True):
            stamp = dt.datetime.fromisoformat(item['createdTime'].replace('Z', '+00:00'))
            key = stamp.date() if mode == 'day' else (stamp.isocalendar()[:2] if mode == 'week' else (stamp.year, stamp.month))
            if key not in seen and len(seen) < limit:
                seen.add(key)
                keep.add(item['id'])
    return keep


def run(args, env=None):
    # pg clients may include database identities in stderr; keep output private.
    try:
        return subprocess.run(args, env=env, check=True, stdout=subprocess.PIPE,
                              stderr=subprocess.PIPE, timeout=900).stdout
    except subprocess.CalledProcessError as exc:
        # Classify known failures without publishing stderr, SQL, or credentials.
        stderr = (exc.stderr or b'').decode('utf-8', errors='replace').lower()
        category = 'unclassified subprocess failure'
        for marker, label in [
            ('password authentication failed', 'database password rejected'),
            ('tenant or user not found', 'database pooler identity rejected'),
            ('certificate verify failed', 'TLS certificate verification failed'),
            ('does not match host name', 'TLS hostname mismatch'),
            ('root certificate file', 'TLS root certificate unavailable'),
            ('permission denied', 'database or filesystem permission denied'),
            ('could not translate host name', 'database DNS lookup failed'),
            ('connection timed out', 'database connection timed out'),
            ('timeout expired', 'database connection timed out'),
            ('connection refused', 'database connection refused'),
            ('too many connections', 'database connection limit reached'),
            ('server version mismatch', 'database client version mismatch'),
            ('could not find an available, non-overlapping ipv4 address pool', 'container networking unavailable'),
        ]:
            if marker in stderr:
                category = label
                break
        print('Failure category: ' + category, flush=True)
        raise RuntimeError('Backup subprocess failed; no data uploaded') from None


def main():
    os.umask(0o077)
    for key in ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PG_CA_PEM', 'AGE_RECIPIENT',
                'GDRIVE_CLIENT_ID', 'GDRIVE_CLIENT_SECRET', 'GDRIVE_REFRESH_TOKEN']:
        required(key)
    if not required('AGE_RECIPIENT').startswith('age1'):
        raise RuntimeError('Use an age public recipient key')
    if not required('PGHOST').endswith('.supabase.com'):
        raise RuntimeError('Unexpected database host')
    if required('PGUSER') not in ('postgres', 'postgres.' + PROJECT):
        raise RuntimeError('Unexpected source database identity')
    print('Stage: Google token exchange', flush=True)
    drive = Drive()
    print('Stage: Drive folder access', flush=True)
    folder = drive.folder()
    print('Stage: database export', flush=True)
    with tempfile.TemporaryDirectory(prefix='rabin-backup-') as tmp:
        root = Path(tmp)
        (root / 'ca.crt').write_text(required('PG_CA_PEM'))
        env = os.environ.copy()
        env.update(PGPORT='5432', PGDATABASE='postgres', PGSSLMODE='verify-full',
                   PGSSLROOTCERT='/work/ca.crt', PGCONNECT_TIMEOUT='20', PGAPPNAME=APP)
        docker = ['docker', 'run', '--rm', '--user', str(os.getuid()) + ':' + str(os.getgid()),
                  '-v', str(root) + ':/work']
        for key in ['PGHOST', 'PGPORT', 'PGDATABASE', 'PGUSER', 'PGPASSWORD',
                    'PGSSLMODE', 'PGSSLROOTCERT', 'PGCONNECT_TIMEOUT', 'PGAPPNAME']:
            docker += ['-e', key]
        docker += [IMAGE]
        def sql(query):
            return run(docker + ['psql', '-X', '-A', '-t', '-v', 'ON_ERROR_STOP=1', '-c', query], env).decode().strip()
        print('Stage: database connection and version check', flush=True)
        version = sql('show server_version_num')
        if not 170000 <= int(version) < 180000:
            raise RuntimeError('Database major version changed; review backup client')
        # Fail rather than silently omit object bytes if Storage begins being used.
        if sql('select count(*) from storage.objects') != '0':
            raise RuntimeError('Storage files exist: implement object backup before continuing')
        print('Stage: database dump', flush=True)
        run(docker + ['pg_dump', '--format=custom', '--file=/work/database.dump',
                      '--lock-wait-timeout=30000'], env)
        run(docker + ['pg_restore', '--list', '/work/database.dump'], env)
        if sql('select count(*) from storage.objects') != '0':
            raise RuntimeError('Storage changed during backup; object export required')
        print('Stage: database roles export', flush=True)
        roles = run(docker + ['pg_dumpall', '--roles-only', '--no-role-passwords'], env)
        (root / 'roles.sql').write_bytes(roles)
        manifest = {'project': PROJECT, 'created_at': dt.datetime.now(dt.timezone.utc).isoformat(),
                    'server_version_num': version, 'client_image': IMAGE,
                    'sha256': {name: digest(root / name) for name in ['database.dump', 'roles.sql']},
                    'storage_objects': 0, 'restore_tested': False,
                    'excluded': ['Storage object bytes', 'Edge Function secrets', 'Auth provider settings',
                                 'Vault root encryption key', 'role passwords', 'application source (GitHub)']}
        (root / 'manifest.json').write_text(json.dumps(manifest, indent=2))
        archive = root / 'backup.tar.gz'
        with tarfile.open(archive, 'w:gz') as tar:
            for name in ['database.dump', 'roles.sql', 'manifest.json']:
                tar.add(root / name, arcname=name)
        stamp = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
        encrypted = root / ('rabin-engine-' + stamp + '.tar.gz.age')
        run(['age', '-r', required('AGE_RECIPIENT'), '-o', str(encrypted), str(archive)])
        print('Stage: encrypted upload and checksum verification', flush=True)
        uploaded_id = drive.upload(encrypted, folder)
        # Remote checksum alone is not proof of recoverability. Require a recorded restore drill.
        if os.environ.get('BACKUP_RESTORE_VERIFIED') == 'true':
            files = drive.files("'" + folder + "' in parents and trashed=false and "
                                "appProperties has { key='backupApp' and value='" + APP + "' } and "
                                "appProperties has { key='project' and value='" + PROJECT + "' }")
            keep = retention_keep(files) | {uploaded_id}
            for item in files:
                if item['id'] not in keep:
                    drive.json(API + '/' + item['id'], 'PATCH', {'trashed': True})
        print('Encrypted backup uploaded; downloaded checksum verified. Restore drill is separate.')


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        # Emit only a numeric HTTP status and an allowlisted OAuth error code.
        if isinstance(exc, urllib.error.HTTPError):
            print('HTTP status: ' + str(exc.code))
            try:
                code = json.loads(exc.read(8192)).get('error')
                if code in ('invalid_client', 'invalid_grant', 'access_denied', 'unauthorized_client', 'invalid_scope'):
                    print('OAuth error: ' + code)
            except (ValueError, TypeError):
                pass
        # Never print HTTP response bodies, connection strings or subprocess output.
        print('Backup failed (' + type(exc).__name__ + '). Check private configuration and service access.')
        raise SystemExit(1)
