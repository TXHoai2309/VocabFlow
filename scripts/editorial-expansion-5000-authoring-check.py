"""Read-only checks for original editor-authored PSV shards; no provider/DB calls."""
from pathlib import Path
import argparse
import collections
import json
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / '.vocabflow-local/editorial-refresh-20261031/ticket14-expansion-5000-r0001/preparation'
DATA = ROOT / 'vocabflow-dataset/workspaces/editorial-refresh-20261031/expansion-5000-r0001/authored'
FIELDS = ['headword', 'pos', 'level', 'meaningVi', 'definitionEn', 'exampleEn', 'exampleVi', 'imageScene']
POS = {'NOUN', 'VERB', 'ADJECTIVE', 'ADVERB', 'PRONOUN', 'PREPOSITION', 'DETERMINER', 'CONJUNCTION', 'INTERJECTION', 'NUMBER', 'PHRASE'}


def valid_headword(text):
    text = unicodedata.normalize('NFKC', text)
    def latin_letter(c):
        return unicodedata.category(c).startswith('L') and 'LATIN' in unicodedata.name(c, '')
    return bool(text) and (latin_letter(text[0]) or text[0] in '0123456789') and any(latin_letter(c) for c in text) and all(
        latin_letter(c) or c in "0123456789 '\u2019.-/" for c in text)


def norm(s):
    s = unicodedata.normalize('NFKC', s).casefold().replace('’', "'").replace('‘', "'")
    s = re.sub('[‐‑–—-]', ' ', s)
    return ' '.join(s.split())


def read_rows(path):
    rows, errors = [], []
    for number, line in enumerate(path.read_text(encoding='utf-8').splitlines(), 1):
        if not line.strip() or line.startswith('#'):
            continue
        parts = [s.strip() for s in line.split('|')]
        if len(parts) != 8:
            errors.append({'file': path.name, 'line': number, 'error': 'COLUMN_COUNT', 'actual': len(parts)})
            continue
        row = dict(zip(FIELDS, parts))
        row.update(topicCode=path.stem, sourceFile=path.name, sourceLine=number)
        rows.append(row)
    return rows, errors


def check(paths):
    plan = json.loads((PACK / 'production-plan.json').read_text(encoding='utf-8'))
    baseline = json.loads((PACK / 'baseline-1547.json').read_text(encoding='utf-8'))['items']
    variants = plan['normalization']['englishVariantTokens']
    def key(s):
        return ' '.join(variants.get(t, t) for t in norm(s).split())
    existing = {key(i['word']): i['word'] for i in baseline}
    seen, examples, rows, errors = {}, {}, [], []
    topic_codes = {t['code'] for t in plan['topics']}
    for path in paths:
        data, problems = read_rows(path)
        errors.extend(problems)
        if path.stem not in topic_codes:
            errors.append({'file': path.name, 'error': 'UNKNOWN_TOPIC'})
        for row in data:
            location = {'file': path.name, 'line': row['sourceLine'], 'word': row['headword']}
            def issue(code, **details):
                errors.append({**location, 'error': code, **details})
            if not all(row[f] for f in FIELDS):
                issue('EMPTY_FIELD')
            if row['pos'] not in POS:
                issue('INVALID_POS')
            if row['level'] not in ['FIRST_WORDS', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2']:
                issue('INVALID_LEVEL')
            if not valid_headword(row['headword']):
                issue('HEADWORD_FORMAT')
            if len(row['meaningVi']) > 120:
                issue('GLOSS_TOO_LONG')
            if key(row['headword']) in existing:
                issue('EXISTING_HEADWORD', existing=existing[key(row['headword'])])
            k = key(row['headword'])
            if k in seen:
                issue('DUPLICATE_AUTHORED_HEADWORD', previous=seen[k])
            seen[k] = location
            ex = norm(row['exampleEn'])
            if ex in examples:
                issue('DUPLICATE_EXAMPLE', previous=examples[ex])
            examples[ex] = location
            if not re.search(r'(?<!\w)' + re.escape(norm(row['headword'])) + r'(?!\w)', ex):
                issue('EXACT_HEADWORD_NOT_IN_EXAMPLE')
            if len(row['exampleEn'].split()) > 26 or len(row['exampleVi'].split()) > 45:
                issue('EXAMPLE_TOO_LONG')
            if len(row['definitionEn'].split()) < 3 or len(row['imageScene'].split()) < 4:
                issue('DEFINITION_OR_SCENE_TOO_SHORT')
            if any(token in ' '.join(row[f] for f in FIELDS).casefold() for token in ['todo', 'placeholder', 'lorem ipsum', '\ufffd']):
                issue('PLACEHOLDER_OR_ENCODING_ERROR')
            if re.match(r'(?i)^(this is (an? |the )?|i (learned|learnt|studied) (the word |about ))', row['exampleEn']):
                issue('GENERIC_TEACHING_EXAMPLE')
            rows.append(row)
    return rows, errors


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('paths', nargs='*')
    p.add_argument('--summary', action='store_true')
    args = p.parse_args()
    paths = [ROOT / n for n in args.paths] if args.paths else sorted(DATA.glob('*.psv'))
    rows, errors = check(paths)
    result = {'status': 'PASS' if not errors else 'NEEDS_CORRECTION', 'rows': len(rows),
              'topicCounts': dict(collections.Counter(r['topicCode'] for r in rows)),
              'levelCounts': dict(collections.Counter(r['level'] for r in rows)),
              'errors': errors[:120], 'errorCount': len(errors),
              'semanticReviewNotReplacedByMechanicalChecks': True, 'providerCalls': 0, 'dbWrites': 0}
    print(json.dumps(result, ensure_ascii=True))
    raise SystemExit(1 if errors else 0)
