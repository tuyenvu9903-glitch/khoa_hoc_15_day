# Lab tích hợp: API → MCP → Multi-agent

Cùng một nghiệp vụ hoàn tiền (`orders_core.py`) đi qua 3 tầng:

| Bước | File | Kỹ năng (Exam Guide v1.0) |
|---|---|---|
| 1 | `step1_api_loop.py` | Agentic loop (vòng lặp agent), `stop_reason`, `tool_result`, `is_error` — D1, D2 |
| 2 | `step2_mcp_server.py` | MCP server (tool + resource), lỗi có cấu trúc — D2 |
| 3 | `step3_multi_agent.py` | Coordinator–subagent song song, context tường minh, gaps, escalation — D1, D5 |

Chạy thật: `pip install anthropic mcp`, đặt biến môi trường API key, rồi `python step1_api_loop.py`.
Chạy test không cần mạng: `python -m unittest discover -s tests` ở thư mục gốc repo.
