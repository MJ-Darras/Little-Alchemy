"""
firebase_pipeline.py
────────────────────
Parses chemical reactions from a Markdown file and uploads
chemicals + reactions to Firestore.

Usage:
    python firebase_pipeline.py <input.md>
    python firebase_pipeline.py <input.md> --dry-run   # parse only, no upload

Setup:
    1. pip install -r requirements.txt
    2. Download your Firebase service account key from:
       Firebase Console → Project Settings → Service Accounts → Generate new private key
    3. Save it as utils/serviceAccount.json
"""

import re
import os
import sys
import time
import json
import glob
import argparse
import requests

from dotenv import load_dotenv
from collections import defaultdict

# ── Load environment ──────────────────────────────────────────────────────────

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

PROJECT_ID = os.getenv("NEXT_PUBLIC_FIREBASE_PROJECT_ID")


def _find_service_account() -> str | None:
    """Find the service account JSON in the utils directory."""
    utils_dir = os.path.dirname(__file__)
    # Prefer the canonical name
    default = os.path.join(utils_dir, "serviceAccount.json")
    if os.path.exists(default):
        return default
    # Fall back to any firebase adminsdk key present
    matches = glob.glob(os.path.join(utils_dir, "*firebase-adminsdk*.json"))
    return matches[0] if matches else None


# ── STEP 1: Extract LaTeX blocks from Markdown ────────────────────────────────

def extract_latex_blocks(md: str) -> list[str]:
    """
    Pull out every $...$ and $$...$$ block.
    $$...$$ is matched first to avoid the double-dollar being split into two singles.
    """
    blocks = []

    # $$...$$ — display math (may span multiple lines)
    for m in re.finditer(r'\$\$(.*?)\$\$', md, re.DOTALL):
        blocks.append(("display", m.group(1)))

    # $...$ — inline math (single line)
    # Remove display blocks first so we don't double-match
    inline_md = re.sub(r'\$\$.*?\$\$', '', md, flags=re.DOTALL)
    for m in re.finditer(r'\$(.*?)\$', inline_md):
        blocks.append(("inline", m.group(1)))

    return blocks


# ── STEP 2: Filter to reactions only ─────────────────────────────────────────

ARROW_PATTERN = re.compile(
    r'\\longrightarrow|\\rightarrow|\\xrightarrow|⟶|→'
)
FORMULA_PATTERN = re.compile(
    r'\\mathrm\{|[A-Z][a-z]?\d'
)


def is_chemical_reaction(latex: str) -> bool:
    """
    Keep only blocks that:
    - contain a reaction arrow
    - contain \mathrm{ (formula notation) — this already excludes
      word-only equations like "alcohol + oxygen → water" which use \text{}
    """
    if not ARROW_PATTERN.search(latex):
        return False
    if not FORMULA_PATTERN.search(latex):
        return False
    return True


# ── STEP 3: Clean complex LaTeX ───────────────────────────────────────────────

def clean_reaction_latex(latex: str) -> str:
    """
    Reduce complex LaTeX environments into a simple
    'reagents \\longrightarrow products' string.
    """
    # \begin{...} / \end{...} environments
    latex = re.sub(r'\\begin\{[^}]*\}', '', latex)
    latex = re.sub(r'\\end\{[^}]*\}', '', latex)

    # \underset{label}{formula} → formula only
    latex = re.sub(r'\\underset\{[^}]*\}\{([^}]*)\}', r'\1', latex)

    # \overset{label}{formula} → formula only
    latex = re.sub(r'\\overset\{[^}]*\}\{([^}]*)\}', r'\1', latex)

    # \substack{...} → remove entirely (annotation, not formula)
    latex = re.sub(r'\\substack\{[^}]*\}', '', latex)

    # \xrightarrow{conditions} → \longrightarrow
    latex = re.sub(r'\\xrightarrow\{[^}]*\}', r'\\longrightarrow', latex)
    latex = re.sub(r'\\xrightarrow', r'\\longrightarrow', latex)

    # Unicode arrows → \longrightarrow
    latex = latex.replace('⟶', r'\longrightarrow').replace('→', r'\longrightarrow')

    # Multi-line blocks (\\): pick the line that has an arrow AND \mathrm
    if r'\\' in latex:
        lines = latex.split(r'\\')
        chosen = None
        for line in lines:
            if re.search(r'\\longrightarrow|\\rightarrow', line) and re.search(r'\\mathrm', line):
                chosen = line
                break
        if not chosen:
            # Fallback: last line containing an arrow
            for line in reversed(lines):
                if re.search(r'\\longrightarrow|\\rightarrow', line):
                    chosen = line
                    break
        if chosen:
            latex = chosen

    latex = re.sub(r'\s+', ' ', latex).strip()
    return latex


