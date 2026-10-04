#!/usr/bin/env python3
import argparse, hashlib, json, re, sys, zipfile
from pathlib import Path

FIXED_ZIP_DT = (1980, 1, 1, 0, 0, 0)
FORBIDDEN = [
    re.compile(r'authenticatedAccount', re.I),
    re.compile(r'data-authenticated-account', re.I),
    re.compile(r'"email"\s*:\s*"[^"@]+@[^"@]+"', re.I),
]

def sha256_bytes(b):
    return hashlib.sha256(b).hexdigest()

def read_json(p):
    return json.loads(Path(p).read_text(encoding='utf-8'))

def safe_rel(rel):
    p = Path(rel)
    if p.is_absolute() or '..' in p.parts:
        raise ValueError(f'unsafe relative path: {rel}')
    return p

def add_bytes(zf, name, data):
    zi = zipfile.ZipInfo(str(name).replace('\\', '/'), FIXED_ZIP_DT)
    zi.compress_type = zipfile.ZIP_DEFLATED
    zi.external_attr = 0o100644 << 16
    zf.writestr(zi, data)

def page_from_capture(capture_root, item):
    rel = safe_rel(item['source']['sitePath'])
    p = capture_root / 'site' / rel
    if not p.is_file():
        raise FileNotFoundError(p)
    b = p.read_bytes()
    text = b.decode('utf-8', errors='strict')
    bad = [rx.pattern for rx in FORBIDDEN if rx.search(text)]
    if bad:
        raise ValueError(f'derived page failed public-safety scan {p}: {bad}')
    return p, b

def localization_from_capture(capture_root, scope):
    p = capture_root / 'site' / '__localization' / 'scopes' / f'{scope}.en.json'
    return p if p.is_file() else None

def content_records(capture_root, route, site_path):
    idxp = capture_root / 'site' / '__vex' / 'content' / 'index.json'
    if not idxp.is_file():
        return []
    idx = read_json(idxp)
    out = []
    for rec in idx.get('pages', []):
        if rec.get('route') == route and rec.get('localPath') == site_path:
            cp = capture_root / 'site' / rec['contentPath'].lstrip('/')
            if cp.is_file():
                out.append(cp)
    return out

def validate_plan(plan):
    if plan.get('schemaVersion') != 'vex-content-forge.routing/v0.1':
        raise ValueError('unsupported routing schema')
    ids, slugs = set(), set()
    for b in plan.get('bundles', []):
        bid, slug = b['bundleRef'], b['item']['slug']
        if bid in ids:
            raise ValueError(f'duplicate bundleRef {bid}')
        if slug in slugs:
            raise ValueError(f'duplicate slug {slug}')
        ids.add(bid)
        slugs.add(slug)
        if b['item']['privacy']['rawSourceAllowed'] is not False:
            raise ValueError(f'{bid}: rawSourceAllowed must be false')

def main():
    ap = argparse.ArgumentParser(description='Form deterministic, public-safe integration bundles from a completed VexSite capture.')
    ap.add_argument('capture_root')
    ap.add_argument('routing_plan')
    ap.add_argument('--output', required=True)
    args = ap.parse_args()

    capture = Path(args.capture_root).resolve()
    out = Path(args.output).resolve()
    out.mkdir(parents=True, exist_ok=True)
    plan = read_json(args.routing_plan)
    validate_plan(plan)

    cap = read_json(capture / 'manifests' / 'capture.json')
    sov = read_json(capture / 'manifests' / 'sovereignty.json')
    if cap.get('rawPublicationAllowed') is not False:
        raise ValueError('capture does not assert rawPublicationAllowed=false')
    if not sov.get('summary', {}).get('networkClosed'):
        raise ValueError('pilot requires a network-closed derived capture')

    cap_bytes = (capture / 'manifests' / 'capture.json').read_bytes()
    cap_ref = {
        'toolVersion': cap.get('toolVersion'),
        'inputZipSha256': cap.get('inputZipSha256'),
        'captureManifestSha256': sha256_bytes(cap_bytes),
        'createdAt': cap.get('createdAt'),
        'rawPublicationAllowed': cap.get('rawPublicationAllowed'),
        'networkClosed': sov.get('summary', {}).get('networkClosed'),
        'contentComplete': sov.get('summary', {}).get('contentComplete'),
    }

    formed = []
    for b in plan['bundles']:
        item = b['item']
        route = item['route']
        site_path = item['source']['sitePath']
        scope = item['source']['pageScope']
        _, page_b = page_from_capture(capture, item)
        loc_p = localization_from_capture(capture, scope)
        content_ps = content_records(capture, route, site_path)

        manifest = {
            'schemaVersion': 'vex-content-forge.bundle/v0.1',
            'bundleRef': b['bundleRef'],
            'sourceCapture': cap_ref,
            'groupingReason': b['groupingReason'],
            'item': item,
            'payload': {
                'page': {
                    'path': f'payload/pages/{item["slug"]}.html',
                    'sha256': sha256_bytes(page_b),
                    'bytes': len(page_b),
                },
                'localization': None,
                'contentRecords': [],
            },
        }
        entries = [(manifest['payload']['page']['path'], page_b)]

        if loc_p:
            lb = loc_p.read_bytes()
            lp = f'payload/localization/{scope}.en.json'
            manifest['payload']['localization'] = {
                'path': lp,
                'sha256': sha256_bytes(lb),
                'bytes': len(lb),
            }
            entries.append((lp, lb))

        for cp in content_ps:
            cb = cp.read_bytes()
            rp = f'payload/content/{cp.name}'
            manifest['payload']['contentRecords'].append({
                'path': rp,
                'sha256': sha256_bytes(cb),
                'bytes': len(cb),
            })
            entries.append((rp, cb))

        mb = json.dumps(manifest, indent=2, ensure_ascii=False).encode('utf-8') + b'\n'
        zpath = out / f'{b["bundleRef"]}.zip'
        with zipfile.ZipFile(zpath, 'w') as zf:
            add_bytes(zf, 'BUNDLE-MANIFEST.json', mb)
            for name, data in sorted(entries, key=lambda x: x[0]):
                add_bytes(zf, name, data)

        zb = zpath.read_bytes()
        formed.append({
            'bundleRef': b['bundleRef'],
            'zip': zpath.name,
            'sha256': sha256_bytes(zb),
            'bytes': len(zb),
            'slug': item['slug'],
            'disposition': item['destination']['disposition'],
        })

    index = {
        'schemaVersion': 'vex-content-forge.bundle-index/v0.1',
        'sourceCapture': cap_ref,
        'bundles': formed,
    }
    (out / 'bundle-index.json').write_text(json.dumps(index, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps(index, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f'[vex-content-forge] ERROR: {e}', file=sys.stderr)
        sys.exit(2)
