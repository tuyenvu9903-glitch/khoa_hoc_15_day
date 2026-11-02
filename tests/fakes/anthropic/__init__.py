"""Fake tối giản của SDK anthropic để chạy test offline (không gọi mạng)."""
from types import SimpleNamespace as NS
SCRIPT = []   # test đẩy vào danh sách response theo thứ tự
CALLS = []

def text(t):
    return NS(type="text", text=t)

def tool_use(name, inp, id="tu_1"):
    return NS(type="tool_use", name=name, input=inp, id=id)

def response(blocks, stop_reason=None):
    if stop_reason is None:
        stop_reason = "tool_use" if any(b.type == "tool_use" for b in blocks) else "end_turn"
    return NS(content=blocks, stop_reason=stop_reason)

class _Messages:
    def create(self, **kw):
        CALLS.append(kw)
        if not SCRIPT:
            raise RuntimeError("fake anthropic: hết response trong SCRIPT")
        r = SCRIPT.pop(0)
        return r(kw) if callable(r) else r

class Anthropic:
    def __init__(self, *a, **kw):
        self.messages = _Messages()
