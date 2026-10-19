"use client";

const CATEGORY_COLORS: Record<string, string> = {
  "Metal":          "bg-gray-300 text-gray-800",
  "Gas":            "bg-sky-200 text-sky-800",
  "Acid":           "bg-red-200 text-red-800",
  "Base":           "bg-purple-200 text-purple-800",
  "Compound":       "bg-teal-200 text-teal-800",
  "Alloy":          "bg-amber-200 text-amber-800",
  "Noble Gas":      "bg-pink-200 text-pink-800",
  "Non-metal":      "bg-yellow-200 text-yellow-800",
  "Salt":           "bg-slate-200 text-slate-700",
  "Ionic Compound": "bg-slate-200 text-slate-700",
  "Mineral":        "bg-stone-300 text-stone-800",
  "Drug":           "bg-emerald-200 text-emerald-800",
  "Hydrocarbon":    "bg-orange-200 text-orange-800",
  "Toxic Gas":      "bg-violet-200 text-violet-800",
  "Oxide":          "bg-orange-300 text-orange-900",
  "Ion":            "bg-indigo-200 text-indigo-800",
  "Ceramic":        "bg-slate-300 text-slate-800",
  "Lipid":          "bg-lime-200 text-lime-800",
  "Sugar":          "bg-rose-200 text-rose-800",
  "Metalloid":      "bg-cyan-200 text-cyan-800",
};

function renderFormula(formula: string) {
  const parts = formula.match(/[A-Za-z()[\]+⁺⁻]+|\d+/g) ?? [formula];
  return parts.map((part, i) =>
    /^\d+$/.test(part)
      ? <sub key={i} className="text-[0.55rem] leading-none">{part}</sub>
      : <span key={i}>{part}</span>
  );
}

export function FormulaPreview({ formula, category }: { formula: string; category: string }) {
  const colors = CATEGORY_COLORS[category] ?? "bg-gray-200 text-gray-700";
  return (
    <div className={`inline-flex items-center justify-center shrink-0 rounded px-1.5 h-6 min-w-[2rem] font-mono text-xs font-bold leading-none ${colors}`}>
      {renderFormula(formula)}
    </div>
  );
}
