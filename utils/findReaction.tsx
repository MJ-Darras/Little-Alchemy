import { ReactionRule } from "@/hooks/useReactions";

export function findReaction(idA: string, idB: string, reactions: ReactionRule[]): ReactionRule | null {
    return (
        reactions.find((rule) => {
            const [r1, r2] = rule.reagents;
            return (r1 === idA && r2 === idB) || (r1 === idB && r2 === idA);
        }) ?? null
    );
}