# ── STEP 4A: Hill notation helper ────────────────────────────────────────────

def to_hill_notation(formula: str) -> str:
    """
    Convert a molecular formula into Hill notation.

    Examples:
        CH3CH2Cl  -> C2H5Cl
        NaOH      -> HNaO
        H2SO4     -> H2O4S
        C6H5OH    -> C6H6O

    Notes:
    - Handles simple molecular formulas.
    - Preserves bracketed groups if parsing fails.
    - Does NOT expand nested parentheses like Fe(NO3)3.
    """

    # Reject formulas with parentheses for now
    # (can be expanded later if needed)
    if "(" in formula or "[" in formula:
        return formula

    # Match element symbols + optional count
    tokens = re.findall(r'([A-Z][a-z]?)(\d*)', formula)

    if not tokens:
        return formula

    counts = defaultdict(int)

    for elem, count in tokens:
        counts[elem] += int(count) if count else 1

    def fmt(elem):
        n = counts[elem]
        return elem if n == 1 else f"{elem}{n}"

    ordered = []

    # Hill system:
    # If carbon exists:
    #   C first, H second, rest alphabetical
    if "C" in counts:
        ordered.append(fmt("C"))
        del counts["C"]

        if "H" in counts:
            ordered.append(fmt("H"))
            del counts["H"]

        for elem in sorted(counts):
            ordered.append(fmt(elem))

    # Otherwise: all alphabetical
    else:
        for elem in sorted(counts):
            ordered.append(fmt(elem))

    return ''.join(ordered)


# ── STEP 4B: Parse into formula lists ────────────────────────────────────────

def parse_reaction(latex: str) -> tuple[list[str], list[str]]:
    """
    Convert a cleaned LaTeX reaction string into
    (reagents, products) as Hill-notation formula strings.

    e.g.
        "CH3CH2OH + O2" → ["C2H6O", "O2"]
    """

    # Remove \underset{label}{formula} → formula
    latex = re.sub(r'\\underset\{(?:[^{}]|\{[^{}]*\})*\}\{', '{', latex)
    latex = re.sub(r'\\overset\{(?:[^{}]|\{[^{}]*\})*\}\{', '{', latex)
    latex = re.sub(r'\\substack\{(?:[^{}]|\{[^{}]*\})*\}', '', latex)

    # Remove alignment chars
    latex = re.sub(r'&+', '', latex)

    # Unwrap \mathrm{} and \text{}
    latex = re.sub(r'\\mathrm\{([^}]*)\}', r'\1', latex)
    latex = re.sub(r'\\text\s*\{([^}]*)\}', r'\1', latex)

    # Subscripts
    latex = re.sub(r'_\{(\w+)\}', r'\1', latex)
    latex = re.sub(r'_(\w)', r'\1', latex)

    # Remove superscripts / charges
    latex = re.sub(r'\^\{[^}]*\}', '', latex)
    latex = re.sub(r'\^(\w)', '', latex)

    # Normalize arrows
    latex = re.sub(r'\\longrightarrow|\\rightarrow', '⟶', latex)

    # Remove remaining LaTeX commands
    latex = re.sub(r'\\[a-zA-Z]+', '', latex)

    # Remove braces
    latex = latex.replace('{', '').replace('}', '')

    # Collapse whitespace
    latex = re.sub(r'\s+', ' ', latex).strip()

    if '⟶' not in latex:
        return [], []

    left, right = latex.split('⟶', 1)

    def parse_side(side: str) -> list[str]:
        out = []

        for p in side.split('+'):
            p = p.strip()

            # Remove leading stoichiometric coefficient
            p = re.sub(r'^\d+\s*', '', p).strip()

            # Remove spaces from split \mathrm groups
            p = p.replace(' ', '')

            # Must look like a formula
            if not p or not re.match(r'^[A-Z\(\[]', p):
                continue

            # Reject long lowercase words
            if re.search(r'[a-z]{3,}', p):
                continue

            # Convert to Hill notation
            p = to_hill_notation(p)

            out.append(p)

        return out

    return parse_side(left), parse_side(right)


# ── STEP 5: PubChem lookup ────────────────────────────────────────────────────

CAS_PATTERN = re.compile(r'^\d{2,7}-\d{2}-\d$')
SKIP_PATTERNS = re.compile(r'^\d|^[A-Z]{2,}-\d|UNII-|InChI=', re.IGNORECASE)


