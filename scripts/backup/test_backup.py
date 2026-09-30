import datetime as dt
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('backup', Path(__file__).with_name('backup.py'))
b = importlib.util.module_from_spec(spec)
spec.loader.exec_module(b)


class Response(io.BytesIO):
    headers = {'Location': 'https://www.googleapis.com/upload/session-test'}


class BackupTests(unittest.TestCase):
    def test_retention_covers_daily_weekly_monthly(self):
        files = [{'id': str(i), 'createdTime': (dt.datetime(2026, 9, 30, tzinfo=dt.timezone.utc)
                  - dt.timedelta(days=i)).isoformat()} for i in range(150)]
        keep = b.retention_keep(files)
        self.assertTrue(set(map(str, range(7))) <= keep)
        self.assertIn('30', keep)  # newest August backup
        self.assertIn('61', keep)  # newest July backup
        self.assertNotIn('149', keep)
        self.assertLessEqual(len(keep), 14)

    def test_duplicate_day_retains_newest(self):
        files = [{'id': 'old', 'createdTime': '2026-09-30T01:00:00Z'},
                 {'id': 'new', 'createdTime': '2026-09-30T03:00:00Z'}]
        self.assertEqual(b.retention_keep(files), {'new'})

    def test_empty_retention(self):
        self.assertEqual(b.retention_keep([]), set())

    def test_remote_corruption_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'sample.age'
            path.write_bytes(b'encrypted-fixture')
            drive = object.__new__(b.Drive)
            responses = iter([Response(b'{}'), Response(b'{"id":"fixture"}'), Response(b'corrupt')])
            drive.request = lambda *args, **kwargs: next(responses)
            with self.assertRaisesRegex(RuntimeError, 'checksum mismatch'):
                drive.upload(path, 'folder')

    def test_upload_stream_and_download_match(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'sample.age'
            payload = b'encrypted-fixture' * 100000
            path.write_bytes(payload)
            drive = object.__new__(b.Drive)
            def request(url, method='GET', data=None, headers=None):
                if method == 'POST':
                    self.assertEqual(data['appProperties']['sha256'], b.digest(path))
                    return Response(b'{}')
                if method == 'PUT':
                    self.assertEqual(b''.join(data), payload)
                    return Response(b'{"id":"fixture"}')
                return Response(payload)
            drive.request = request
            self.assertEqual(drive.upload(path, 'folder'), 'fixture')

    def test_unexpected_upload_destination_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'sample.age'
            path.write_bytes(b'fixture')
            response = Response(b'{}')
            response.headers = {'Location': 'https://example.invalid/upload'}
            drive = object.__new__(b.Drive)
            drive.request = lambda *a, **k: response
            with self.assertRaisesRegex(RuntimeError, 'destination'):
                drive.upload(path, 'folder')

    def test_shared_folder_rejected(self):
        drive = object.__new__(b.Drive)
        drive.files = lambda q: [{'id': 'folder'}]
        drive.json = lambda *a: {'permissions': [{'type': 'anyone', 'role': 'reader'}]}
        with self.assertRaisesRegex(RuntimeError, 'owner-only'):
            drive.folder()


if __name__ == '__main__':
    unittest.main()
