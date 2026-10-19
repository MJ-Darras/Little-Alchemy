"""
enrich_chemicals.py
-------------------
Fetches PubChem metadata for every chemical in data/chemicals.tsx
and uploads them to Firestore under the 'chemicals' collection.

Preserves the id / label / info from the TSX file.
Adds: formula, smiles, pubchemCid from PubChem.
Chemicals that cannot be found on PubChem (alloys, mixtures) are skipped.

Usage:
    python utils/enrich_chemicals.py
    python utils/enrich_chemicals.py --dry-run
"""

import os
import sys
import re
import time
import glob
import argparse
import requests

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


# ── Chemical list mirroring data/chemicals.tsx ────────────────────────────────
# (id, label, info, pubchem_search_override)
# pubchem_search_override: name to send to PubChem instead of label (or None)
CHEMICALS: list[tuple[str, str, str, str | None]] = [
    ("iron",              "Iron",              "Metal",          None),
    ("hydrogen",          "Hydrogen",          "Gas",            None),
    ("oxygen",            "Oxygen",            "Gas",            None),
    ("carbon",            "Carbon",            "Non-metal",      None),
    ("sodium",            "Sodium",            "Metal",          None),
    ("chlorine",          "Chlorine",          "Gas",            None),
    ("nitrogen",          "Nitrogen",          "Gas",            None),
    ("helium",            "Helium",            "Noble Gas",      None),
    ("methane",           "Methane",           "Hydrocarbon",    None),
    ("water",             "Water",             "Compound",       None),
    ("salt",              "Salt",              "Ionic Compound", "sodium chloride"),
    ("hydrochloric_acid", "Hydrochloric Acid", "Acid",           "hydrogen chloride"),
    ("sodium-hydroxide",  "Sodium Hydroxide",  "Base",           None),
    ("rust",              "Rust",              "Oxide",          "iron(III) oxide"),
    # alloys — no single PubChem entry, will be skipped
    ("steel",             "Steel",             "Alloy",          None),
    ("carbon-dioxide",    "Carbon Dioxide",    "Gas",            None),
    ("ammonia",           "Ammonia",           "Gas",            None),
    ("ammonium_chloride", "Ammonium Chloride", "Salt",           None),
    ("sulfur",            "Sulfur",            "Non-metal",      None),
    ("calcium",           "Calcium",           "Metal",          None),
    ("phosphorus",        "Phosphorus",        "Non-metal",      None),
    ("glucose",           "Glucose",           "Compound",       None),
    ("deoxyribose",       "Deoxyribose",       "Sugar",          "2-Deoxyribose"),
    # not a single compound — will be skipped
    ("phospholipid",      "Phospholipid Base", "Lipid",          None),
    ("sulfur-dioxide",    "Sulfur Dioxide",    "Gas",            None),
    ("carbon-monoxide",   "Carbon Monoxide",   "Gas",            None),
    ("sulfuric-acid",     "Sulfuric Acid",     "Acid",           None),
    ("acetic-acid",       "Acetic Acid",       "Acid",           None),
    ("hydrogen-peroxide", "Hydrogen Peroxide", "Compound",       None),
    ("hydrogen-cyanide",  "Hydrogen Cyanide",  "Toxic Gas",      None),
    ("calcium-carbonate", "Calcium Carbonate", "Salt",           None),
    ("calcium-phosphate", "Calcium Phosphate", "Mineral",        "tricalcium phosphate"),
    ("aspirin",           "Aspirin",           "Drug",           "acetylsalicylic acid"),
    ("silicon",           "Silicon",           "Metalloid",      None),
    ("silicon-carbide",   "Silicon Carbide",   "Ceramic",        None),
    ("helium-hydride",    "Helium Hydride",    "Ion",            "helium hydride ion"),
    ("iron-sulfide",      "Iron Sulfide",      "Mineral",        "iron(II) sulfide"),
    ("nitric_oxide",      "Nitric Oxide",      "Compound",       None),
    ("nitrogen_dioxide",  "Nitrogen Dioxide",  "Compound",       None),
    ("nitric_acid",       "Nitric Acid",       "Acid",           None),
    ("ammonium_nitrate",  "Ammonium Nitrate",  "Salt",           None),
    ("urea",              "Urea",              "Compound",       None),
    ("copper",            "Copper",            "Metal",          None),
    ("tin",               "Tin",               "Metal",          None),
    ("lead",              "Lead",              "Metal",          None),
    # alloys — will be skipped
    ("bronze",            "Bronze",            "Alloy",          None),
    ("solder",            "Solder",            "Alloy",          None),
    ("cast_iron",         "Cast Iron",         "Alloy",          None),
    ("aluminum_oxide",    "Aluminum Oxide",    "Ceramic",        "aluminium oxide"),
    ("ethene",            "Ethene",            "Compound",       None),
    ("ethanol",           "Ethanol",           "Compound",       None),
    ("ethanoic_acid",     "Ethanoic Acid",     "Acid",           "acetic acid"),
    ("ethyl_ethanoate",   "Ethyl Ethanoate",   "Compound",       "ethyl acetate"),
]


