#!/usr/bin/env python3
"""Chèn mẹo "⚡ Nhìn đề → chọn ngay" (tools/quick_keys.py) vào trang 82 cặp trong index.html.

- Mỗi cặp: một dòng tóm tắt ngay dưới tiêu đề (thấy cả khi chưa mở) và một khối ⚡ ở đầu phần nội dung.
- Đầu trang: bảng tra nhanh 82 cặp + luật loại trừ dùng cho mọi câu.
- Chạy lại nhiều lần được: phần cũ nằm giữa các dấu <!--qk--> ... <!--/qk--> và bị thay thế.

  python3 tools/build_quick.py
"""
import html, os, re, sys

H = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.join(H, '..')
sys.path.insert(0, H)
from quick_keys import QK, GENERAL  # noqa: E402

P = os.path.join(ROOT, 'index.html')
e = html.escape
MAXC = 4  # số cụm từ hiển thị cho mỗi danh sách


def codes(v, n=MAXC):
    return ' · '.join('<code>' + e(x) + '</code>' for x in v[:n])


def rule_html(r, first):
    out = []
    if first:
        out.append('<p><b>👀 Đề có:</b> ' + codes(r['cue']) + '</p>')
    else:
        out.append('<p class="qk-alt"><b>↪ Nếu đề có:</b> ' + codes(r['cue']) + '</p>')
    out.append('<p><b>✅ Chọn đáp án có:</b> ' + codes(r['pick']) + '</p>')
    if r['avoid']:
        out.append('<p><b>❌ Loại đáp án có:</b> ' + codes(r['avoid']) + '</p>')
    out.append('<p class="qk-tip">💡 ' + e(r['tip']) + '</p>')
    return ''.join(out)


def block(k):
    r = QK[k]
    rs = [r] + list(r.get('alt', []))
    return ('<!--qk--><div class="nt-quick"><div class="qk-h">⚡ Nhìn đề → chọn ngay</div>'
            + ''.join(rule_html(x, i == 0) for i, x in enumerate(rs)) + '</div><!--/qk-->')


def line(k):
    r = QK[k]
    return ('<!--qk--><span class="qk-line">⚡ ' + e(r['cue'][0]) + ' → <b>' + e(r['pick'][0])
            + '</b></span><!--/qk-->')


def table():
    rows = []
    for k in sorted(QK):
        for i, r in enumerate([QK[k]] + list(QK[k].get('alt', []))):
            num = ('<a href="#np-%d" class="qk-jump" data-np="%d">%d</a>' % (k, k, k)) if i == 0 else '↪'
            rows.append('<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>'
                        % (num, codes(r['cue'], 3), codes(r['pick'], 3), codes(r['avoid'], 3)))
    gen = ''.join('<li><b>%s</b> → %s</li>' % (e(a), e(b)) for a, b in GENERAL)
    return ('<!--qk--><details class="nt-section qk-sheet" id="qkSheet"><summary><h2>⚡ Bảng tra nhanh: nhìn đề → chọn đáp án</h2>'
            '<span class="nt-muted">82 cặp · bấm để mở</span></summary>'
            '<p class="nt-muted">Đọc đề, tìm cụm ở cột <b>Đề có</b>, rồi chọn phương án chứa cụm ở cột <b>Chọn</b> và gạch các phương án '
            'chứa cụm ở cột <b>Loại</b>. Kiểm tra bằng <code>tools/check_quick.py</code> trên toàn bộ câu của trang này: mẹo khớp '
            'được mọi câu và chọn đúng ở tất cả các lần nó quyết định. Đây là mẹo nhận diện cho bộ đề tự soạn này; với đề thật, dùng nó để '
            'định hướng nhanh rồi vẫn đọc kỹ các phương án.</p>'
            '<h3>Luật loại trừ dùng cho mọi câu</h3><ul class="qk-gen">' + gen + '</ul>'
            '<div class="nt-table-wrap"><table class="qk-table"><thead><tr><th>#</th><th>👀 Đề có</th><th>✅ Chọn</th><th>❌ Loại</th></tr>'
            '</thead><tbody>' + ''.join(rows) + '</tbody></table></div></details><!--/qk-->')


CSS = ('<!--qk--><style>'
       '#notesView .nt-quick{background:var(--pale);border:1px solid var(--line);border-left:3px solid var(--blue);border-radius:9px;padding:8px 12px;margin:10px 0 12px}'
       '#notesView .nt-quick p{margin:4px 0}#notesView .qk-h{font-weight:750;color:var(--blue);margin-bottom:2px}'
       '#notesView .qk-alt{margin-top:10px!important;padding-top:8px;border-top:1px dashed var(--line)}'
       '#notesView .qk-tip{color:var(--ink);font-weight:600}'
       '#notesView .qk-line{display:block;margin-top:3px;font-size:13px;color:var(--muted);font-weight:500;overflow-wrap:anywhere}'
       '#notesView .qk-line b{color:var(--blue)}'
       '#notesView .qk-sheet summary{cursor:pointer;list-style:none;display:flex;align-items:baseline;gap:10px;flex-wrap:wrap}'
       '#notesView .qk-sheet summary::-webkit-details-marker{display:none}#notesView .qk-sheet summary h2{margin:0}'
       '#notesView .qk-sheet h3{font-size:16px;margin:14px 0 6px}#notesView .qk-gen{margin:0 0 12px;padding-left:20px}#notesView .qk-gen li{margin:4px 0}'
       '#notesView .qk-table td:first-child{white-space:nowrap;font-weight:700}'
       '</style><!--/qk-->')

JS = ('<!--qk--><script>(function(){var t=document.getElementById("qkSheet");if(!t)return;'
      't.addEventListener("click",function(ev){var a=ev.target.closest&&ev.target.closest(".qk-jump");if(!a)return;ev.preventDefault();'
      'var d=document.getElementById("np-"+a.dataset.np);if(!d)return;d.hidden=false;d.open=true;'
      'd.scrollIntoView({block:"center"});d.classList.add("nt-flash");setTimeout(function(){d.classList.remove("nt-flash")},1600)})})();'
      '</script><!--/qk-->')


def main():
    s = open(P, encoding='utf8').read()
    s = re.sub(r'<!--qk-->.*?<!--/qk-->', '', s, flags=re.S)
    n = 0
    for k in QK:
        a = s.index('id="np-%d"' % k)
        end = s.index('</details>', a)
        seg = s[a:end]
        seg2 = seg.replace('<span class="nt-solution">', '<span class="nt-solution">', 1)
        i = seg2.index('</span></span><span class="nt-chev">')
        seg2 = seg2[:i] + '</span>' + line(k) + seg2[i + len('</span>'):]
        seg2 = seg2.replace('<div class="nt-body">', '<div class="nt-body">' + block(k), 1)
        assert seg2 != seg
        s = s[:a] + seg2 + s[end:]
        n += 1
    anchor = '<div class="nt-toolbar no-print">'
    assert s.count(anchor) == 1
    s = s.replace(anchor, table() + anchor, 1)
    s = s.replace('</head>', CSS + '</head>', 1)
    i = s.rindex('</body>')
    s = s[:i] + JS + s[i:]
    open(P, 'w', encoding='utf8').write(s)
    print('quick keys inserted into', n, 'pairs')


if __name__ == '__main__':
    main()
