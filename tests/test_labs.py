"""Test tự động cho code mẫu 15 lab (labs.js), lab tích hợp và dữ liệu đề.
Chạy: python -m unittest discover -s tests   (cần node để đọc labs.js)"""
import json, os, re, subprocess, sys, tempfile, unittest, importlib
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FAKES = os.path.join(ROOT, "tests", "fakes")
sys.path[:0] = [FAKES, os.path.join(ROOT, "labs", "integrated")]
import anthropic  # fake

LABS = json.loads(subprocess.check_output(["node", os.path.join(ROOT, "tests", "dump_labs.js")]))
PY_LABS = ["1", "2", "4", "5", "6", "9", "10", "12", "14", "15"]

def sections(code):
    """Tách các phần '// file' / '# file' trong một lab nhiều file."""
    parts = re.split(r"\n(?=// )", "\n" + code)
    return [p.strip("\n") for p in parts if p.strip()]

def run_py(code, extra=None):
    g = {"__name__": "lab"}
    g.update(extra or {})
    exec(compile(code, "<lab>", "exec"), g)
    return g

class TestLabs(unittest.TestCase):
    def test_all_15_present(self):
        self.assertEqual(sorted(LABS, key=int), [str(i) for i in range(1, 16)])
        for k, L in LABS.items():
            for f in "tdgsck":
                self.assertTrue(L.get(f), f"lab {k} thiếu {f}")
            self.assertIn(L["d"], ["D1", "D2", "D3", "D4", "D5"])

    def test_inline_copy_matches_labs_js(self):
        html = open(os.path.join(ROOT, "index.html"), encoding="utf8").read()
        for k, L in LABS.items():
            body = L["c"].replace("\\", "\\\\").replace("`", "\\`")
            self.assertIn(body[:200], html, f"lab {k}: bản inline trong index.html lệch labs.js")

    def test_python_labs_compile(self):
        for k in PY_LABS:
            with self.subTest(lab=k):
                compile(LABS[k]["c"], f"lab{k}", "exec")

    def test_lab02_tool_schema_and_errors(self):
        g = run_py(LABS["2"]["c"])
        names = [t["name"] for t in g["tools"]]
        self.assertEqual(names, ["get_order", "find_customer"])
        self.assertEqual(g["run"]("get_order", {"order_id": "A-12"}), {"content": "đang giao, dự kiến 01/11"})
        r = g["run"]("get_order", {"order_id": "A-999"})
        self.assertTrue(r["is_error"]); self.assertEqual(json.loads(r["content"])["error"], "NOT_FOUND")

    def test_lab05_case_facts(self):
        g = run_py(LABS["5"]["c"])
        g["update_facts"]("Hoàn 250k cho đơn A-12")
        self.assertEqual((g["facts"]["order_id"], g["facts"]["amount"]), ("A-12", 250000))
        p = g["build_prompt"]([{"role": "user", "content": str(i)} for i in range(10)])
        self.assertEqual(len(p), 7); self.assertIn("<case_facts>", p[0]["content"])

    def test_lab06_subagent_gets_explicit_context(self):
        c = anthropic.Anthropic(); anthropic.SCRIPT[:] = [anthropic.response([anthropic.text("ok")])]
        g = run_py(LABS["6"]["c"], {"c": c, "MODEL": "m"})
        self.assertEqual(g["subagent"]("critic", "T", "CTX"), "ok")
        self.assertIn("<context>CTX</context>", anthropic.CALLS[-1]["messages"][0]["content"])
        self.assertEqual(g["tools"][0]["input_schema"]["required"], ["role", "task", "context"])

    def test_lab07_mcp_server_and_config(self):
        parts = sections(LABS["7"]["c"])
        g = run_py(parts[0])
        self.assertEqual(set(g["mcp"].tools), {"add_note", "list_notes"})
        self.assertIn("notes://all", g["mcp"].resources)
        g["add_note"]("a"); self.assertEqual(g["list_notes"](), ["a"])
        cfg = json.loads(parts[1].split("\n", 1)[1])
        self.assertIn("${NOTES_KEY}", cfg["mcpServers"]["notes"]["env"]["API_KEY"])  # không hardcode secret

    def test_lab08_bash_syntax(self):
        with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as f:
            f.write(LABS["8"]["c"])
        subprocess.run(["bash", "-n", f.name], check=True)

    def test_lab10_validate_retry_escalate(self):
        g = run_py(LABS["10"]["c"])
        self.assertEqual(g["validate"]({"phone": "0901234567"}), [])
        self.assertTrue(g["validate"]({"phone": "12345"}))
        bad = lambda: anthropic.response([anthropic.tool_use("extract", {"phone": "123"})])
        good = lambda: anthropic.response([anthropic.tool_use("extract", {"phone": "0901234567"})])
        seq = [bad(), good()]; g["call"] = lambda msgs: seq.pop(0)
        self.assertEqual(g["extract_with_retry"]("mail"), {"phone": "0901234567"})
        g["call"] = lambda msgs: bad()
        self.assertEqual(g["extract_with_retry"]("mail")["status"], "ESCALATE_HUMAN")

    def test_lab11_hook_exit_codes(self):
        parts = sections(LABS["11"]["c"])
        cfg = json.loads(parts[0].split("\n", 1)[1].split("\n\n")[0])
        self.assertEqual(cfg["hooks"]["PreToolUse"][0]["matcher"], "Bash")
        guard = LABS["11"]["c"].split("# hooks/guard.py", 1)[1]
        with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False) as f:
            f.write(guard)
        def rc(cmd):
            return subprocess.run([sys.executable, f.name], input=json.dumps({"tool_input": {"command": cmd}}),
                                  text=True, capture_output=True).returncode
        self.assertEqual(rc("ls -la"), 0)
        self.assertEqual(rc("rm -rf /"), 2)
        self.assertEqual(rc("psql -c 'drop table users'"), 2)

    def test_lab12_tool_scoping(self):
        g = run_py(LABS["12"]["c"])
        self.assertEqual(len(g["ALL"]), 15)
        self.assertEqual(sorted(t["name"] for t in g["BILLING"]), ["find_customer", "get_invoice", "get_order", "refund"])
        self.assertEqual(len(g["CASES"]), 10)
        self.assertTrue(all(exp in {t["name"] for t in g["BILLING"]} for _, exp in g["CASES"]))

    def test_lab15_refund_limit_in_code(self):
        seen = []
        g = run_py(LABS["15"]["c"], {"run_agent": lambda sc: seen.append(sc) or "ok"})
        self.assertEqual(len(seen), 5)
        self.assertTrue(g["refund"]("A-12", 2_000_000)["is_error"])
        self.assertNotIn("is_error", g["refund"]("A-12", 250_000))

    def test_markdown_labs(self):
        self.assertIn("CLAUDE.md", LABS["3"]["c"]); self.assertIn("Plan mode", LABS["13"]["c"])

