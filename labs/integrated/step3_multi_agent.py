"""Bước 3 — Coordinator + 2 subagent chạy song song (hub-and-spoke).
Mỗi subagent nhận context TƯỜNG MINH (không thừa hưởng lịch sử), ít tool đúng vai,
trả kết quả có cấu trúc; coordinator gộp và ghi rõ chỗ thiếu (gaps) thay vì bịa."""
from concurrent.futures import ThreadPoolExecutor
from orders_core import Session, POLICY, REFUND_LIMIT, err

def policy_agent(task):
    """Subagent chỉ đọc chính sách — không có tool refund."""
    return {"agent": "policy", "ok": True,
            "facts": {"window_days": POLICY["refund_window_days"], "auto_limit": REFUND_LIMIT}}

def billing_agent(task):
    """Subagent billing: 3 tool, chạy trong Session riêng."""
    s = Session()
    who = s.find_customer(task["customer_key"])
    if who.get("isError"):
        return {"agent": "billing", "ok": False, "error": who}
    order = s.get_order(task["order_id"])
    if order.get("isError"):
        return {"agent": "billing", "ok": False, "error": order}
    res = s.refund(task["order_id"], task["amount"])
    return {"agent": "billing", "ok": not res.get("isError"), "order": order, "result": res}

def coordinator(request, timeout=10):
    tasks = {"policy": (policy_agent, {"question": "refund policy"}),
             "billing": (billing_agent, {k: request[k] for k in ("customer_key", "order_id", "amount")})}
    out, gaps = {}, []
    with ThreadPoolExecutor(max_workers=len(tasks)) as ex:   # song song: phát cả 2 cùng lúc
        futs = {name: ex.submit(fn, ctx) for name, (fn, ctx) in tasks.items()}
        for name, f in futs.items():
            try:
                out[name] = f.result(timeout=timeout)
            except Exception as e:   # subagent lỗi → ghi gap, không làm sập cả hệ
                out[name] = {"agent": name, "ok": False, "error": err("subagent_failure", str(e), retryable=True)}
    for name, r in out.items():
        if not r.get("ok"):
            gaps.append({"agent": name, **(r.get("error") or r.get("result") or {})})
    b = out.get("billing", {})
    escalate = any(g.get("escalate") for g in gaps) or bool((b.get("result") or {}).get("escalate"))
    status = "done" if not gaps else ("escalated" if escalate else "partial")
    return {"status": status, "results": out, "gaps": gaps}

if __name__ == "__main__":
    import json
    for req in ({"customer_key": "a@b.vn", "order_id": "812", "amount": 100_000},
                {"customer_key": "0901234567", "order_id": "90", "amount": 900_000},
                {"customer_key": "x@y.z", "order_id": "812", "amount": 1}):
        print(json.dumps(coordinator(req), ensure_ascii=False))
