const LABS={
1:{t:"Agent loop tối giản (stop_reason)",d:"D1",g:"Hiểu vòng lặp agentic: gọi model → nếu stop_reason=='tool_use' thì chạy tool, gửi tool_result → lặp đến 'end_turn'.",s:["pip install anthropic; export ANTHROPIC_API_KEY=...","Tạo file day01_loop.py với code bên dưới","Chạy: python day01_loop.py \"Tính (17*23)+5 rồi nhân 2\"","Đếm số vòng lặp in ra; thử bỏ tool_result xem lỗi gì"],c:`import sys, anthropic
c = anthropic.Anthropic(); MODEL = "claude-sonnet-4-5"
tools = [{"name":"calc","description":"Tính biểu thức số học. Dùng cho MỌI phép tính.",
  "input_schema":{"type":"object","properties":{"expr":{"type":"string"}},"required":["expr"]}}]
msgs = [{"role":"user","content":sys.argv[1]}]
for turn in range(10):                      # giới hạn vòng để tránh lặp vô hạn
    r = c.messages.create(model=MODEL, max_tokens=512, tools=tools, messages=msgs)
    print(f"[vòng {turn}] stop_reason={r.stop_reason}")
    msgs.append({"role":"assistant","content":r.content})
    if r.stop_reason != "tool_use": break
    results = []
    for b in r.content:
        if b.type == "tool_use":
            out = str(eval(b.input["expr"], {"__builtins__": {}}))
            print("  tool", b.input, "->", out)
            results.append({"type":"tool_result","tool_use_id":b.id,"content":out})
    msgs.append({"role":"user","content":results})
print(r.content[0].text)`,e:"[vòng 0] stop_reason=tool_use\n  tool {'expr': '(17*23)+5'} -> 396\n[vòng 1] stop_reason=tool_use\n  tool {'expr': '396*2'} -> 792\n[vòng 2] stop_reason=end_turn\nKết quả là 792.",k:["Loop dừng theo stop_reason, KHÔNG theo việc text có chữ 'xong'","Có giới hạn số vòng (max turns)","Giải thích được vì sao tool_result phải nằm trong message role=user"]},
2:{t:"Thiết kế tool tốt: description + error có cấu trúc",d:"D2",g:"Description rõ ràng quyết định model chọn đúng tool; lỗi trả về phải có isError + gợi ý để model tự sửa.",s:["Copy loop ngày 1, thay tools bằng 2 tool dưới","Hỏi: 'Đơn hàng A-12 đang ở đâu?' rồi 'Đơn hàng 999?'","Quan sát model nhận lỗi is_error và hỏi lại / báo người dùng"],c:`tools = [
 {"name":"get_order","description":"Tra trạng thái MỘT đơn hàng theo mã dạng 'A-<số>'. KHÔNG dùng để tìm khách hàng.",
  "input_schema":{"type":"object","properties":{"order_id":{"type":"string","pattern":"^A-\\\\d+$"}},"required":["order_id"]}},
 {"name":"find_customer","description":"Tìm khách hàng theo email. Trả về customer_id.",
  "input_schema":{"type":"object","properties":{"email":{"type":"string"}},"required":["email"]}}]
DB = {"A-12": "đang giao, dự kiến 01/11"}
def run(name, inp):
    if name == "get_order":
        if inp["order_id"] not in DB:
            return {"content": '{"error":"NOT_FOUND","retryable":false,"hint":"Hỏi lại mã đơn dạng A-<số>"}', "is_error": True}
        return {"content": DB[inp["order_id"]]}
    return {"content": '{"error":"NOT_IMPLEMENTED"}', "is_error": True}
# trong loop: res = run(b.name, b.input); results.append({"type":"tool_result","tool_use_id":b.id, **res})`,e:"Câu 1 → gọi get_order(A-12) → 'đang giao, dự kiến 01/11'\nCâu 2 → tool_result is_error=true NOT_FOUND → model hỏi lại mã đơn đúng định dạng, không bịa trạng thái",k:["Mỗi tool có description nói rõ KHI NÀO dùng và KHI NÀO không","Lỗi có mã lỗi, retryable, hint","Model không bịa dữ liệu khi tool lỗi"]},
3:{t:"Cấu hình Claude Code cho 1 repo: CLAUDE.md + slash command",d:"D3",g:"Hiểu thứ bậc CLAUDE.md (user/project/thư mục) và custom command trong .claude/commands.",s:["mkdir day03 && cd day03 && git init","Tạo CLAUDE.md và .claude/commands/review.md như dưới","Mở claude, gõ /memory để xem file nào được nạp","Gõ /review src/app.py (tạo file app.py bất kỳ có bug)"],c:`# CLAUDE.md (project, commit vào git)
- Ngôn ngữ: Python 3.11, test bằng pytest
- Luôn chạy \`pytest -q\` trước khi báo xong
- Không sửa file trong /vendor

# .claude/commands/review.md
Review file $ARGUMENTS theo checklist:
1. Bug logic  2. Thiếu test  3. Vi phạm quy tắc trong CLAUDE.md
Trả lời dạng bảng: | dòng | vấn đề | mức độ | đề xuất |`,e:"/memory liệt kê ./CLAUDE.md\n/review src/app.py → bảng 4 cột, có nhắc chạy pytest",k:["Phân biệt ~/.claude/CLAUDE.md (cá nhân) vs ./CLAUDE.md (team, commit)","Command dùng $ARGUMENTS chạy được","Biết khi nào dùng .claude/rules/ hoặc CLAUDE.md thư mục con"]},
4:{t:"Structured output bằng tool_choice + JSON schema",d:"D4",g:"Ép model trả JSON đúng schema bằng tool_use bắt buộc thay vì 'hãy trả JSON'.",s:["Tạo day04_extract.py","Cho 3 email mẫu (1 thiếu số điện thoại)","Kiểm tra field thiếu là null chứ không bịa"],c:`import anthropic, json
c = anthropic.Anthropic()
schema = {"type":"object","properties":{
  "name":{"type":"string"},"phone":{"type":["string","null"]},
  "intent":{"type":"string","enum":["mua","khiếu_nại","hỏi_thông_tin","khác"]}},
  "required":["name","phone","intent"]}
tool = {"name":"save_lead","description":"Lưu thông tin trích xuất","input_schema":schema}
for mail in ["Tôi là Lan, sđt 0901234567, muốn mua gói Pro",
             "Anh Minh đây, hàng giao trễ 3 ngày rồi!",
             "Cho hỏi giờ mở cửa?"]:
    r = c.messages.create(model="claude-sonnet-4-5", max_tokens=300, tools=[tool],
        tool_choice={"type":"tool","name":"save_lead"},
        messages=[{"role":"user","content":"Trích xuất. Không có thì để null:\\n"+mail}])
    print(json.dumps(r.content[0].input, ensure_ascii=False))`,e:'{"name": "Lan", "phone": "0901234567", "intent": "mua"}\n{"name": "Minh", "phone": null, "intent": "khiếu_nại"}\n{"name": null?, ...}  → nếu schema bắt string mà không có tên, sửa thành ["string","null"]',k:["Dùng tool_choice ép tool, không parse text","Field tuỳ chọn là nullable → giảm bịa (hallucination)","enum giới hạn giá trị intent"]},
5:{t:"Quản lý context: tóm tắt 'case facts' bền vững",d:"D5",g:"Hội thoại dài làm mất chi tiết; giữ khối facts có cấu trúc tách khỏi lịch sử và đặt đầu prompt.",s:["Tạo day05_facts.py","Mô phỏng 30 lượt chat, sau mỗi 10 lượt cắt lịch sử","Hỏi lại số tiền/mã đơn ở lượt 30 → vẫn đúng nhờ facts"],c:`facts = {"customer_id": None, "order_id": None, "amount": None, "promises": []}
def update_facts(turn_text):
    # Ngày 5: làm bằng regex; nâng cao: gọi Claude với tool_choice trả về facts
    import re
    if m := re.search(r"A-\\d+", turn_text): facts["order_id"] = m.group()
    if m := re.search(r"(\\d+)\\s?k", turn_text): facts["amount"] = int(m.group(1))*1000
def build_prompt(recent_msgs):
    return [{"role":"user","content":f"<case_facts>{facts}</case_facts>\\n(Chỉ tin facts này cho số liệu)"}] + recent_msgs[-6:]
# vòng lặp: update_facts(user_msg); msgs = build_prompt(history); gọi API`,e:"Lượt 30 hỏi 'đơn nào, bao nhiêu tiền?' → 'A-12, 250000đ' dù lịch sử đã bị cắt",k:["Facts tách khỏi transcript và luôn nằm đầu context","Lịch sử bị cắt nhưng số liệu không mất","Giải thích 'lost in the middle'"]},
6:{t:"Coordinator → 2 subagent (hub-and-spoke)",d:"D1",g:"Coordinator chia việc, truyền ĐỦ context cho subagent (subagent không thấy lịch sử của coordinator), rồi tổng hợp.",s:["Tạo day06_multi.py","Coordinator nhận chủ đề, gọi subagent 'research' và 'critic' qua tool spawn_subagent","In ra prompt gửi từng subagent để kiểm tra context đã đủ chưa"],c:`def subagent(role, task, context):
    r = c.messages.create(model=MODEL, max_tokens=600,
        system=f"Bạn là {role}. Chỉ dựa trên context được cung cấp.",
        messages=[{"role":"user","content":f"<context>{context}</context>\\n<task>{task}</task>"}])
    return r.content[0].text
tools=[{"name":"spawn_subagent","description":"Giao việc cho subagent. PHẢI đưa đầy đủ context vì subagent không thấy hội thoại này.",
 "input_schema":{"type":"object","properties":{"role":{"type":"string","enum":["research","critic"]},
 "task":{"type":"string"},"context":{"type":"string"}},"required":["role","task","context"]}}]
# dùng loop ngày 1: khi tool spawn_subagent -> print(b.input); out = subagent(**b.input)`,e:"[spawn research] context=... task=Liệt kê 3 rủi ro\n[spawn critic] context=<kết quả research> ...\nCoordinator: báo cáo tổng hợp có trích nguồn từ 2 subagent",k:["Context được truyền tường minh trong input","Có thể chạy 2 subagent song song khi độc lập","Coordinator là nơi duy nhất tổng hợp kết quả"]},
7:{t:"MCP server đầu tiên (Python FastMCP)",d:"D2",g:"Đóng gói tool thành MCP server và gắn vào Claude Code qua .mcp.json.",s:["pip install mcp","Tạo server.py","Tạo .mcp.json ở thư mục project","Mở claude → /mcp thấy server 'notes' connected → nhờ 'lưu ghi chú học MCP'"],c:`# server.py
from mcp.server.fastmcp import FastMCP
mcp = FastMCP("notes"); NOTES = []
@mcp.tool()
def add_note(text: str) -> str:
    """Lưu một ghi chú học tập. Dùng khi user muốn ghi nhớ điều gì."""
    NOTES.append(text); return f"Đã lưu ({len(NOTES)} ghi chú)"
@mcp.tool()
def list_notes() -> list[str]:
    """Liệt kê tất cả ghi chú đã lưu."""
    return NOTES
@mcp.resource("notes://all")
def all_notes() -> str: return "\\n".join(NOTES)
if __name__ == "__main__": mcp.run()

// .mcp.json
{"mcpServers":{"notes":{"command":"python","args":["server.py"],"env":{"API_KEY":"\${NOTES_KEY}"}}}}`,e:"/mcp → notes ✔ connected (2 tools)\n'lưu ghi chú học MCP' → gọi add_note → 'Đã lưu (1 ghi chú)'",k:["Biết khác nhau tool vs resource","Secret đi qua biến môi trường \${VAR}, không hard-code trong .mcp.json","Project-scope (.mcp.json) vs user-scope (~/.claude.json)"]},
8:{t:"Claude Code headless trong CI",d:"D3",g:"Chạy Claude Code không tương tác (-p) với output JSON để tích hợp pipeline.",s:["Trong repo ngày 3, chạy lệnh dưới","Lưu thành script ci_review.sh","Thêm vào GitHub Actions (tuỳ chọn)"],c:`#!/usr/bin/env bash
git diff origin/main...HEAD > /tmp/diff.txt
claude -p "Review diff này, chỉ báo lỗi mức HIGH. Trả JSON {issues:[{file,line,msg}]}" \\
  --output-format json --allowedTools "Read" < /tmp/diff.txt > review.json
jq '.result' review.json
# fail CI nếu có issue
jq -e '.result | fromjson | .issues | length == 0' review.json`,e:'{"issues":[{"file":"src/app.py","line":12,"msg":"chia cho 0"}]}\nexit code 1 khi có issue',k:["Dùng -p (print mode), không cần TTY","Giới hạn quyền bằng --allowedTools","Output parse được bằng jq"]},
9:{t:"Few-shot + rubric eval nhỏ",d:"D4",g:"Đo tác động của few-shot bằng con số, không cảm tính.",s:["Tạo 10 câu phân loại ticket có nhãn đúng (dataset.json)","Chạy prompt v1 (zero-shot) và v2 (3 ví dụ khó)","So sánh accuracy"],c:`import json
data = json.load(open("dataset.json"))   # [{"text":..., "label":...}]
FEW = """<examples>
<ex><t>App sập khi thanh toán</t><l>bug</l></ex>
<ex><t>Cho tôi xuất hóa đơn VAT</t><l>billing</l></ex>
<ex><t>Thanh toán bị trừ 2 lần, app báo lỗi</t><l>billing</l></ex>  <!-- ca mơ hồ -->
</examples>"""
def classify(text, few):
    p = (FEW if few else "") + f"\\nPhân loại vào bug|billing|feature. Chỉ trả nhãn.\\n<t>{text}</t>"
    return c.messages.create(model=MODEL,max_tokens=5,messages=[{"role":"user","content":p}]).content[0].text.strip()
for few in (False, True):
    acc = sum(classify(d["text"], few)==d["label"] for d in data)/len(data)
    print("few-shot" if few else "zero-shot", acc)`,e:"zero-shot 0.7\nfew-shot 0.9",k:["Có dataset có nhãn, đo bằng số","Ví dụ few-shot chọn ca biên/mơ hồ","Ghi lại câu nào vẫn sai để sửa prompt"]},
10:{t:"Retry + validation loop có giới hạn",d:"D5",g:"Validate output, gửi lỗi cụ thể lại cho model để tự sửa, có max retries và escalation.",s:["Dùng extractor ngày 4","Thêm hàm validate (vd: phone phải 10 số)","Khi sai: gửi lại kèm thông báo lỗi; sau 2 lần → escalate cho người"],c:`import re
def validate(d):
    errs = []
    if d["phone"] and not re.fullmatch(r"0\\d{9}", d["phone"]): errs.append("phone phải 10 số bắt đầu bằng 0")
    return errs
def extract_with_retry(mail, max_retry=2):
    msgs=[{"role":"user","content":"Trích xuất:\\n"+mail}]
    for i in range(max_retry+1):
        r = call(msgs); d = r.content[0].input; errs = validate(d)
        print(f"lần {i}:", d, errs)
        if not errs: return d
        msgs += [{"role":"assistant","content":r.content},
                 {"role":"user","content":[{"type":"tool_result","tool_use_id":r.content[0].id,
                   "content":"Lỗi: "+"; ".join(errs),"is_error":True}]}]
    return {"status":"ESCALATE_HUMAN","last":d}`,e:"lần 0: {...'phone':'090123'} ['phone phải 10 số...']\nlần 1: {...'phone':null} []",k:["Lỗi gửi lại cụ thể, không chỉ 'sai rồi'","Có max_retry, không lặp vô hạn","Có nhánh escalate khi không sửa được (dữ liệu nguồn thiếu)"]},
11:{t:"Hook chặn hành động nguy hiểm (PreToolUse)",d:"D1",g:"Ràng buộc cứng bằng code (hook) thay vì chỉ dặn trong prompt.",s:["Tạo .claude/settings.json + hooks/guard.py","Nhờ Claude: 'xóa thư mục build bằng rm -rf /'","Hook trả exit 2 → bị chặn, Claude thấy lý do"],c:`// .claude/settings.json
{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"python3 hooks/guard.py"}]}]}}

# hooks/guard.py
import sys, json
cmd = json.load(sys.stdin)["tool_input"].get("command","")
if "rm -rf /" in cmd or "DROP TABLE" in cmd.upper():
    print("Bị chặn bởi policy: lệnh phá hủy", file=sys.stderr); sys.exit(2)
sys.exit(0)`,e:"PreToolUse:Bash hook error: Bị chặn bởi policy: lệnh phá hủy\nClaude đề xuất lệnh an toàn hơn",k:["Phân biệt prompt (xác suất) vs hook (tất định)","Exit 2 = chặn + đưa stderr cho model","Biết thêm PostToolUse để chuẩn hóa output"]},
12:{t:"Tool scoping: mỗi agent ít tool, đúng vai",d:"D2",g:"Quá nhiều tool làm chọn sai; phân bổ 4–5 tool/agent và đo tỉ lệ chọn đúng.",s:["Tạo 15 tool giả (chỉ description)","Chạy 10 câu hỏi với: (a) cả 15 tool, (b) agent chỉ 4 tool liên quan","Đếm số lần gọi đúng tool"],c:`ALL = [mk(f"tool_{i}", desc) for i, desc in enumerate(DESCS)]   # 15 tool
BILLING = [t for t in ALL if t["name"] in ("get_invoice","refund","get_order","find_customer")]
def first_tool(q, tools):
    r = c.messages.create(model=MODEL,max_tokens=200,tools=tools,tool_choice={"type":"any"},
                          messages=[{"role":"user","content":q}])
    return r.content[-1].name
for name, ts in (("15 tool", ALL), ("4 tool", BILLING)):
    ok = sum(first_tool(q, ts)==exp for q, exp in CASES)
    print(name, f"{ok}/{len(CASES)}")`,e:"15 tool 7/10\n4 tool 10/10",k:["tool_choice any/auto/tool: hiểu khác nhau","Agent chuyên trách = ít tool hơn","Có số đo trước/sau"]},
13:{t:"Plan mode vs thực thi trực tiếp + /compact",d:"D3",g:"Biết khi nào dùng plan mode (thay đổi lớn, nhiều file) và cách giữ context gọn trong phiên dài.",s:["Trong repo mẫu, yêu cầu refactor đổi tên module dùng ở ≥5 file","Lần 1: Shift+Tab bật plan mode → đọc plan → duyệt","Sau khi xong: /compact 'giữ lại danh sách file đã sửa'; ghi lại token trước/sau bằng /cost hoặc /context"],c:`# Ghi lại trong notes/day13.md
| Tác vụ | Plan mode? | Lý do |
|---|---|---|
| Sửa typo 1 file | Không | phạm vi nhỏ, rõ |
| Đổi tên module 5 file | Có | nhiều file, cần duyệt |
| Migration DB | Có + Explore subagent | rủi ro cao |
Context trước /compact: ____ tokens, sau: ____`,e:"Plan liệt kê đủ file bị ảnh hưởng trước khi sửa; sau /compact context giảm rõ rệt",k:["Tự lập bảng quyết định plan/direct","Dùng subagent Explore để đọc code không làm bẩn context chính","Biết /compact vs /clear"]},
14:{t:"Batch API cho xử lý hàng loạt",d:"D4",g:"Message Batches rẻ ~50% nhưng không đồng bộ (tới 24h) → hợp cho job đêm, không hợp cho việc chặn người dùng.",s:["Dùng dataset ngày 9","Gửi batch với custom_id mỗi dòng","Poll trạng thái, đọc kết quả, ghép lại theo custom_id"],c:`reqs = [{"custom_id": f"row-{i}", "params": {"model": MODEL, "max_tokens": 5,
         "messages": [{"role":"user","content":"Phân loại bug|billing|feature: "+d["text"]}]}}
        for i, d in enumerate(data)]
b = c.messages.batches.create(requests=reqs); print("batch", b.id)
import time
while (b := c.messages.batches.retrieve(b.id)).processing_status != "ended":
    print(b.request_counts); time.sleep(30)
for res in c.messages.batches.results(b.id):
    print(res.custom_id, res.result.type, res.result.message.content[0].text if res.result.type=="succeeded" else "")`,e:"batch msgbatch_...\nrequest_counts processing=10 ... → ended\nrow-0 succeeded bug ...",k:["Ghép kết quả bằng custom_id (thứ tự không đảm bảo)","Xử lý dòng errored bằng cách gửi lại riêng","Nêu được 1 ca KHÔNG nên dùng batch (pre-merge check chặn dev)"]},
15:{t:"Capstone: agent hỗ trợ khách hàng end-to-end",d:"D5",g:"Ghép mọi thứ: loop (N1) + tool tốt (N2) + structured output (N4) + facts (N5) + retry (N10) + hook/escalation (N11) + đo đạc.",s:["Tạo thư mục capstone/ dùng lại code các ngày","Agent có 4 tool: find_customer, get_order, refund (giới hạn ≤ 500k bằng code), escalate_human","Viết 5 kịch bản test (đơn không tồn tại, refund 2 triệu, khách tức giận đòi gặp người, thông tin mâu thuẫn, ca bình thường)","Chạy và ghi kết quả vào report.md"],c:`def refund(order_id, amount):
    if amount > 500_000:   # ràng buộc nghiệp vụ = code, không phải prompt
        return {"content":'{"error":"OVER_LIMIT","hint":"gọi escalate_human"}',"is_error":True}
    return {"content": f"Đã hoàn {amount}đ cho {order_id}"}
SCENARIOS = ["Hoàn tiền đơn A-12 250k", "Hoàn 2 triệu đơn A-12",
             "Đơn A-999 đâu rồi??", "Cho tôi gặp người thật NGAY", "Tôi là Lan... à không, Minh"]
for sc in SCENARIOS: print(sc, "=>", run_agent(sc))   # run_agent = loop ngày 1 + facts ngày 5`,e:"Ca 1: refund OK\nCa 2: OVER_LIMIT → escalate_human kèm tóm tắt facts\nCa 3: NOT_FOUND → hỏi lại\nCa 4: escalate ngay\nCa 5: hỏi xác minh danh tính",k:["5/5 kịch bản đúng hành vi mong đợi","Mỗi quyết định map được về 1 domain D1–D5","report.md có bảng kịch bản | kỳ vọng | thực tế | domain"]}
};
(function(){
var LK='ccarf_labs_done_v1',done={};try{done=JSON.parse(localStorage.getItem(LK)||'{}')}catch(e){}
var css=document.createElement('style');css.textContent='#lab{margin-top:22px}#lab h2{margin-top:6px}#lab pre{background:#0f172a;color:#e2e8f0;padding:14px;border-radius:12px;overflow:auto;font-size:13.5px;line-height:1.5;white-space:pre}#lab ol,#lab ul{padding-left:22px}#lab .chk{display:flex;gap:8px;align-items:flex-start;margin:6px 0;cursor:pointer}#lab .lt{display:inline-block;font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;background:var(--pale);color:var(--blue)}#lab .ok{color:var(--greenb);font-weight:700}';document.head.appendChild(css);
var box=document.createElement('div');box.className='card';box.id='lab';
var sec=document.querySelector('main>section');sec.appendChild(box);
function e(x){return String(x).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function draw(){var d=s.day,L=LABS[d];if(!L){box.innerHTML='';return}var st=done[d]||{};var n=L.k.filter(function(_,i){return st[i]}).length;
box.innerHTML='<span class="lt">🛠 LAB CUỐI NGÀY '+String(d).padStart(2,'0')+' · '+L.d+' · '+e(N[L.d][1])+'</span><h2>Hôm nay làm ra: '+e(L.t)+'</h2><p><b>Mục tiêu hiểu:</b> '+e(L.g)+'</p><h3>Các bước</h3><ol>'+L.s.map(function(x){return'<li>'+e(x)+'</li>'}).join('')+'</ol><h3>Code khởi đầu</h3><pre><code>'+e(L.c)+'</code></pre><h3>Kết quả mong đợi</h3><pre><code>'+e(L.e)+'</code></pre><h3>Hoàn thành khi ('+n+'/'+L.k.length+')'+(n===L.k.length?' <span class="ok">✓ Xong lab</span>':'')+'</h3>'+L.k.map(function(x,i){return'<label class="chk"><input type="checkbox" data-i="'+i+'"'+(st[i]?' checked':'')+'> <span>'+e(x)+'</span></label>'}).join('')+'<p class="muted">Gợi ý: lưu code vào thư mục ccarf-labs/day'+String(d).padStart(2,'0')+'/ và commit mỗi ngày — cuối khóa bạn có 15 artifact chạy được. Tham khảo: <a href="https://claudecertificationguide.com/learn/1-agentic-architecture" target="_blank" rel="noopener">Claude Certification Guide</a>.</p>';
box.querySelectorAll('input[type=checkbox]').forEach(function(c){c.onchange=function(){var o=done[d]=done[d]||{};o[c.dataset.i]=c.checked;try{localStorage.setItem(LK,JSON.stringify(done))}catch(x){}draw();mark()}})}
function mark(){document.querySelectorAll('#days .day').forEach(function(b,i){var L=LABS[i+1],st=done[i+1]||{};b.title=L?'Lab: '+L.t:'';b.style.borderBottom=(L&&L.k.every(function(_,j){return st[j]}))?'4px solid var(--greenb)':''})}
var prev=window.render;window.render=function(){prev.apply(this,arguments);draw();mark()};draw();mark();
})();
