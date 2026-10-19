"use client";

import { useEffect, useRef } from "react";
import { ChemicalCardProps } from "./Chemicals/ChemicalCard";
import { useChemicals } from "@/hooks/useChemicals";

export type MetadataMenuState = {
    chemical: ChemicalCardProps;
    x: number;
    y: number;
};

type Props = {
    state: MetadataMenuState;
    onClose: () => void;
};

export default function ChemicalMetadataMenu({ state, onClose }: Props) {
    const menuRef = useRef<HTMLDivElement>(null);
    const { chemicals: firestoreChemicals } = useChemicals();
    const data = firestoreChemicals.find((c) => c.id === state.chemical.id);

    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        }
        function handleKey(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }
        function handleScroll() { onClose(); }

        document.addEventListener("mousedown", handleOutsideClick);
        document.addEventListener("keydown", handleKey);
        window.addEventListener("scroll", handleScroll, true);

        return () => {
            document.removeEventListener("mousedown", handleOutsideClick);
            document.removeEventListener("keydown", handleKey);
            window.removeEventListener("scroll", handleScroll, true);
        };
    }, [onClose]);

    const MENU_WIDTH = 240;
    const MENU_ESTIMATED_HEIGHT = 220;
    const clampedX = Math.min(state.x, window.innerWidth - MENU_WIDTH - 8);
    const clampedY = Math.min(state.y, window.innerHeight - MENU_ESTIMATED_HEIGHT - 8);

    // To remove a field, just delete its line below
    const fields: { term: string; value: string | number | undefined; mono?: boolean }[] = [
        { term: "id",        value: data?.id },
        { term: "label",     value: data?.label },
        { term: "info",      value: data?.info },
        { term: "formula",   value: data?.formula,    mono: true },
        { term: "smiles",    value: data?.smiles,     mono: true },
        { term: "pubchemId", value: data?.pubchemCid, mono: true },
    ];

    return (
        <div
            ref={menuRef}
            style={{ position: "fixed", left: clampedX, top: clampedY, width: MENU_WIDTH }}
            className="z-50 rounded-lg border border-gray-200 bg-white shadow-2xl"
            role="menu"
            aria-label="Chemical metadata"
        >
            <div className="border-b border-gray-200 px-3 py-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Metadata</p>
            </div>
            <dl className="px-3 py-2 text-xs">
                {fields.map(({ term, value, mono }) =>
                    value !== undefined && value !== "" ? (
                        <MetadataRow key={term} term={term} value={String(value)} mono={mono} />
                    ) : null
                )}
            </dl>
        </div>
    );
}

function MetadataRow({ term, value, mono = false }: { term: string; value: string; mono?: boolean }) {
    return (
        <div className="flex gap-3 py-1.5 border-b border-gray-100 last:border-0">
            <dt className="text-gray-400 w-16 shrink-0">{term}</dt>
            <dd className={`flex-1 text-gray-800 break-all ${mono ? "font-mono" : ""}`}>{value}</dd>
        </div>
    );
}
