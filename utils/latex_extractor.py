import re
import json
import sys
import os

def extract_latex_from_file(input_file: str, output_file: str = None):
    # Read the file content
    with open(input_file, "r", encoding="utf-8") as f:
        content = f.read()

    # Regex to capture anything between $...$ or $$...$$
    # Explanation:
    #   \${1,2}   → match one or two dollar signs
    #   (.*?)     → capture everything inside (non-greedy)
    #   \${1,2}   → closing one or two dollar signs
    pattern = r"\${1,2}(.*?)\${1,2}"
    matches = re.findall(pattern, content, re.DOTALL)

    # Prepare JSON data
    data = {"latex_expressions": matches}

    # Default output filename if not provided
    if output_file is None:
        base, _ = os.path.splitext(input_file)
        output_file = base + "_latex.json"

    # Write to JSON file
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4)

    print(f"Extracted {len(matches)} LaTeX expressions.")
    print(f"Results saved to {output_file}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python latex_parser.py <input_markdown_file> [output_json_file]")
        sys.exit(1)

    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None

    extract_latex_from_file(input_file, output_file)
