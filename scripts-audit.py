#!/usr/bin/env python3
"""Repeatable static quality gate for the Bitvulex static site (stdlib + Node.js)."""
from pathlib import Path
from html.parser import HTMLParser
import subprocess, sys, json, re
ROOT = Path(__file__).resolve().parent
errors, warnings, passed = [], [], []
class AuditHTML(HTMLParser):
    def __init__(self): super().__init__(); self.ids=[]; self.refs=[]; self.forms=[]; self.inputs=[]
    def handle_starttag(self, tag, attrs):
        a=dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag in ('script','link','img','a'):
            key = 'src' if tag in ('script','img') else 'href'
            if a.get(key): self.refs.append((tag,key,a[key]))
        if tag=='form': self.forms.append(a)
        if tag=='input': self.inputs.append(a)
htmls=list(ROOT.rglob('*.html'))
for f in htmls:
    parser=AuditHTML(); parser.feed(f.read_text(errors='replace'))
    dup={x for x in parser.ids if parser.ids.count(x)>1}
    if dup: errors.append(f'{f.relative_to(ROOT)} duplicate IDs: {sorted(dup)}')
    for tag,key,ref in parser.refs:
        if ref.startswith(('http://','https://','mailto:','tel:','data:','#','javascript:')): continue
        path=ref.split('#',1)[0].split('?',1)[0]
        if not path: continue
        target=(f.parent/path).resolve()
        if not target.exists(): errors.append(f'{f.relative_to(ROOT)} missing {key}={ref}')
passed.append(f'Parsed {len(htmls)} HTML pages; checked duplicate IDs and local refs')
for f in (ROOT/'js').glob('*.js'):
    r=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
    if r.returncode: errors.append(f'{f.relative_to(ROOT)} syntax: {r.stderr.strip()}')
passed.append('Node syntax checks completed for JS files')
for f in ROOT.rglob('*.json'):
    try: json.loads(f.read_text())
    except Exception as e: errors.append(f'{f.relative_to(ROOT)} invalid JSON: {e}')
passed.append('JSON configuration parsed')
# Security tripwires
alljs='\n'.join(f.read_text(errors='replace') for f in (ROOT/'js').glob('*.js'))
if re.search(r'password\s*:\s*["\'][^"\']{4,}', alljs, re.I): errors.append('Possible hardcoded password literal in JS')
if 'users: []' not in (ROOT/'js/data.js').read_text(): warnings.append('Review whether any default admin users remain')
if 'Admin sign-in is disabled for security in this static build' in (ROOT/'js/admin.js').read_text(): passed.append('Admin login fails closed; no client-side default credentials')
else: errors.append('Static admin auth fail-closed guard not found')
css=(ROOT/'css/style.css').read_text(errors='replace')
if '@media' in css: passed.append('Responsive CSS media queries found')
else: warnings.append('No CSS media queries found')
vercel=ROOT/'vercel.json'
if vercel.exists():
    cfg=json.loads(vercel.read_text())
    keys={h.get('key','').lower() for rule in cfg.get('headers',[]) for h in rule.get('headers',[])}
    for k in ('x-content-type-options','x-frame-options','referrer-policy','content-security-policy'):
        if k not in keys: warnings.append(f'Missing deployment header: {k}')
    passed.append('Deployment security headers reviewed')
print('BITVULEX STATIC AUDIT')
for x in passed: print('PASS:',x)
for x in warnings: print('WARN:',x)
for x in errors: print('FAIL:',x)
print(f'SUMMARY: {len(passed)} passed checks, {len(warnings)} warnings, {len(errors)} failures')
sys.exit(1 if errors else 0)