def _pick_preferred_name(synonyms: list[str]) -> str | None:
    """
    Return the first synonym that looks like a real name —
    skipping CAS numbers, registry IDs, InChI strings, etc.
    Normalises to title case so PubChem ALL-CAPS entries look consistent.
    """
    for s in synonyms:
        if CAS_PATTERN.match(s):
            continue
        if SKIP_PATTERNS.match(s):
            continue
        if len(s) > 60:  # unreasonably long strings are usually identifiers
            continue
        return s.title()
    return synonyms[0].title() if synonyms else None


def _get_synonyms(cid: int) -> list[str]:
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/synonyms/JSON"
    try:
        r = requests.get(url, timeout=10)
        if r.status_code == 200:
            return r.json()["InformationList"]["Information"][0]["Synonym"]
    except Exception:
        pass
    return []


def _extract_pubchem_info(data: dict) -> dict | None:
    try:
        compound = data["PC_Compounds"][0]
        props = compound.get("props", [])
        cid = compound["id"]["id"]["cid"]
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
        "pubchemCid":    cid,
        "formula":       get_prop("Molecular Formula"),
        "smiles":        get_prop("SMILES", "Absolute") or "",
        "preferredName": _pick_preferred_name(synonyms),
    }


# Formulas that are shorthand notations, not real compounds
_SKIP_FORMULAS = {"[H]", "[H2]", "e-"}


def pubchem_lookup(formula: str) -> dict | None:
    """Try PubChem by formula, then by name. Returns metadata or None."""
    if formula in _SKIP_FORMULAS:
        return None

    # Strip brackets for lookup (e.g. [H] → H, but we skip those above)
    lookup = formula.strip('[]')

    for endpoint in [f"fastformula/{lookup}/cids", f"name/{lookup}", f"name/{formula}"]:
        url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/{endpoint}/JSON"
        try:
            r = requests.get(url, timeout=10)
            if r.status_code == 200:
                cids = (
                    r.json()
                    .get("IdentifierList", {})
                    .get("CID", [])
                )
                for cid in cids:
                        prop_url = (
                            f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/JSON"
                        )
                        rp = requests.get(prop_url, timeout=10)
                        if rp.status_code == 200:
                            result = _extract_pubchem_info(rp.json())
                            if result:
                                return result
        except Exception:
            pass
        time.sleep(0.25)  # respect PubChem rate limit

    return None


# ── STEP 6: ID generation ─────────────────────────────────────────────────────

def formula_to_id(formula: str) -> str:
    """Fallback: turn a formula like 'C2H5OH' into a kebab-case ID like 'c2h5oh'."""
    id_ = re.sub(r'[^a-zA-Z0-9]', '-', formula.lower())
    id_ = re.sub(r'-+', '-', id_).strip('-')
    return id_


def name_to_id(name: str) -> str:
    """Turn a preferred name like 'Carbon Dioxide' into 'carbon-dioxide'."""
    id_ = re.sub(r'[^a-zA-Z0-9]', '-', name.lower())
    id_ = re.sub(r'-+', '-', id_).strip('-')
    return id_


# ── STEP 7: Firestore upload ──────────────────────────────────────────────────

def _init_firebase():
    """Initialise Firebase Admin SDK with the service account key."""
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore as fs

        if not firebase_admin._apps:
            sa_path = _find_service_account()
            if not sa_path:
                print("\n❌  Service account JSON not found in utils/")
                print("    Download it from: Firebase Console → Project Settings → Service Accounts")
                sys.exit(1)
            print(f"    Using service account: {os.path.basename(sa_path)}")
            cred = credentials.Certificate(sa_path)
            firebase_admin.initialize_app(cred)

        return fs.client()
    except ImportError:
        print("❌  firebase-admin not installed. Run: pip install firebase-admin")
        sys.exit(1)


