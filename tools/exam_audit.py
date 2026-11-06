#!/usr/bin/env python3
"""Answer-guessing audit for the exams: how often the correct option is the shortest, and absolute-word rates.

"Shortest" counts English characters. A multiple-response item counts when its shortest correct option is
shorter than every wrong option. Run: python tools/exam_audit.py
"""
import json, os, re

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
ABSOLUTE = re.compile(r'\b(always|never|every|all|only|forever|indefinitely|entirely|guarantee[sd]?)\b', re.I)


def load():
    lines = open(os.path.join(ROOT, 'index.html'), encoding='utf8').read().split('\n')
    e = next(l for l in lines if l.startswith('const EX={'))
    v = open(os.path.join(ROOT, 'v10data.js'), encoding='utf8').read()
    return json.loads(e[e.index('{'):].rstrip(';')), json.loads(v[v.index('window.V10=') + 11:].rstrip().rstrip(';'))['mr']


def metrics(questions):
    shortest = longest = correct = correct_abs = wrong = wrong_abs = 0
    for q in questions:
        right = q['correct'] if isinstance(q['correct'], list) else [q['correct']]
        lengths = [len(o) for o in q['optionsEn']]
        shortest += min(lengths[i] for i in right) < min(n for i, n in enumerate(lengths) if i not in right)
        longest += max(lengths[i] for i in right) > max(n for i, n in enumerate(lengths) if i not in right)
        for i, option in enumerate(q['optionsEn']):
            hit = bool(ABSOLUTE.search(option))
            if i in right:
                correct += 1
                correct_abs += hit
            else:
                wrong += 1
                wrong_abs += hit
    return dict(n=len(questions), shortest=shortest, shortest_pct=100 * shortest / len(questions),
                longest=longest, longest_pct=100 * longest / len(questions),
                correct_abs=correct_abs, correct=correct, correct_pct=100 * correct_abs / correct,
                wrong_abs=wrong_abs, wrong=wrong, wrong_pct=100 * wrong_abs / wrong,
                gap=abs(100 * wrong_abs / wrong - 100 * correct_abs / correct))


def main():
    exams, mr = load()
    groups = [('Đề ' + k + ' (exam key)', exams[k]) for k in sorted(exams)]
    groups += [('240 exam questions', [q for k in exams for q in exams[k]]), ('23 multiple-response', mr)]
    for name, questions in groups:
        m = metrics(questions)
        print(f"{name}: shortest {m['shortest']}/{m['n']} ({m['shortest_pct']:.1f}%); longest {m['longest']}/{m['n']} ({m['longest_pct']:.1f}%); absolute correct "
              f"{m['correct_abs']}/{m['correct']} ({m['correct_pct']:.1f}%), wrong {m['wrong_abs']}/{m['wrong']} "
              f"({m['wrong_pct']:.1f}%), gap {m['gap']:.1f}")


if __name__ == '__main__':
    main()
