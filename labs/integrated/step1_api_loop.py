"""Bước 1 — Agentic loop thuần Messages API: lặp tới khi stop_reason == 'end_turn'."""
import json, sys
import anthropic
from orders_core import Session, TOOLS, dispatch
MODEL = "claude-sonnet-4-5"

def run(prompt, client=None, max_turns=8):
    client = client or anthropic.Anthropic()
    s, msgs = Session(), [{"role": "user", "content": prompt}]
    for _ in range(max_turns):
        r = client.messages.create(model=MODEL, max_tokens=1024, tools=TOOLS, messages=msgs,
                                   system="Bạn là agent CSKH. Luôn xác minh khách trước khi hoàn tiền.")
        msgs.append({"role": "assistant", "content": r.content})
        if r.stop_reason != "tool_use":
            return "".join(b.text for b in r.content if b.type == "text"), msgs
        results = []
        for b in r.content:
            if b.type == "tool_use":
                out = dispatch(s, b.name, b.input)
                results.append({"type": "tool_result", "tool_use_id": b.id, "content": json.dumps(out, ensure_ascii=False),
                                "is_error": bool(out.get("isError"))})
        msgs.append({"role": "user", "content": results})
    return "[dừng: quá max_turns]", msgs

if __name__ == "__main__":
    print(run(sys.argv[1] if len(sys.argv) > 1 else "Tôi là a@b.vn, hoàn 100000đ cho đơn 812")[0])
