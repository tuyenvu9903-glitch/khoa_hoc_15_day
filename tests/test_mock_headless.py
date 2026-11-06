"""Real-browser check of the exam screen. CI sets CCARF_REQUIRE_HEADLESS=1 so a missing browser fails there."""
import os, shutil, subprocess, unittest

R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class MockHeadless(unittest.TestCase):
    def test_english_only_while_taking_exam(self):
        node = shutil.which('node')
        probe = subprocess.run([node or 'node', '-e', "require('playwright')"], cwd=R, capture_output=True) if node else None
        if not probe or probe.returncode != 0:
            if os.environ.get('CCARF_REQUIRE_HEADLESS'):
                self.fail('node + playwright are required but not available')
            self.skipTest('node + playwright not available')
        run = subprocess.run([node, os.path.join('tests', 'headless_mock.js')], cwd=R, capture_output=True, text=True, timeout=600)
        self.assertEqual(run.returncode, 0, run.stderr[-2000:])


if __name__ == '__main__':
    unittest.main()
