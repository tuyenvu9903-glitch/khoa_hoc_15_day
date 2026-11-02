"""Bước 2 — Đưa cùng nghiệp vụ thành MCP server (FastMCP, stdio).
Đăng ký trong .mcp.json: {"mcpServers":{"orders":{"command":"python","args":["labs/integrated/step2_mcp_server.py"]}}}"""
from mcp.server.fastmcp import FastMCP
from orders_core import Session

mcp = FastMCP("orders")
_session = Session()   # 1 phiên / tiến trình server

@mcp.tool()
def find_customer(key: str) -> dict:
    """Xác minh khách bằng email hoặc số điện thoại. BẮT BUỘC gọi trước refund."""
    return _session.find_customer(key)

@mcp.tool()
def get_order(order_id: str) -> dict:
    """Xem đơn theo order_id (chỉ đọc)."""
    return _session.get_order(order_id)

@mcp.tool()
def refund(order_id: str, amount: int) -> dict:
    """Hoàn tiền cho đơn của khách ĐÃ xác minh. Trả lỗi có cấu trúc (errorCategory, isRetryable)."""
    return _session.refund(order_id, amount)

@mcp.resource("policy://refund")
def refund_policy() -> str:
    """Resource: chính sách hoàn tiền để agent đọc thay vì đoán."""
    from orders_core import POLICY, REFUND_LIMIT
    return f"Hạn hoàn tiền {POLICY['refund_window_days']} ngày; tự động tối đa {REFUND_LIMIT} VND; cần xác minh khách."

if __name__ == "__main__":
    mcp.run()
