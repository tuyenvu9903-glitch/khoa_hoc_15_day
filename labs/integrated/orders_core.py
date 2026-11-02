"""Lõi nghiệp vụ dùng chung cho Lab tích hợp (API → MCP → multi-agent).
Không gọi mạng: dữ liệu giả trong bộ nhớ để test được."""
REFUND_LIMIT = 500_000  # VND — quá mức này phải escalate cho người (hook tất định, không nhờ prompt)
CUSTOMERS = {"a@b.vn": "C001", "0901234567": "C002"}
ORDERS = {"812": {"customer": "C001", "total": 320_000, "status": "delivered"},
          "90": {"customer": "C002", "total": 1_200_000, "status": "delivered"},
          "77": {"customer": "C001", "total": 150_000, "status": "shipping"}}
POLICY = {"refund_window_days": 30, "needs_verified_customer": True}

def err(category, message, retryable=False, **extra):
    """Structured error (lỗi có cấu trúc): agent đọc được category + isRetryable."""
    return {"isError": True, "errorCategory": category, "isRetryable": retryable, "message": message, **extra}

class Session:
    def __init__(self):
        self.customer_id = None   # prerequisite: phải find_customer trước khi refund

    def find_customer(self, key):
        cid = CUSTOMERS.get(key)
        if not cid:
            return err("not_found", f"Không có khách với {key!r}")
        self.customer_id = cid
        return {"customer_id": cid}

    def get_order(self, order_id):
        o = ORDERS.get(str(order_id))
        if not o:
            return err("not_found", f"Không có đơn {order_id}")
        return {"order_id": str(order_id), **o}

    def refund(self, order_id, amount):
        if self.customer_id is None:
            return err("prerequisite", "Phải xác minh khách (find_customer) trước khi hoàn tiền")
        o = ORDERS.get(str(order_id))
        if not o:
            return err("not_found", f"Không có đơn {order_id}")
        if o["customer"] != self.customer_id:
            return err("permission", "Đơn không thuộc khách đã xác minh")
        if amount > o["total"]:
            return err("validation", "Số tiền hoàn lớn hơn giá trị đơn")
        if amount > REFUND_LIMIT:
            return err("escalation", "Vượt hạn mức tự động, chuyển cho nhân viên", escalate=True)
        return {"refunded": amount, "order_id": str(order_id)}

TOOLS = [
    {"name": "find_customer", "description": "Xác minh khách bằng email hoặc số điện thoại. BẮT BUỘC gọi trước refund.",
     "input_schema": {"type": "object", "properties": {"key": {"type": "string"}}, "required": ["key"]}},
    {"name": "get_order", "description": "Xem đơn theo order_id (chỉ đọc).",
     "input_schema": {"type": "object", "properties": {"order_id": {"type": "string"}}, "required": ["order_id"]}},
    {"name": "refund", "description": "Hoàn tiền cho đơn của khách ĐÃ xác minh. Số tiền VND.",
     "input_schema": {"type": "object", "properties": {"order_id": {"type": "string"}, "amount": {"type": "integer"}},
                      "required": ["order_id", "amount"]}},
]

def dispatch(session, name, args):
    fn = {"find_customer": session.find_customer, "get_order": session.get_order, "refund": session.refund}.get(name)
    if not fn:
        return err("unknown_tool", f"Tool {name} không tồn tại")
    try:
        return fn(**args)
    except TypeError as e:
        return err("validation", str(e))
