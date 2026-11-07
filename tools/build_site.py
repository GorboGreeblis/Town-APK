#!/usr/bin/env python3
"""Build the web site the Store app loads (B133, 4.0.64; the author: the game hosted on an ar.io site).

Meta's Store takes a web app's APK only when it is made by Meta's Bubblewrap CLI and its start URL is HTTPS: the
APK opens the hosted game in the Quest Browser, and the browser checks that the site and the APK belong together
through Digital Asset Links. This writes the folder to upload, at the site's root:

    index.html                      the final build (the root index.html: no debug or logging code), unchanged
    tex/                            the pre-painted textures (optional extras: the game paints any that are missing)
    manifest.webmanifest            the web app manifest Bubblewrap reads (name, start URL, icons, colours)
    icon-192.png, icon-512.png      the app's icon (from tools/store/icon-512.png)
    .well-known/assetlinks.json     Digital Asset Links: the package com.montgummery.greeblis and the SHA-256 of the
                                    release signing certificate (read from the root APK with apksigner)

and a zip of it next to the folder. Nothing in it names the site's address: every path is relative, so the same
folder works at any HTTPS origin's root.

    python3 tools/build_site.py [--out tools/.runs/site]
"""
import json, os, pathlib, re, shutil, subprocess, sys, zipfile

root = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
out = pathlib.Path(args[args.index('--out') + 1]) if '--out' in args else root / 'tools' / '.runs' / 'site'
PACKAGE = 'com.montgummery.greeblis'
NAME, SHORT = 'GREEBLIS TOWN', 'Greeblis Town'
BG = '#0d0d1a'

def fingerprint():
    sdk = os.environ.get('ANDROID_HOME') or os.environ.get('ANDROID_SDK_ROOT')
    if not sdk:
        for l in (root / 'tools/android/local.properties').read_text().splitlines():
            if l.startswith('sdk.dir='): sdk = l.split('=', 1)[1]
    r = subprocess.run([f'{sdk}/build-tools/34.0.0/apksigner', 'verify', '--print-certs', str(root / 'GreeblisTown-release.apk')],
                       capture_output=True, text=True, check=True)
    m = re.search(r'certificate SHA-256 digest: ([0-9a-f]{64})', r.stdout)
    if not m: sys.exit('build_site: no SHA-256 certificate digest from apksigner')
    h = m.group(1).upper()
    return ':'.join(h[i:i + 2] for i in range(0, 64, 2))

if out.exists(): shutil.rmtree(out)
(out / '.well-known').mkdir(parents=True)
shutil.copyfile(root / 'index.html', out / 'index.html')
shutil.copytree(root / 'tools/android/app/src/main/assets/tex', out / 'tex')
from PIL import Image
icon = Image.open(root / 'tools/store/icon-512.png').convert('RGBA')
icon.save(out / 'icon-512.png'); icon.resize((192, 192), Image.LANCZOS).save(out / 'icon-192.png')
manifest = {
    'name': NAME, 'short_name': SHORT, 'start_url': './', 'scope': './', 'display': 'standalone',
    'background_color': BG, 'theme_color': BG,
    'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
              {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'}],
}
(out / 'manifest.webmanifest').write_text(json.dumps(manifest, indent=2) + '\n')
fp = fingerprint()
links = [{'relation': ['delegate_permission/common.handle_all_urls'],
          'target': {'namespace': 'android_app', 'package_name': PACKAGE, 'sha256_cert_fingerprints': [fp]}}]
(out / '.well-known/assetlinks.json').write_text(json.dumps(links, indent=2) + '\n')
z = out.with_suffix('.zip')
with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as f:
    for p in sorted(out.rglob('*')):
        if p.is_file(): f.write(p, p.relative_to(out).as_posix())
n = sum(1 for p in out.rglob('*') if p.is_file()); size = sum(p.stat().st_size for p in out.rglob('*') if p.is_file())
print(f'site: {out} ({n} files, {size / 1e6:.1f} MB; {z.name} {z.stat().st_size / 1e6:.1f} MB)')
print(f'assetlinks: {PACKAGE} {fp}')
