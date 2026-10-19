import { ReactNode, useMemo, useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/WorkspaceContext";
import { useReactions } from "@/hooks/useReactions";

export type QuestionType = "identity" | "applications" | "formation" | "significance";

const QUESTION_LABELS: Record<QuestionType, string> = {
    identity: "What is it?",
    applications: "Applications",
    formation: "How it forms?",
    significance: "Why it matters?",
};

// bump this whenever prompts change to invalidate stale cached answers.
const CACHE_VERSION = "v1";

function getCacheKey(compoundId: string, questionType: QuestionType, isBaseElement: boolean,levelTitle?: string): string {
    // base elements use the natural-sources prompt under "formation", so tag separately.
    const variant = questionType === "formation" && isBaseElement ? "natural" : questionType;
    const scope = levelTitle ? `level:${levelTitle}` : "freeplay";
    return `chemical_info:${CACHE_VERSION}:${scope}:${compoundId}:${variant}`;
}

function readCache(key: string): string | null {
    if (typeof window === "undefined") return null;
    try {
        return localStorage.getItem(key);
    } catch {
        return null;
    }
}

function writeCache(key: string, value: string) {
    if (typeof window === "undefined") return;
    try {
        localStorage.setItem(key, value);
    } catch {
        // localStorage full or disabled, fail silently.
    }
}

// minimal **bold** renderer for inline labels inside each bullet.
function renderInlineBold(text: string): ReactNode {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
            return (
                <strong key={i} className="font-semibold text-primary">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        return <span key={i}>{part}</span>;
    });
}

// parses the model's bulleted response into a styled list.
function renderAnswer(answer: string): ReactNode {
    const lines = answer.split("\n").map((l) => l.trim()).filter(Boolean);
    const bullets = lines
        .filter((l) => l.startsWith("-") || l.startsWith("•"))
        .map((l) => l.replace(/^[-•]\s*/, ""));

    if (bullets.length === 0) {
        return <p className="text-sm text-gray-800 leading-relaxed">{answer}</p>;
    }

    return (
        <ul className="space-y-3">
            {bullets.map((b, i) => (
                <li key={i} className="text-sm text-gray-800 leading-relaxed pl-4 relative">
                    <span className="absolute left-0 top-0 text-primary">•</span>
                    {renderInlineBold(b)}
                </li>
            ))}
        </ul>
    );
}

export default function ChemicalChatbotPopup({ onClose }: { onClose: () => void }) {
    const { workspaceItems, chemicals, levelTitle, levelScenario } = useWorkspace();
    const { reactions } = useReactions();
    const [activeQuestion, setActiveQuestion] = useState<QuestionType | null>(null);
    const [answer, setAnswer] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const activeChemical = useMemo(() => {
    if (workspaceItems.length === 0) return null;

    // most recent item wins, regardless of whether it is a reaction
    // product or a raw sidebar pull. base elements get the natural sources fallback when the user clicks formation.
    const sorted = [...workspaceItems].sort((a, b) => parseInt(b.id) - parseInt(a.id));
    const latest = sorted[0];

    const chemical = chemicals.find((c) => c.id === latest.chemicalId);
    if (!chemical) return null;

    const rule = reactions.find((r) => r.result === latest.chemicalId);
    const formula = rule?.resultInfo;
    const reagents = rule
        ? rule.reagents
              .map((rid) => chemicals.find((c) => c.id === rid))
              .filter((c): c is NonNullable<typeof c> => Boolean(c))
              .map((c) => ({ label: c.label }))
        : undefined;

    return {
        id: chemical.id,
        label: chemical.label,
        formula,
        reagents,
        isBaseElement: !rule,
    };
    }, [workspaceItems, chemicals, reactions]);

    useEffect(() => {
        setActiveQuestion(null);
        setAnswer(null);
        setError(null);
    }, [activeChemical?.id]);

    async function handleQuestionClick(questionType: QuestionType) {
        if (!activeChemical || isLoading) return;

        setActiveQuestion(questionType);
        setError(null);

        const cacheKey = getCacheKey(activeChemical.id, questionType, activeChemical.isBaseElement,levelTitle);
        const cached = readCache(cacheKey);

        if (cached) {
            setAnswer(cached);
            return;
        }

        setAnswer(null);
        setIsLoading(true);

        try {
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    compoundId: activeChemical.id,
                    questionType,
                    label: activeChemical.label,
                    formula: activeChemical.formula,
                    reagents: activeChemical.reagents,
                    levelContext: levelTitle && levelScenario ? { title: levelTitle, scenario: levelScenario }: undefined,
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || "Failed to fetch answer.");
            }

            writeCache(cacheKey, data.answer);
            setAnswer(data.answer);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not load the answer.");
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="fixed right-6 bottom-24 z-50 flex h-[34rem] w-[26rem] flex-col overflow-hidden rounded-2xl border border-gray-200 bg-offWhite shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between bg-primary px-4 py-3">
                <div>
                    <p className="text-sm font-semibold text-offWhite">Chemical Info</p>
                    {activeChemical ? (
                        <p className="text-xs text-accent-light">
                            {activeChemical.label}
                            {activeChemical.formula ? ` (${activeChemical.formula})` : ""}
                        </p>
                    ) : (
                        <p className="text-xs text-accent-light">No chemical selected</p>
                    )}
                </div>
                <button
                    onClick={onClose}
                    className="rounded-md px-2 py-1 text-sm text-offWhite hover:bg-accent-dark"
                    aria-label="Close info panel"
                >
                    ✕
                </button>
            </div>

            {/* Question buttons */}
            <div className="grid grid-cols-2 gap-2 border-b border-gray-200 bg-white p-3">
                {(Object.keys(QUESTION_LABELS) as QuestionType[]).map((qt) => {
                    const label =
                        qt === "formation" && activeChemical?.isBaseElement
                            ? "Natural sources"
                            : QUESTION_LABELS[qt];
                    const isActive = activeQuestion === qt;
                    return (
                        <button
                            key={qt}
                            onClick={() => handleQuestionClick(qt)}
                            disabled={!activeChemical || isLoading}
                            className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                                isActive
                                    ? "border-primary bg-primary text-offWhite"
                                    : "border-gray-300 bg-white text-gray-700 hover:border-primary hover:text-primary"
                            } disabled:cursor-not-allowed disabled:opacity-50`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Answer area */}
            <div className="flex-1 overflow-y-auto bg-white p-4">
                {!activeChemical ? (
                    <p className="text-sm text-gray-500">
                        Drag a chemical to the canvas or craft something new to see information about it.
                    </p>
                ) : !activeQuestion ? (
                    <p className="text-sm text-gray-500">
                        Pick a question above to learn about {activeChemical.label}.
                    </p>
                ) : isLoading ? (
                    <p className="text-sm text-gray-500">Loading...</p>
                ) : error ? (
                    <p className="text-sm text-warning">{error}</p>
                ) : answer ? (
                    renderAnswer(answer)
                ) : null}
            </div>

            {/* Disclaimer */}
            <div className="border-t border-gray-200 bg-offWhite px-3 py-2">
                <p className="text-[10px] text-gray-500 text-center">
                    AI-generated. Verify before citing.
                </p>
            </div>
        </div>
    );
}