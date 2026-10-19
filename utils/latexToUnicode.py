from unicodeitplus import replace

import re

import requests

latex_string = r"2 \\mathrm{CH}_{3} \\mathrm{COOH}+\\mathrm{K}_{2} \\mathrm{CO}_{3} \\longrightarrow 2 \\mathrm{CH}_{3} \\mathrm{COOK}+\\mathrm{H}_{2} \\mathrm{O}+\\mathrm{CO}_{2}"

def clean_latex(latex_string: str) -> str:
    """
    Cleans a LaTeX string by:
    1. Converting double backslashes (\\\\) into single backslashes (\\).
    2. Removing both actual newlines/tabs and literal '\n'/'\t' sequences.
    3. Collapsing multiple spaces.
    4. Removing leading stoichiometric coefficients (numbers before compounds).
    """
    import re

    # Step 1: Replace double backslashes with single
    cleaned = latex_string.replace("\\\\", "\\")

    # Step 2: Remove actual newline/tab characters
    cleaned = cleaned.replace("\n", " ").replace("\t", " ")

    # Step 3: Remove literal '\n' and '\t' sequences (from raw strings)
    cleaned = cleaned.replace("\\n", " ").replace("\\t", " ")

    # Step 4: Collapse multiple spaces
    cleaned = re.sub(r"\s+", " ", cleaned).strip()

    # Step 5: Remove stoichiometric coefficients (numbers before chemical symbols)
    # Matches numbers followed by optional space and then a backslash or capital letter
    cleaned = re.sub(r'\b\d+\s*(?=(\\[A-Za-z]|[A-Z]))', '', cleaned)

    return cleaned



def latex_to_formula(latex: str):
    """
    Converts LaTeX chemical reaction into plain formula form.
    Splits into reagents and products lists.
    Subscripts are converted into normal digits (H2O).
    """
    # Remove \mathrm{} and \text{}
    latex = re.sub(r'\\mathrm\{([^}]*)\}', r'\1', latex)
    latex = re.sub(r'\\text\{([^}]*)\}', r'\1', latex)

    # Convert subscripts: _{digit} → digit
    latex = re.sub(r'_\{(\d+)\}', r'\1', latex)

    # Replace arrows with a delimiter
    latex = latex.replace("\\longrightarrow", "⟶").replace("\\rightarrow", "⟶")

    # Remove remaining LaTeX commands
    latex = re.sub(r'\\[a-zA-Z]+', '', latex)

    # Remove spaces
    latex = latex.replace(" ", "")

    # Split into reagents and products
    if "⟶" in latex:
        reagents, products = latex.split("⟶", 1)
        reagents_list = reagents.split("+")
        products_list = products.split("+")
        return reagents_list, products_list
    else:
        return [latex], []
    
def get_synonyms(cid):
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{cid}/synonyms/JSON"
    r = requests.get(url)

    if r.status_code != 200:
        return []

    return r.json()["InformationList"]["Information"][0]["Synonym"]

def extract_pubchem_info(data):
    compound = data["PC_Compounds"][0]
    props = compound.get("props", [])
    cid = compound["id"]["id"]["cid"]

    def get_prop(label, name=None):
        for p in props:
            urn = p.get("urn", {})
            if urn.get("label") == label:
                if name is None or urn.get("name") == name:
                    value = p.get("value", {})
                    return value.get("sval") or value.get("ival") or value.get("fval")
        return None

    synonyms = get_synonyms(cid)

    # 👇 take SECOND synonym (index 1)
    preferred_name = synonyms[0] if len(synonyms) > 1 else synonyms[1] if synonyms else None

    return {
        "cid": cid,
        "molecular_formula": get_prop("Molecular Formula"),
        "smiles": get_prop("SMILES", "Absolute"),
        "preferred_name": preferred_name
    }

def pubchem_lookup(formula):
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/formula/{formula}/JSON"
    r = requests.get(url)

    if r.status_code == 200:
        data = r.json()
        return extract_pubchem_info(data)

    # fallback to name search
    url = f"https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/{formula}/JSON"
    r = requests.get(url)

    if r.status_code == 200:
        data = r.json()
        return extract_pubchem_info(data)

    return None

def get_meta_data(chemicals):
    for chemical in chemicals:
        print(pubchem_lookup(chemical))
    return

unicode_text = replace(clean_latex(latex_string))

reagents, products = latex_to_formula(unicode_text)

print("Unicode:", unicode_text)

print("Formula:", reagents, products)

get_meta_data(reagents)

get_meta_data(products)

