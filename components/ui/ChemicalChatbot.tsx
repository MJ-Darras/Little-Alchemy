"use client";

import { useState } from "react";
import ChemicalChatbotPopup from "./ChemicalChatbotPopup";

// Floating 'i' info button + popup wrapper.
export default function ChemicalChatbot() {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsOpen((prev) => !prev)}
                className="fixed right-6 bottom-6 z-50 flex h-12 w-12 items-center rounded-full bg-primary text-offWhite shadow-lg hover:bg-accent-dark transition-colors"
                aria-label={isOpen ? "Close info panel" : "Open info panel"}
            >
                <span className="ps-5 text-xl font-bold italic">i</span>
            </button>
            {isOpen ? <ChemicalChatbotPopup onClose={() => setIsOpen(false)} /> : null}
        </>
    );
}