"use client";

import { useRef, useEffect } from "react";

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SmilesDrawer: any;
  }
}

// Tailwind class → hex for the canvas background (must match the div bg)
const CATEGORY: Record<string, { cls: string; hex: string; bonds: string }> = {
  "Metal":          { cls: "bg-gray-200",    hex: "#e5e7eb", bonds: "#1f2937" },
  "Gas":            { cls: "bg-sky-200",     hex: "#bae6fd", bonds: "#0c4a6e" },
  "Acid":           { cls: "bg-red-200",     hex: "#fecaca", bonds: "#7f1d1d" },
  "Base":           { cls: "bg-purple-200",  hex: "#e9d5ff", bonds: "#3b0764" },
  "Compound":       { cls: "bg-teal-200",    hex: "#99f6e4", bonds: "#134e4a" },
  "Alloy":          { cls: "bg-amber-200",   hex: "#fde68a", bonds: "#78350f" },
  "Noble Gas":      { cls: "bg-pink-200",    hex: "#fbcfe8", bonds: "#831843" },
  "Non-metal":      { cls: "bg-yellow-200",  hex: "#fef08a", bonds: "#713f12" },
  "Salt":           { cls: "bg-slate-200",   hex: "#e2e8f0", bonds: "#1e293b" },
  "Ionic Compound": { cls: "bg-slate-200",   hex: "#e2e8f0", bonds: "#1e293b" },
  "Mineral":        { cls: "bg-stone-300",   hex: "#d6d3d1", bonds: "#1c1917" },
  "Drug":           { cls: "bg-emerald-200", hex: "#a7f3d0", bonds: "#064e3b" },
  "Hydrocarbon":    { cls: "bg-orange-200",  hex: "#fed7aa", bonds: "#7c2d12" },
  "Toxic Gas":      { cls: "bg-violet-200",  hex: "#ddd6fe", bonds: "#2e1065" },
  "Oxide":          { cls: "bg-orange-300",  hex: "#fdba74", bonds: "#431407" },
  "Ion":            { cls: "bg-indigo-200",  hex: "#c7d2fe", bonds: "#1e1b4b" },
  "Ceramic":        { cls: "bg-slate-300",   hex: "#cbd5e1", bonds: "#0f172a" },
  "Lipid":          { cls: "bg-lime-200",    hex: "#d9f99d", bonds: "#1a2e05" },
  "Sugar":          { cls: "bg-rose-200",    hex: "#fecdd3", bonds: "#4c0519" },
  "Metalloid":      { cls: "bg-cyan-200",    hex: "#a5f3fc", bonds: "#083344" },
};

const DEFAULT = { cls: "bg-gray-100", hex: "#f3f4f6", bonds: "#1f2937" };

const W = 72;
const H = 52;

export function SmilesBadge({
  smiles,
  formula,
  category,
}: {
  smiles: string;
  formula: string;
  category: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const theme = CATEGORY[category] ?? DEFAULT;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window === "undefined" || !window.SmilesDrawer) return;
    if (!smiles) return;

    const drawer = new window.SmilesDrawer.Drawer({
      width: W,
      height: H,
      bondLength: 14,
      padding: 6,
      themes: {
        badge: {
          C:          theme.bonds,
          O:          "#b91c1c",
          N:          "#1d4ed8",
          F:          "#15803d",
          CL:         "#15803d",
          BR:         "#92400e",
          I:          "#6d28d9",
          P:          "#c2410c",
          S:          "#a16207",
          B:          "#b45309",
          SI:         "#4b5563",
          H:          "#9ca3af",
          background: theme.hex,
          bonds:      theme.bonds,
        },
      },
    });

    window.SmilesDrawer.parse(
      smiles,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (tree: any) => { drawer.draw(tree, canvas, "badge", false); },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (err: any)  => { console.warn("SmilesBadge:", err); }
    );
  }, [smiles, theme.hex, theme.bonds]);

  // Alloys / no SMILES: formula text fallback
  if (!smiles) {
    return (
      <div
        className={`inline-flex items-center justify-center shrink-0 rounded font-mono text-xs font-bold ${theme.cls}`}
        style={{ width: W, height: H, color: theme.bonds }}
      >
        {formula || "—"}
      </div>
    );
  }

  return (
    <div
      className={`shrink-0 rounded overflow-hidden ${theme.cls}`}
      style={{ width: W, height: H }}
    >
      <canvas ref={canvasRef} width={W} height={H} />
    </div>
  );
}