def upload_to_firestore(chemicals: dict[str, dict], reactions: list[dict]):
    """Write chemicals and reactions collections to Firestore."""
    db = _init_firebase()

    # Pre-fetch existing pubchemCids to skip already-uploaded chemicals
    print("\n  Checking existing chemicals in Firestore...")
    existing_cids: set[int] = set()
    for doc in db.collection("chemicals").stream():
        cid = doc.to_dict().get("pubchemCid", 0)
        if cid:
            existing_cids.add(cid)
    print(f"    Found {len(existing_cids)} existing chemical(s)")

    print("\n  chemicals/")
    skipped = 0
    for _, data in chemicals.items():
        doc_id = data["id"]   # name-based ID, e.g. "water" not "H2O"
        cid = data.get("pubchemCid", 0)
        if cid and cid in existing_cids:
            print(f"    ⏭ {doc_id}  (cid={cid} already in Firestore)")
            skipped += 1
            continue
        db.collection("chemicals").document(doc_id).set(data)
        print(f"    ✓ {doc_id}")
    if skipped:
        print(f"    (Skipped {skipped} already-existing chemicals)")

    # Pre-fetch existing reaction keys to avoid duplicates across runs
    existing_reaction_keys: set[str] = set()
    for doc in db.collection("reactions").stream():
        key = doc.to_dict().get("reactionKey", "")
        if key:
            existing_reaction_keys.add(key)

    print(f"\n  reactions/  ({len(existing_reaction_keys)} already exist)")
    skipped_rxn = 0
    next_index = len(existing_reaction_keys) + 1
    for rxn in reactions:
        key = rxn.get("reactionKey", "")
        if key and key in existing_reaction_keys:
            skipped_rxn += 1
            continue
        doc_id = f"reaction_{next_index:03d}"
        db.collection("reactions").document(doc_id).set(rxn)
        print(f"    ✓ {doc_id}  ({rxn['equation'][:70]})")
        next_index += 1
    if skipped_rxn:
        print(f"    (Skipped {skipped_rxn} duplicate reaction(s))")


# ── MAIN PIPELINE ─────────────────────────────────────────────────────────────

