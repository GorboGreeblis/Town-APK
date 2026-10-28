#!/usr/bin/env python3
"""Spell-check the game's dialogue and UI strings.

Extracts every double-quoted string literal from the game source that looks
like prose (contains a space and at least two letters), tokenises the words
and reports those that are not in the English dictionary nor in the game's own
vocabulary (character and place names, invented words). Also prints every line
spoken by or about a given character for manual proofreading.

Usage: python3 tools/spellcheck_dialogue.py [source.html] [--who HENNRICK]
Requires: pip install pyspellchecker
"""
import re, sys, pathlib, collections
from spellchecker import SpellChecker

root = pathlib.Path(__file__).resolve().parent.parent
args = [a for i, a in enumerate(sys.argv[1:], 1) if not a.startswith('--') and sys.argv[i - 1] != '--who']   # the name after --who is not a file
src = pathlib.Path(args[0]) if args else root / 'tools' / 'uncompressed.html'
who = None
if '--who' in sys.argv:
    who = sys.argv[sys.argv.index('--who') + 1].upper()
s = src.read_text(encoding='utf-8')

# Game vocabulary: names and invented words that are not dictionary words.
GAME_WORDS = """
greeblis greebli gorbo gorbos mama hennrick mushroom anomalee avarice montgummery mont gemtoe etcher
glyph sparkakus nextessa zollod fortizmo somlet gooward gooburger goo gomp zzz dino kingdino larry slug
gratelet cutebex synthetics organics ancients consortium summoning pillar vhs mk ok okay hmm hm uh um
gfxinfo blossom blossoms acorn acorns shovel seeds jar jars etch etched etching etches kiosk sheriff
prehistoric cosmic glitch robot dancefloor drumsnare bbq nom noms yum yay whoa woah ooh aah ahh ha haha
hubby sugar baby hon dear colleague colleagues era eras artifact artifacts gem gems blossomed juice
synthetic organic tentacles tentacle gable prism spore spores fairly mostly nobody tip
""".split()

strings = re.findall(r'"((?:[^"\\\n]|\\.)*)"', s)
prose = [t for t in strings if ' ' in t and len(re.findall('[A-Za-z]', t)) >= 2 and not re.search(r'[{}();=<>#/\\]', t)]
prose = list(dict.fromkeys(prose))  # unique, keep order
print(f'{len(prose)} prose-like strings in {src.name}')

if who:
    print(f'\n--- strings mentioning or spoken as {who} ---')
    pat = re.compile(r'\["%s","[A-Z]+",\d+(?:,"(?:[^"\\]|\\.)*")+\]|\["[A-Z]+","%s",\d+(?:,"(?:[^"\\]|\\.)*")+\]' % (who[:2], who[:2]))
    for m in pat.finditer(s):
        print('  ', m.group(0))
    for t in prose:
        if who.lower() in t.lower():
            print('  ', json_like := '"' + t + '"')

spell = SpellChecker()
spell.word_frequency.load_words(GAME_WORDS)
unknown = collections.defaultdict(list)
for t in prose:
    for w in re.findall(r"[A-Za-z][A-Za-z']*[A-Za-z]|[A-Za-z]", t.replace('\\n', ' ')):
        if len(w) < 2 or w.isupper():          # skip shouting/acronyms (checked lowercase below)
            lw = w.lower()
        else:
            lw = w.lower()
        lw = lw.strip("'")
        if lw.endswith("'s"):
            lw = lw[:-2]
        if lw in spell or lw in GAME_WORDS or not lw:
            continue
        unknown[lw].append(t)

print(f'\n--- {len(unknown)} words not in dictionary or game vocabulary ---')
for w, ctx in sorted(unknown.items(), key=lambda kv: -len(kv[1])):
    sample = ctx[0][:90].replace('\n', ' ')
    sugg = ', '.join(list(spell.candidates(w) or [])[:3])
    print(f'  {w:18s} x{len(ctx):<3d} e.g. "{sample}"   suggestions: {sugg}')
