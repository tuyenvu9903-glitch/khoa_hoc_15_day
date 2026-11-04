#!/usr/bin/env python3
"""Đo độ chính xác của mẹo "Nhìn đề → chọn ngay" (tools/quick_keys.py) trên toàn bộ câu hỏi.

Với mỗi cặp: lấy các câu có đề chứa một cụm `cue`; trong các phương án, giữ những phương án
chứa một cụm `pick` và không chứa cụm `avoid`. Nếu còn đúng một phương án → coi là mẹo "chọn được",
rồi so với đáp án đúng.

  python3 tools/check_quick.py            # tóm tắt
  python3 tools/check_quick.py -v         # in cả các câu mẹo chọn sai / không chọn được
  python3 tools/check_quick.py --strict   # exit 1 nếu có cặp nào chọn sai
"""
import json, os, re, sys

H = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(H, '..')
sys.path.insert(0, H)
from quick_keys import QK  # noqa: E402


def load():
    L = open(os.path.join(ROOT, 'index.html'), encoding='utf8').read().split('\n')
    qi = [i for i, l in enumerate(L) if l.startswith('<script>const Q=[')][0]
    ei = [i for i, l in enumerate(L) if l.startswith('const EX={')][0]
    Q = json.loads(L[qi][len('<script>const Q='):].rstrip(';'))
    EX = json.loads(L[ei][L[ei].index('{'):].rstrip(';'))
    v = open(os.path.join(ROOT, 'v10data.js'), encoding='utf8').read()
    V = json.loads(v[v.index('window.V10=') + len('window.V10='):].rstrip().rstrip(';'))
    html = '\n'.join(L)
    rel = {}
    for m in re.finditer(r'id="np-(\d+)".*?</details>', html, re.S):
        rel[int(m.group(1))] = [int(x) for x in re.findall(r'data-jump="(\d+)"', m.group(0))]
    return Q + [q for x in EX.values() for q in x] + V['mr'], rel


def has(text, phrases):
    t = text.lower()
    return any(p.lower() in t for p in phrases)


def rules(k):
    """Luật chính của cặp k, rồi các luật phụ trong `alt` (mỗi luật có cue/pick/avoid riêng)."""
    return [QK[k]] + list(QK[k].get('alt', []))


def judge(q, r):
    """'right' | 'wrong' | 'none' (mẹo không quyết được) cho luật r trên câu q."""
    cand = [i for i, o in enumerate(q['optionsEn']) if has(o, r['pick']) and not has(o, r['avoid'])]
    corr = q['correct'] if isinstance(q['correct'], list) else [q['correct']]
    if q.get('multi'):
        if not cand:
            return 'none', cand
        return ('right' if set(cand) <= set(corr) else 'wrong'), cand
    if len(cand) != 1:
        return 'none', cand
    return ('right' if cand[0] in corr else 'wrong'), cand


def main():
    verbose = '-v' in sys.argv
    allq, rel = load()
    byid = {q['id']: q for q in allq}
    tot = dict(right=0, wrong=0, none=0)
    bad = []
    rows = []
    for k in sorted(QK):
        cues = [c for r in rules(k) for c in r['cue']]
        hit = [q for q in allq if has(q['qEn'], cues)]
        res = {'right': 0, 'wrong': 0, 'none': 0}
        for rule in rules(k):
            for q in allq:
                if not has(q['qEn'], rule['cue']):
                    continue
                r, cand = judge(q, rule)
                res[r] += 1
                tot[r] += 1
                if r != 'right':
                    bad.append((k, r, q, cand))
        relq = [byid[i] for i in rel.get(k, []) if i in byid]
        cov = sum(1 for q in relq if has(q['qEn'], cues))
        rows.append((k, len(hit), res['right'], res['wrong'], res['none'], cov, len(relq)))
    print('cặp  đề-khớp  chọn-đúng  chọn-sai  không-quyết  phủ-câu-liên-quan')
    for k, n, r, w, nn, cov, nr in rows:
        flag = '  <-- sai' if w else ''
        print(f'{k:>3}  {n:>7}  {r:>9}  {w:>8}  {nn:>11}  {cov}/{nr}{flag}')
    decided = tot['right'] + tot['wrong']
    print(f"\nTổng: {decided} lần mẹo quyết định, đúng {tot['right']} ({100*tot['right']/max(1,decided):.1f}%), "
          f"sai {tot['wrong']}; {tot['none']} lần không quyết được (phải đọc thêm).")
    covered = len({q['id'] for q in allq for k in QK for r in rules(k) if has(q['qEn'], r['cue'])})
    print(f'Số câu có ít nhất một mẹo khớp đề: {covered}/{len(allq)}')
    if verbose:
        for k, r, q, cand in bad:
            if r == 'wrong' or '-vv' in sys.argv:
                corr = q['correct'] if isinstance(q['correct'], list) else [q['correct']]
                print(f"\n[{r}] cặp {k} · #{q['id']}: {q['qEn'][:150]}")
                for i, o in enumerate(q['optionsEn']):
                    print(f"   {'*' if i in corr else ' '}{'>' if i in cand else ' '} {o[:150]}")
    if '--strict' in sys.argv and tot['wrong']:
        sys.exit(1)


if __name__ == '__main__':
    main()