def run(md_file: str, dry_run: bool = False, check: bool = False):
    print(f"\n📄  Reading: {md_file}")
    with open(md_file, "r", encoding="utf-8") as f:
        content = f.read()

    # ── 1. Extract
    all_blocks = extract_latex_blocks(content)
    print(f"    {len(all_blocks)} LaTeX blocks found")

    # ── 2. Filter
    reaction_latex = [
        latex for (_, latex) in all_blocks
        if is_chemical_reaction(latex)
    ]
    print(f"    {len(reaction_latex)} identified as chemical reactions")

    # ── 3-4. Clean + parse
    chemicals: dict[str, dict] = {}  # formula_string → partial data
    reactions_raw: list[dict] = []

    for raw in reaction_latex:
        cleaned = clean_reaction_latex(raw)
        reagents, products = parse_reaction(cleaned)

        if not reagents or not products:
            continue

        for formula in reagents + products:
            if formula not in chemicals:
                chemicals[formula] = {"formula": formula}

        reactions_raw.append({
            "reagentsFormulas": reagents,
            "productsFormulas": products,
            "latexSource": raw.strip(),
        })

    print(f"\n🧪  {len(chemicals)} unique chemicals in {len(reactions_raw)} reactions")

    # ── 5. PubChem enrichment
    print("\n🔍  PubChem lookup...")
    enriched: dict[str, dict] = {}

    for formula in chemicals:
        print(f"    {formula:20s}", end=" ", flush=True)
        meta = pubchem_lookup(formula)

        preferred = meta["preferredName"] if meta and meta.get("preferredName") else None
        chem_id = name_to_id(preferred) if preferred else formula_to_id(formula)
        name = preferred if preferred else formula

        enriched[formula] = {
            "id":         chem_id,
            "label":      name,
            "info":       "Compound",   # default — update in Firebase console
            "formula":    meta["formula"] if meta and meta["formula"] else formula,
            "smiles":     meta["smiles"] if meta else "",
            "pubchemCid": meta["pubchemCid"] if meta else 0,
        }
        print("✓" if meta else "✗ not found")

    # ── Deduplicate by pubchemCid: merge chemicals that resolved to the same compound
    # Keep the first formula seen (canonical); remap all others to it
    cid_to_canonical: dict[int, str] = {}   # pubchemCid → canonical formula string
    formula_remap: dict[str, str] = {}       # duplicate formula → canonical formula

    for formula, data in enriched.items():
        cid = data.get("pubchemCid", 0)
        if not cid:
            continue
        if cid in cid_to_canonical:
            formula_remap[formula] = cid_to_canonical[cid]
        else:
            cid_to_canonical[cid] = formula

    if formula_remap:
        print(f"\n🔗  Merging {len(formula_remap)} duplicate(s):")
        for dup, canon in formula_remap.items():
            print(f"    {dup} → {canon}")
        enriched = {f: d for f, d in enriched.items() if f not in formula_remap}

    def canonical(formula: str) -> str:
        return formula_remap.get(formula, formula)

    # ── Build final reactions list (matching ReactionRule shape)
    reactions_final: list[dict] = []
    seen_reaction_keys: set[str] = set()

    for rxn in reactions_raw:
        reagent_ids = [
            enriched.get(canonical(f), {}).get("id", formula_to_id(f))
            for f in rxn["reagentsFormulas"]
        ]
        product_ids = [
            enriched.get(canonical(f), {}).get("id", formula_to_id(f))
            for f in rxn["productsFormulas"]
        ]

        # Canonical key: sorted reagents + sorted products, order-independent
        reaction_key = "+".join(sorted(reagent_ids)) + "->" + "+".join(sorted(product_ids))
        if reaction_key in seen_reaction_keys:
            continue
        seen_reaction_keys.add(reaction_key)

        primary_product = canonical(rxn["productsFormulas"][0]) if rxn["productsFormulas"] else ""

        reactions_final.append({
            # mirrors ReactionRule in reactions.tsx
            "reagents":    reagent_ids,
            "result":      enriched.get(primary_product, {}).get("id", formula_to_id(primary_product)),
            "resultLabel": enriched.get(primary_product, {}).get("label", primary_product),
            "resultInfo":  enriched.get(primary_product, {}).get("formula", primary_product),
            # extra fields for reference
            "products":    product_ids,
            "reactionKey": reaction_key,
            "equation":    " + ".join(rxn["reagentsFormulas"]) + " → " + " + ".join(rxn["productsFormulas"]),
            "latexSource": rxn["latexSource"],
        })

    # ── Filter out chemicals with no PubChem metadata
    enriched_upload = {f: d for f, d in enriched.items() if d.get("pubchemCid")}
    skipped = [d["formula"] for d in enriched.values() if not d.get("pubchemCid")]
    if skipped:
        print(f"\n⚠️   Skipping {len(skipped)} chemical(s) with no metadata: {', '.join(skipped)}")

    # Keep only reactions where every reagent and product has metadata
    upload_ids = {d["id"] for d in enriched_upload.values()}
    reactions_upload = [
        rxn for rxn in reactions_final
        if all(rid in upload_ids for rid in rxn["reagents"] + rxn["products"])
    ]
    dropped = len(reactions_final) - len(reactions_upload)
    if dropped:
        print(f"    Dropping {dropped} reaction(s) that reference missing chemicals")

    # ── Dry run: print and exit
    if dry_run:
        print("\n\n── DRY RUN: no data uploaded ──\n")
        print("CHEMICALS:")
        for chem in enriched_upload.values():
            print(f"  {chem}")
        print("\nREACTIONS:")
        for rxn in reactions_upload:
            print(f"  {rxn['equation']}")
        return

    # ── Check mode: query Firestore and show what would be skipped vs written
    if check:
        print("\n\n── CHECK: querying Firestore (no data written) ──\n")
        db = _init_firebase()

        existing_cids: dict[int, str] = {}
        for doc in db.collection("chemicals").stream():
            data = doc.to_dict()
            cid = data.get("pubchemCid", 0)
            if cid:
                existing_cids[cid] = doc.id

        existing_reaction_keys: set[str] = set()
        for doc in db.collection("reactions").stream():
            key = doc.to_dict().get("reactionKey", "")
            if key:
                existing_reaction_keys.add(key)

        print("CHEMICALS:")
        new_chems = skipped_chems = 0
        for _, data in enriched_upload.items():
            cid = data.get("pubchemCid", 0)
            if cid and cid in existing_cids:
                print(f"  ⏭ {data['id']:30s} (cid={cid} already exists as '{existing_cids[cid]}')")
                skipped_chems += 1
            else:
                print(f"  ✓ {data['id']:30s} (new)")
                new_chems += 1
        print(f"\n  → {new_chems} new, {skipped_chems} already in Firestore")

        print("\nREACTIONS:")
        new_rxns = skipped_rxns = 0
        for rxn in reactions_upload:
            key = rxn.get("reactionKey", "")
            if key in existing_reaction_keys:
                print(f"  ⏭ {rxn['equation'][:80]}")
                skipped_rxns += 1
            else:
                print(f"  ✓ {rxn['equation'][:80]}")
                new_rxns += 1
        print(f"\n  → {new_rxns} new, {skipped_rxns} already in Firestore")
        return

    # ── 6. Upload
    print("\n☁️   Uploading to Firestore...")
    upload_to_firestore(enriched_upload, reactions_upload)
    print(f"\n✅  Done — {len(enriched_upload)} chemicals, {len(reactions_upload)} reactions uploaded.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse chemistry Markdown → Firestore")
    parser.add_argument("md_file", help="Path to the Markdown file")
    parser.add_argument("--dry-run", action="store_true", help="Parse only, do not upload")
    parser.add_argument("--check",   action="store_true", help="Query Firestore and show what would be skipped vs written, without uploading")
    args = parser.parse_args()

    run(args.md_file, dry_run=args.dry_run, check=args.check)
