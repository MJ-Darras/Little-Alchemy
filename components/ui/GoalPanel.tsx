"use client";

import { useWorkspace } from "@/hooks/WorkspaceContext";
import { LEVELS } from "@/data/levels";

export default function GoalPanel() {
	const { levelGoals, completedGoals, chemicals } = useWorkspace();

	if (!levelGoals) return null;

	const currentLevel = LEVELS.find(
		(l) => l.goalChemicalIds.length === levelGoals.length && l.goalChemicalIds.every((id, i) => id === levelGoals[i])
	);

	return (
		<div className="px-4 py-3 border-t border-gray-200">
		<p className="text-xs font-semibold text-black uppercase tracking-widest mb-2">Goals</p>
			<div className="flex flex-col gap-2">
				{levelGoals.map((goalId, index) => {
					const chemical = chemicals.find((c) => c.id === goalId);
					const isDone = completedGoals.includes(goalId);
					const role = currentLevel?.goalChemicalRoles?.[index];

					return (
						<div
							key={goalId}
							className={`flex-col items-center py-2 text-sm transition-colors font-bold ${isDone ? "text-success" : "text-accent-dark"}`}
						>
							<div
								className={`flex items-center gap-2.5 text-sm transition-colors ${isDone ? "text-success" : "text-accent-dark"}`}
							>
							
								<span
									className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
										isDone ? "border-success bg-success" : "border-gray-300"
									}`}
								>
									{isDone && (
										<svg width="10" height="10" viewBox="0 0 10 10" fill="none">
											<path
												d="M2 5l2 2 4-4"
												stroke="white"
												strokeWidth="1.5"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									)}
								</span>
								<span className={isDone ? "line-through opacity-60" : ""}>{chemical?.label ?? goalId}</span>
							</div>
							<div className="pl-[26px] mt-1 text-xs font-medium italic opacity-80">{role ?? chemical?.info}</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}