class TestIntegratedLab(unittest.TestCase):
    def test_core_rules(self):
        from orders_core import Session
        s = Session()
        self.assertEqual(s.refund("812", 1)["errorCategory"], "prerequisite")
        s.find_customer("a@b.vn")
        self.assertEqual(s.refund("90", 1)["errorCategory"], "permission")
        self.assertEqual(s.refund("812", 999_999)["errorCategory"], "validation")
        self.assertEqual(s.refund("812", 100_000), {"refunded": 100_000, "order_id": "812"})

    def test_step1_loop_until_end_turn(self):
        import step1_api_loop as st
        anthropic.SCRIPT[:] = [anthropic.response([anthropic.tool_use("find_customer", {"key": "a@b.vn"}, "t1")]),
                               anthropic.response([anthropic.tool_use("refund", {"order_id": "812", "amount": 100000}, "t2")]),
                               anthropic.response([anthropic.text("Đã hoàn 100000đ")])]
        out, msgs = st.run("hoàn tiền", client=anthropic.Anthropic())
        self.assertEqual(out, "Đã hoàn 100000đ")
        last_result = msgs[-2]["content"][0]
        self.assertEqual(last_result["tool_use_id"], "t2"); self.assertFalse(last_result["is_error"])

    def test_step1_error_flag(self):
        import step1_api_loop as st
        anthropic.SCRIPT[:] = [anthropic.response([anthropic.tool_use("refund", {"order_id": "812", "amount": 1})]),
                               anthropic.response([anthropic.text("Cần xác minh")])]
        _, msgs = st.run("x", client=anthropic.Anthropic())
        self.assertTrue(msgs[2]["content"][0]["is_error"])

    def test_step2_mcp(self):
        st = importlib.import_module("step2_mcp_server")
        self.assertEqual(set(st.mcp.tools), {"find_customer", "get_order", "refund"})
        self.assertIn("500000", st.mcp.resources["policy://refund"]())

    def test_step3_multi_agent(self):
        from step3_multi_agent import coordinator
        self.assertEqual(coordinator({"customer_key": "a@b.vn", "order_id": "812", "amount": 100_000})["status"], "done")
        r = coordinator({"customer_key": "0901234567", "order_id": "90", "amount": 900_000})
        self.assertEqual(r["status"], "escalated"); self.assertTrue(r["results"]["policy"]["ok"])
        r = coordinator({"customer_key": "x@y.z", "order_id": "812", "amount": 1})
        self.assertEqual(r["status"], "partial"); self.assertEqual(r["gaps"][0]["errorCategory"], "not_found")

class TestQuestionData(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        js = open(os.path.join(ROOT, "v10data.js"), encoding="utf8").read()
        cls.V = json.loads(js[js.index("{"):js.rindex("}") + 1])

    def test_mr_every_domain_and_valid(self):
        mr = self.V["mr"]
        self.assertEqual({q["domain"] for q in mr}, {"D1", "D2", "D3", "D4", "D5"})
        for q in mr:
            self.assertIsInstance(q["correct"], list); self.assertGreaterEqual(len(q["correct"]), 2)
            self.assertEqual(len(q["optionsEn"]), len(q["optionsVi"])); self.assertEqual(len(q["whyEn"]), len(q["optionsEn"]))
            self.assertIn(f"Choose {len(q['correct'])}", q["qEn"])

    def test_six_scenarios(self):
        sc = self.V["sc"]; self.assertEqual(len(sc), 6)
        for S in sc:
            for f in ("ctxEn", "ctxVi", "arch", "req", "cons"):
                self.assertTrue(S[f])
        counts = {}
        for sid in self.V["tag"].values():
            counts[sid] = counts.get(sid, 0) + 1
        for S in sc:
            self.assertGreaterEqual(counts.get(S["id"], 0), 15, S["id"])

if __name__ == "__main__":
    unittest.main()
