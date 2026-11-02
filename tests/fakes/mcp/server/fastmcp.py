"""Fake FastMCP: chỉ ghi lại tool/resource đã đăng ký."""
class FastMCP:
    def __init__(self, name):
        self.name, self.tools, self.resources = name, {}, {}
    def tool(self):
        def deco(fn):
            self.tools[fn.__name__] = fn
            return fn
        return deco
    def resource(self, uri):
        def deco(fn):
            self.resources[uri] = fn
            return fn
        return deco
    def run(self):
        raise RuntimeError("fake FastMCP không chạy server thật")
