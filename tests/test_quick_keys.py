"""Mẹo "Nhìn đề → chọn ngay" phải đúng trên toàn bộ ngân hàng câu hỏi và đã được chèn vào trang."""
import os, sys, unittest

R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
sys.path.insert(0, os.path.join(R, 'tools'))
import check_quick as cq  # noqa: E402


class QuickKeys(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.allq, _ = cq.load()

    def test_every_pair_has_keys(self):
        self.assertEqual(sorted(cq.QK), list(range(1, 86)))
        for k, r in cq.QK.items():
            for rule in cq.rules(k):
                self.assertTrue(rule['cue'] and rule['pick'] and rule['tip'], k)

    def test_never_picks_a_wrong_option(self):
        bad = []
        for k in cq.QK:
            for rule in cq.rules(k):
                for q in self.allq:
                    if cq.has(q['qEn'], rule['cue']) and cq.judge(q, rule)[0] == 'wrong':
                        bad.append((k, q['id']))
        self.assertEqual(bad, [])

    def test_every_question_has_a_cue(self):
        covered = {q['id'] for q in self.allq for k in cq.QK for r in cq.rules(k) if cq.has(q['qEn'], r['cue'])}
        self.assertEqual(sorted(q['id'] for q in self.allq if q['id'] not in covered), [])

    def test_inserted_into_page(self):
        with open(os.path.join(R, 'index.html'), encoding='utf8') as f:
            h = f.read()
        self.assertEqual(h.count('class="nt-quick"'), 85)
        self.assertEqual(h.count('id="qkSheet"'), 1)


if __name__ == '__main__':
    unittest.main()