# ── PubChem helpers ───────────────────────────────────────────────────────────

CAS_PATTERN  = re.compile(r'^\d{2,7}-\d{2}-\d$')
SKIP_PATTERN = re.compile(r'^\d|^[A-Z]{2,}-\d|UNII-|InChI=', re.IGNORECASE)


def _get_synonyms(cid: int) -> list[str]:
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/synonyms/JSON"
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            return r.json()["InformationList"]["Information"][0]["Synonym"]
    except Exception:
        pass
    return []


def _pick_preferred_name(synonyms: list[str]) -> str | None:
    for s in synonyms:
        if CAS_PATTERN.match(s):
            continue
        if SKIP_PATTERN.match(s):
            continue
        if len(s) > 60:
            continue
        return s.title()
    return synonyms[0].title() if synonyms else None


def _parse_compound(data: dict) -> dict | None:
    try:
        compound = data["PC_Compounds"][0]
        props    = compound.get("props", [])
        cid      = compound["id"]["id"]["cid"]
    except (KeyError, IndexError):
        return None

    def get_prop(label, name=None):
        for p in props:
            urn = p.get("urn", {})
            if urn.get("label") == label:
                if name is None or urn.get("name") == name:
                    val = p.get("value", {})
                    return val.get("sval") or val.get("ival") or val.get("fval")
        return None

    synonyms = _get_synonyms(cid)
    return {
        "pubchemCid": cid,
        "formula":    get_prop("Molecular Formula") or "",
        "smiles":     get_prop("SMILES", "Absolute") or "",
        "pubchemName": _pick_preferred_name(synonyms),
    }


def pubchem_lookup(search_name: str) -> dict | None:
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{requests.utils.quote(search_name)}/JSON"
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            return _parse_compound(r.json())
    except Exception:
        pass
    time.sleep(0.25)
    return None


# ── Firebase helpers ──────────────────────────────────────────────────────────

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
                print("\n❌  Service account JSON not found in utils/")
                print("    Download from: Firebase Console → Project Settings → Service Accounts")
                sys.exit(1)
            print(f"    Using service account: {os.path.basename(sa_path)}")
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred)

        return fs.client()
    except ImportError:
        print("❌  firebase-admin not installed. Run: pip install firebase-admin")
        sys.exit(1)


# ── Main ──────────────────────────────────────────────────────────────────────

def run(dry_run: bool = False):
    print(f"\n🔍  Looking up {len(CHEMICALS)} chemicals on PubChem...\n")

    found:     list[dict] = []
    no_meta:   list[str]  = []

    for (chem_id, label, info, override) in CHEMICALS:
        search = override or label
        print(f"    {label:30s}", end=" ", flush=True)

        meta = pubchem_lookup(search)

        if meta:
            found.append({
                "id":         chem_id,
                "label":      label,
                "info":       info,
                "formula":    meta["formula"],
                "smiles":     meta["smiles"],
                "pubchemCid": meta["pubchemCid"],
            })
            print(f"✓  {meta['formula']}")
        else:
            # Upload anyway — alloys/mixtures are valid chemicals, just no PubChem entry
            found.append({
                "id":         chem_id,
                "label":      label,
                "info":       info,
                "formula":    "",
                "smiles":     "",
                "pubchemCid": 0,
            })
            no_meta.append(label)
            print("✗ not found — uploading without metadata")

    print(f"\n📦  {len(found)} chemicals ready ({len(no_meta)} without PubChem metadata)")
    if no_meta:
        print(f"    No metadata: {', '.join(no_meta)}")

    if dry_run:
        print("\n── DRY RUN: no data uploaded ──\n")
        for c in found:
            print(f"  {c}")
        return

    print("\n☁️   Uploading to Firestore  (chemicals/)...")
    db = _init_firebase()
    for chem in found:
        db.collection("chemicals").document(chem["id"]).set(chem)
        print(f"    ✓ {chem['id']}")

    print(f"\n✅  Done — {len(found)} chemicals uploaded ({len(no_meta)} without PubChem metadata).")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Enrich chemicals.tsx entries with PubChem metadata and upload to Firestore"
    )
    parser.add_argument("--dry-run", action="store_true", help="Lookup only, do not upload")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
