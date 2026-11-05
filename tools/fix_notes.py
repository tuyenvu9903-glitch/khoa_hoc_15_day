#!/usr/bin/env python3
"""Rút gọn thẻ 82 cặp (chỉ giữ ⚡ quick + 🎯 Góc thi + Câu luyện liên quan) và sinh lại
"Câu luyện liên quan" theo nội dung câu hỏi.

Câu liên quan của thẻ k = các câu trong ngân hàng luyện (Q + V10.mr, mở được bằng nt-jump)
có đề khớp `cue` của thẻ (tools/quick_keys.py) VÀ mẹo `pick` chọn đúng đáp án → câu đó thật sự
hỏi đúng chủ đề thẻ. Nếu thẻ có < 2 câu như vậy, bổ sung tối đa 2 câu cùng task statement mà
đáp án đúng chứa cụm `pick`. MANUAL ghi đè các thẻ không có cue khớp. Chạy lại được nhiều lần.
"""
import json, os, re, sys
H = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(H, '..'); sys.path.insert(0, H)
import check_quick as C
from quick_keys import QK
MANUAL = {19: [1022, 1012], 64: [2064, 7502], 66: [], 67: []}
P = os.path.join(ROOT, 'index.html'); h = open(P, encoding='utf8').read()
Q = json.loads(re.search(r'<script>const Q=(\[.*?\]);', h, re.S).group(1))
v = open(os.path.join(ROOT, 'v10data.js'), encoding='utf8').read()
V = json.loads(v[v.index('window.V10=') + 11:].rstrip().rstrip(';'))
jump = Q + V['mr']
ts = {int(n): t for n, t in re.findall(r'id="np-(\d+)" data-domain="\w+" data-ts="([\d.]+)"', h)}

def related(k):
    if k in MANUAL: return MANUAL[k]
    strong = []
    for q in jump:
        for r in C.rules(k):
            if C.has(q['qEn'], r['cue']):
                if C.judge(q, r)[0] == 'right': strong.append(q['id'])
                break
    if len(strong) >= 2: return strong[:6]
    fb = []
    for q in jump:
        if q.get('ts') != ts[k] or q['id'] in strong: continue
        corr = q['correct'] if isinstance(q['correct'], list) else [q['correct']]
        if any(C.has(q['optionsEn'][i], r['pick']) for r in C.rules(k) for i in corr): fb.append(q['id'])
    return strong + fb[:2]

def card(m):
    k, s = int(m.group(1)), m.group(0)
    s = re.sub(r'<p><b>✅ Giải pháp:</b>.*?</p>\n?', '', s, flags=re.S)
    s = re.sub(r'<div class="nt-example">(?:<pre>.*?</pre>|(?!</div>|<pre>).)*</div>\n?', '', s, flags=re.S)
    s = re.sub(r'<div class="nt-trap">.*?</div>\n?', '', s, flags=re.S)
    s = re.sub(r'<p class="nt-keywords">.*?</p>', '', s, flags=re.S)
    ids = related(k)
    rel = ('<p class="nt-rel"><b>Câu luyện liên quan:</b> ' + ' '.join(
        f'<a href="#" class="nt-jump" data-jump="{i}">#{i}</a>' for i in ids) + '</p>') if ids else ''
    s = re.sub(r'<p class="nt-rel">.*?</p>', rel, s, flags=re.S)
    return s
h2, n = re.subn(r'<details class="nt-item" id="np-(\d+)".*?</details>', card, h, flags=re.S)
open(P, 'w', encoding='utf8').write(h2); print('cards', n)
