import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export type QuestionType = "identity" | "applications" | "formation" | "significance";

const PROMPTS: Record<QuestionType, string> = {
    identity: `You are explaining chemistry to a first or second-year undergraduate. Your primary audience is chemistry students, but a motivated non-chemistry undergraduate should also follow the gist. Use precise technical terminology, but always provide enough context that the meaning is recoverable from the sentence itself.
                Return exactly 4 bullet points using this structure:
                - Formula and mass: molecular formula with molar mass in g/mol
                - Bonding: bond type with brief electronegativity or polarity context
                - Structure: geometry, hybridization, or key functional group, named and briefly explained
                - Defining behavior: the single property that most determines how this compound reacts (pKa, oxidation state of central atom, dipole moment, unusual phase behavior)

                Format each bullet as: - **Label:** content
                Each bullet 30 to 40 words. No em-dashes, no semicolons. Regular hyphens in chemistry terms are fine. No filler phrases like "this compound is" or "it should be noted."`,

    applications: `You are explaining chemistry to a first or second-year undergraduate. Your primary audience is chemistry students, but a motivated non-chemistry undergraduate should also follow the gist.
                    Return 3 to 4 bullet points covering distinct application domains. Each bullet must name a specific process, reaction, or context. Name the industrial process (Haber-Bosch, Contact, Ostwald, Solvay, etc.) when applicable. Where useful, give a number that sharpens the point (scale, concentration, temperature).
                    Format each bullet as: - **Label:** content
                    Each bullet 30 to 40 words. Define a process name briefly the first time you use it so a non-chemist can still follow. No em-dashes, no semicolons.`,

    formation:      `You are explaining chemistry to a first or second-year undergraduate. Your primary audience is chemistry students, but a motivated non-chemistry undergraduate should also follow the gist.

                    Return exactly 4 bullet points using this structure:
                    - Reaction type: name the class (redox, acid-base, condensation, addition, etc.) with a one-phrase explanation of what defines that class
                    - Equation: balanced equation with physical states, plus enthalpy change if commonly cited
                    - Mechanism: what happens to the electrons. Name oxidation state changes, electron transfers, or new bonds being formed
                    - Driving force: the thermodynamic or structural reason this reaction is favorable (lattice energy, bond enthalpy, entropy, stability of product)

                    Format each bullet as: - **Label:** content
                    Each bullet 30 to 40 words. No em-dashes, no semicolons.`,

    significance: `You are explaining chemistry to a first or second-year undergraduate. Your primary audience is chemistry students, but a motivated non-chemistry undergraduate should also follow the gist.
                    Return 3 to 4 bullet points explaining why this compound matters. Cover distinct angles such as biological role, industrial impact, historical importance in the development of chemistry, or position in a broader reaction network. Each bullet must be specific. Avoid platitudes like "important for many reasons" or "used in many industries."
                    Format each bullet as: - **Label:** content
                    Each bullet 30 to 40 words. No em-dashes, no semicolons.`,
};

// fallback prompt for base elements (no matching ReactionRule). swaps in when the user clicks "Formation" on something like Iron or Hydrogen.
const NATURAL_SOURCES_PROMPT = `You are explaining chemistry to a first or second-year undergraduate. Your primary audience is chemistry students, but a motivated non-chemistry undergraduate should also follow the gist.

                                The user is asking where this element comes from in nature and how it is obtained. Return exactly 4 bullet points using this structure:
                                - Natural occurrence: where this element is found in nature (atmosphere, ores, ocean, biosphere) and its rough abundance
                                - Extraction method: the dominant industrial process for isolating it (electrolysis, fractional distillation, smelting, mining, etc.) named and briefly explained
                                - Purity considerations: what form it exists in raw versus what purification is needed for common applications
                                - Notable source locations: countries or geological contexts that dominate production, if applicable, or distinguishing characteristics of where it accumulates

                                Format each bullet as: - **Label:** content

                                Each bullet 30 to 40 words. No em-dashes, no semicolons.`;

type Reagent = { label: string; formula?: string };

export type LevelContext = {
    title: string;
    scenario: string;
};

type RequestBody = {
    compoundId: string;
    questionType: QuestionType;
    label: string;
    formula?: string;
    reagents?: Reagent[];
    levelContext?: LevelContext;
};

function buildLevelContextSuffix(ctx: LevelContext): string {
    // appended to the system prompt when the user is in level mode.
    // "frame your answer" rather than "constrain your answer" — soft
    // framing avoids the model refusing to answer when the chemistry
    // doesn't cleanly fit the scenario.
    return `Additional context: The user is playing a level titled "${ctx.title}" with the following scenario:"${ctx.scenario}"
            Make sure you frame your answer in the context of this scenario , pick examples, applications, and angles that connect to it while still answering the given prompt.
            Do not change the structural format of your answer.`;
}



function buildUserMessage(body: RequestBody, isBaseElement: boolean): string {
    const formulaPart = body.formula ? ` (${body.formula})` : "";
    const base = `Compound: ${body.label}${formulaPart}`;

    if (body.questionType === "formation") {
        if (isBaseElement) {
            return `Element: ${body.label}${formulaPart}. Where does it come from in nature and how is it obtained?`;
        }
        const reagentsText = body.reagents
            ?.map((r) => `${r.label}${r.formula ? ` (${r.formula})` : ""}`)
            .join(" + ");
        return `${base}. Formed from: ${reagentsText}.`;
    }

    return base;
}

function getSystemPrompt(questionType: QuestionType, isBaseElement: boolean, levelContext?: LevelContext): string {
    const base = questionType === "formation" && isBaseElement ? NATURAL_SOURCES_PROMPT : PROMPTS[questionType];
    return levelContext ? base + buildLevelContextSuffix(levelContext) : base;
}

function getTextFromMessage(message: { content: Array<{ type: string; text?: string }> }): string {
    return message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text ?? "")
        .join("")
        .trim();
}

export async function POST(request: Request) {
    try {
        if (!process.env.ANTHROPIC_API_KEY) {
            return NextResponse.json({ error: "ANTHROPIC_API_KEY is missing." }, { status: 500 });
        }

        const body: RequestBody = await request.json();

        if (!body.compoundId || !body.questionType || !body.label) {
            return NextResponse.json(
                { error: "compoundId, questionType, and label are required." },
                { status: 400 }
            );
        }

        if (!(body.questionType in PROMPTS)) {
            return NextResponse.json({ error: "Invalid questionType." }, { status: 400 });
        }

        // base element = no reagents passed (the popup signals this by omitting reagents)
        const isBaseElement =
            body.questionType === "formation" && (!body.reagents || body.reagents.length === 0);

        const message = await anthropic.messages.create({
            model: MODEL,
            max_tokens: 600,
            temperature: 0,
            system: getSystemPrompt(body.questionType, isBaseElement, body.levelContext),
            messages: [
                {
                    role: "user",
                    content: buildUserMessage(body, isBaseElement),
                },
            ],
        });

        const answer = getTextFromMessage(message);

        return NextResponse.json({ answer });
    } catch (error) {
        console.error("Chat API error:", error);
        return NextResponse.json(
            { error: "Something went wrong while contacting Claude." },
            { status: 500 }
        );
    }
}