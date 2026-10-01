"""Generate native runner projects on a trusted Flutter development machine.
Does not build, sign, deploy, or send email. Never copy credentials here.
"""
import pathlib
import shutil
import subprocess
import sys

source = pathlib.Path(__file__).resolve().parent
out = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else source.parent / 'rabin-mobile-build').resolve()
if out.exists():
    raise SystemExit('Output directory already exists; choose a new directory to preserve your files.')
subprocess.run(['flutter', 'create', '--platforms=android,ios', '--org', 'ir.rabinazar',
                '--project-name', 'rabin_engineering', '--no-pub', str(out)], check=True)
for name in ['lib', 'test']:
    shutil.rmtree(out / name, ignore_errors=True)
    shutil.copytree(source / name, out / name)
shutil.copy2(source / 'pubspec.yaml', out / 'pubspec.yaml')
(out / 'analysis_options.yaml').write_text('analyzer:\n  exclude: [build/**]\n')
manifest = out / 'android/app/src/main/AndroidManifest.xml'
text = manifest.read_text()
text = text.replace('<application', '<uses-permission android:name="android.permission.INTERNET"/>\n    <application android:allowBackup="false"', 1)
text = text.replace('android:label="rabin_engineering"', 'android:label="رابین آذر"')
manifest.write_text(text)
plist = out / 'ios/Runner/Info.plist'
text = plist.read_text().replace('<string>Rabin Engineering</string>', '<string>رابین آذر</string>')
plist.write_text(text)
print('Native project prepared at:', out)
print('Next: flutter pub get; flutter analyze; flutter test. Review platform signing before release.')
