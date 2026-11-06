"""Data checks for the four fixed mock exams (EX in index.html) and the multiple-response bank (tools/mr.py data)."""
import json, os, re, unittest

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def load():
    lines = open(os.path.join(R, 'index.html'), encoding='utf8').read().split('\n')
    q = next(l for l in lines if l.startswith('<script>const Q=['))
    e = next(l for l in lines if l.startswith('const EX={'))
    v = open(os.path.join(R, 'v10data.js'), encoding='utf8').read()
    return (json.loads(q[len('<script>const Q='):].rstrip(';')),
            json.loads(e[e.index('{'):].rstrip(';')),
            json.loads(v[v.index('window.V10=') + len('window.V10='):].rstrip().rstrip(';')))


def marked(text, phrases):
    """Distinct highlight phrases that hlKw() would mark in text (same boundaries and case-insensitivity)."""
    found = set()
    for p in phrases:
        if re.search(r'(?<![A-Za-z0-9_À-ỹ])' + re.escape(p) + r'(?![A-Za-z0-9_À-ỹ])', text, re.I):
            found.add(p.lower())
    return found


GENERIC = {'best', 'most', 'first', 'only', 'always', 'never', 'least', 'main', 'primary', 'monolith', 'redis',
           'tốt nhất', 'chính', 'đầu tiên', 'luôn', 'chỉ', 'không bao giờ'}


class ExamData(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.Q, cls.EX, cls.V = load()
        cls.ALL = [q for k in sorted(cls.EX) for q in cls.EX[k]]

    def test_each_exam_keeps_its_shape(self):
        for k, qs in self.EX.items():
            self.assertEqual(len(qs), 60, k)
            domains = {d: sum(q['domain'] == d for q in qs) for d in ('D1', 'D2', 'D3', 'D4', 'D5')}
            self.assertEqual(domains, {'D1': 16, 'D2': 11, 'D3': 12, 'D4': 12, 'D5': 9}, k)
            letters = [sum(q['correct'] == i for q in qs) for i in range(4)]
            self.assertEqual(letters, [15, 15, 15, 15], k)

    def test_highlights_are_one_or_two_decisive_phrases_in_the_stem(self):
        for q in self.ALL:
            hl = q['hl']
            en, vi = marked(q['qEn'], hl), marked(q['qVi'], hl)
            self.assertTrue(1 <= len(en) <= 2, (q['id'], 'en', hl))
            self.assertTrue(1 <= len(vi) <= 2, (q['id'], 'vi', hl))
            self.assertFalse({p.lower() for p in hl} & GENERIC, (q['id'], hl))


if __name__ == '__main__':
    unittest.main()
