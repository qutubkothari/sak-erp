import json
import sys
import urllib.error
import urllib.request
from typing import Any

BASE = "http://127.0.0.1:4000/api/v1"
CODES = [
    "RAD-TRR-QX71W915",
    "RAD-TRR-R9MI1W915",
]


def fetch_json(path: str) -> tuple[int | None, Any, str]:
    url = f"{BASE}{path}"
    try:
        with urllib.request.urlopen(url) as r:
            raw = r.read().decode("utf-8", errors="replace")
            return r.status, json.loads(raw), raw
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8", errors="replace") if e.fp else ""
        return e.code, None, raw
    except Exception as e:
        return None, None, repr(e)


def unwrap(body: Any) -> list[dict]:
    if isinstance(body, list):
        return [x for x in body if isinstance(x, dict)]
    if isinstance(body, dict):
        maybe = body.get("data") or body.get("items") or []
        if isinstance(maybe, list):
            return [x for x in maybe if isinstance(x, dict)]
    return []


def to_float(value: Any) -> float:
    try:
        if value is None:
            return 0.0
        return float(value)
    except Exception:
        return 0.0


def main() -> int:
    items_status, items_body, items_raw = fetch_json("/items")
    print("items_status", items_status)
    if items_status != 200:
        print("items_error_body", items_raw[:1000])
        return 2

    items = unwrap(items_body)
    code_to_id = {it.get("code"): it.get("id") for it in items if it.get("code")}
    print("item_ids", {c: code_to_id.get(c) for c in CODES})

    stock_status, stock_body, stock_raw = fetch_json("/inventory/stock")
    print("stock_status", stock_status)
    if stock_status != 200:
        print("stock_error_body", stock_raw[:1000])
        return 3

    stock_rows = unwrap(stock_body)

    # Aggregate by item_id
    stock_by_item: dict[str, dict[str, Any]] = {}
    for e in stock_rows:
        item_id = e.get("item_id") or e.get("itemId")
        if not item_id:
            continue

        agg = stock_by_item.setdefault(
            str(item_id),
            {
                "rows": 0,
                "quantity": 0.0,
                "available_quantity": 0.0,
                "allocated_quantity": 0.0,
                "total_quantity": 0.0,
                "keys": set(),
                "sample": None,
            },
        )
        agg["rows"] += 1
        agg["quantity"] += to_float(e.get("quantity"))
        agg["available_quantity"] += to_float(e.get("available_quantity"))
        agg["allocated_quantity"] += to_float(e.get("allocated_quantity"))
        agg["total_quantity"] += to_float(e.get("total_quantity"))
        agg["keys"].update(e.keys())
        if agg["sample"] is None:
            agg["sample"] = e

    for code in CODES:
        iid = code_to_id.get(code)
        if not iid:
            print(f"\n{code}: ITEM_NOT_FOUND")
            continue

        agg = stock_by_item.get(str(iid))
        if not agg:
            print(f"\n{code}: NO_STOCK_ROWS item_id={iid}")
            continue

        print(
            f"\n{code}: rows={agg['rows']} quantity_sum={agg['quantity']} available_sum={agg['available_quantity']} allocated_sum={agg['allocated_quantity']} total_quantity_sum={agg['total_quantity']}"
        )
        sample = agg["sample"] or {}
        sample_keys = [
            "warehouse_id",
            "warehouseId",
            "quantity",
            "available_quantity",
            "allocated_quantity",
            "total_quantity",
            "total_qty",
            "updated_at",
            "created_at",
        ]
        print("sample_row", {k: sample.get(k) for k in sample_keys if k in sample})
        print("all_keys", sorted(list(agg["keys"])))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
