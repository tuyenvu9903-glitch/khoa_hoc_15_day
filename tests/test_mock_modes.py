import os,re,unittest
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd=lambda f:open(os.path.join(R,f),encoding='utf-8').read()
class MockModes(unittest.TestCase):
    def test_half_mock(self):
        js=rd('v10p3.js')
        m=re.search(r"M\.half=\{n:(\d+),per:(\d+),ms:(\d+)\*60000",js)
        self.assertTrue(m,'half mock config missing')
        n,per,mins=map(int,m.groups())
        self.assertEqual((n,per,n*per,mins),(2,15,30,60))
        self.assertIn('id="mockHalf"',js);self.assertIn("startMock('half')",js)
        self.assertRegex(rd('index.html'),r'src="v10p3\.js(\?v=[^"]*)?"')
    def test_full_and_scenario_modes(self):
        js=rd('v10.js');self.assertRegex(js,r"v10:\{n:4,per:15,ms:120\*60000");self.assertIn("startsWith('sc:')",js)
    def test_onepage_map_submit(self):
        h=rd('index.html')
        for k in ('id="qmSubmit"','function goQ','class="mq"'):self.assertIn(k,h)
        for k in ('id="mPrev"','id="mNext"','id="mSubmit"'):self.assertNotIn(k,h)
if __name__=='__main__':unittest.main()
