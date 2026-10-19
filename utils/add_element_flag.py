"""
add_element_flag.py
───────────────────
Fetches all chemicals from Firestore, determines whether each is a pure
element (isElement: true) or a compound/alloy (isElement: false), then
updates every document with that boolean field.

Usage:
    python add_element_flag.py             # preview what would be set
    python add_element_flag.py --apply     # write isElement to Firestore
    python add_element_flag.py --export    # save chemicals + flag to chemicals_export.json
"""

import re
import sys
import json
import glob
import os
import argparse


# ── Firebase init ─────────────────────────────────────────────────────────────

def _find_service_account() -> str | None:
    utils_dir = os.path.dirname(__file__)
    default = os.path.join(utils_dir, "serviceAccount.json")
    if os.path.exists(default):
        return default
    matches = glob.glob(os.path.join(utils_dir, "*firebase-adminsdk*.json"))
    return matches[0] if matches else None


def _init_firebase():
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as fs

        if not firebase_admin._apps:
            sa_path = _find_service_account()
            if not sa_path:
                print("❌  Service account JSON not found in utils/")
                sys.exit(1)
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred)

        return fs.client()
    except ImportError:
        print("❌  firebase-admin not installed. Run: pip install firebase-admin")
        sys.exit(1)


# ── Element detection ─────────────────────────────────────────────────────────

def is_element(formula: str) -> bool:
    """
    Returns True if the formula contains exactly one distinct element symbol.
    Examples:
      Fe       → True   (iron)
      O2       → True   (oxygen)
      H2       → True   (hydrogen)
      NaCl     → False  (two elements)
      H2O      → False  (two elements)
      ""       → False  (alloy / no formula)
    """
    if not formula or not formula.strip():
        return False
    symbols = re.findall(r'[A-Z][a-z]?', formula)
    return len(set(symbols)) == 1


# ── Main ──────────────────────────────────────────────────────────────────────

def run(apply: bool, export: bool):
    db = _init_firebase()

    print("Fetching chemicals from Firestore...")
    docs = list(db.collection("chemicals").stream())
    print(f"  Found {len(docs)} chemicals\n")

    results = []
    for doc in docs:
        data = doc.to_dict()
        formula = data.get("formula", "")
        flag = is_element(formula)
        results.append({
            "id":        doc.id,
            "label":     data.get("label", doc.id),
            "formula":   formula,
            "isElement": flag,
        })

    # Sort: elements first, then compounds
    results.sort(key=lambda x: (not x["isElement"], x["label"]))

    # Print preview
    elements  = [r for r in results if r["isElement"]]
    compounds = [r for r in results if not r["isElement"]]

    print(f"ELEMENTS ({len(elements)}):")
    for r in elements:
        print(f"  ✓  {r['id']:30s}  formula={r['formula']}")

    print(f"\nCOMPOUNDS / ALLOYS ({len(compounds)}):")
    for r in compounds:
        print(f"  –  {r['id']:30s}  formula={r['formula']}")

    # Export to JSON
    if export:
        out_path = os.path.join(os.path.dirname(__file__), "chemicals_export.json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(results, f, indent=2)
        print(f"\n📄  Exported to {out_path}")

    # Apply to Firestore
    if apply:
        print(f"\n☁️   Writing isElement to {len(results)} documents...")
        for r in results:
            db.collection("chemicals").document(r["id"]).update({"isElement": r["isElement"]})
            print(f"  ✓ {r['id']}")
        print("\n✅  Done.")
    else:
        print("\n(Dry run — pass --apply to write to Firestore)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply",  action="store_true", help="Write isElement field to Firestore")
    parser.add_argument("--export", action="store_true", help="Save results to chemicals_export.json")
    args = parser.parse_args()
    run(apply=args.apply, export=args.export)
