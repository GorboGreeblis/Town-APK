#!/usr/bin/env python3
"""Docs consistency check (quick tier). The docs drift when a tool is added or renamed; this catches it:

  - every tool in tools/ (*.js, *.sh, *.py, lib/*.js) has a row in README.md (`name` in backticks);
  - every doc in tools/ (*.md) is listed in README.md;
  - every script that run_tests.sh runs exists;
  - every test_*.js that run_tests.sh runs is named in TESTING.md's tier list (the one list of what each tier runs);
  - every `tool.js` / `tool.py` / `tool.sh` named in the docs exists (in tools/ or tools/lib/);
  - every "NOTES n" reference points at a note that exists.

  python3 -I tools/check_docs.py        exit 1 and a list of problems, or "DOCS CHECK PASSED"
"""
import os
import re
import sys

T = os.path.dirname(os.path.abspath(__file__))
README = open(os.path.join(T, 'README.md'), encoding='utf-8').read()
problems = []

tools = sorted([f for f in os.listdir(T) if f.endswith(('.js', '.sh', '.py'))] +
               ['lib/' + f for f in os.listdir(os.path.join(T, 'lib')) if f.endswith('.js')])
for f in tools:
    name = os.path.basename(f)
    # a row names the tool in backticks, possibly with arguments or its folder (`build_experiment.sh NAME`, `lib/harness.js`)
    if not re.search(r'`(?:[\w./-]*/)?' + re.escape(name) + r'(?:[ `])', README):
        problems.append(f'README.md has no row for {f}')

for f in sorted(os.listdir(T)):
    if f.endswith('.md') and f != 'README.md' and f'`{f}`' not in README and f'`{f[:-3]}' not in README:
        problems.append(f'README.md does not list the doc {f}')

runner = open(os.path.join(T, 'run_tests.sh'), encoding='utf-8').read()
for f in sorted(set(re.findall(r'\$ROOT/tools/([\w./-]+\.(?:js|sh|py))', runner))):
    if not os.path.exists(os.path.join(T, f)):
        problems.append(f'run_tests.sh runs tools/{f}, which does not exist')

testing = open(os.path.join(T, 'TESTING.md'), encoding='utf-8').read()
for f in sorted(set(re.findall(r'\$ROOT/tools/(test_[\w-]+\.js)', runner))):
    if f'`{f}`' not in testing:
        problems.append(f'run_tests.sh runs {f}, but TESTING.md\'s tier list does not name it')

existing = set(os.path.basename(f) for f in tools) | set(os.listdir(T))
notes = open(os.path.join(T, 'NOTES.md'), encoding='utf-8').read()
last_note = max(int(n) for n in re.findall(r'^(\d+)\. \*\*', notes, re.M))
for doc in sorted(f for f in os.listdir(T) if f.endswith('.md')):
    text = open(os.path.join(T, doc), encoding='utf-8').read()
    if doc not in ('FIXES.md', 'NOTES.md', 'BUGS.md'):   # records of what was done at the time; they name tools since retired
        for f in sorted(set(re.findall(r'`(?:tools/)?(?:lib/)?([\w-]+\.(?:js|py|sh))[` ]', text))):
            if f not in existing and not os.path.exists(os.path.join(T, '..', f)):
                problems.append(f'{doc} names {f}, which is not in tools/')
    for n in sorted(set(int(x) for x in re.findall(r'NOTES(?:\.md)? (\d+)', text))):
        if n > last_note:
            problems.append(f'{doc} refers to NOTES {n}, but the last note is {last_note}')

for p in problems:
    print('  FAIL  ' + p)
print(f'DOCS CHECK FAILED ({len(problems)})' if problems else
      f'DOCS CHECK PASSED ({len(tools)} tools with README rows, notes up to {last_note})')
sys.exit(1 if problems else 0)
