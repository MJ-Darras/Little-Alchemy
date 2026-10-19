"use client";

import { useState } from "react";
import { useWorkspace } from "@/hooks/WorkspaceContext";
import { LEVELS } from "@/data/levels";
import { useRouter } from "next/navigation";

type Props = {
	levelId: string;
};

export default function LevelCompleteModal({ levelId }: Props) {
	const { isLevelComplete, levelGoals, chemicals } = useWorkspace();
	const router = useRouter();
	const [isDismissed, setIsDismissed] = useState(false);

	if (!isLevelComplete || isDismissed) return null;

	const currentIndex = LEVELS.findIndex((l) => l.id === levelId);
	const nextLevel = LEVELS[currentIndex + 1];

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl relative">
				<button 
					onClick={() => setIsDismissed(true)}
					className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
					aria-label="Close"
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M18 6L6 18"></path>
						<path d="M6 6l12 12"></path>
					</svg>
				</button>
				<h2 className="text-3xl font-bold text-primary text-center mb-1">Level Complete!</h2>
				<p className="text-gray-400 text-center text-sm mb-6">You synthesized all required compounds.</p>

				<div className="mb-6">
					<p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Produced</p>
					<div className="flex flex-col gap-2">
						{levelGoals?.map((goalId) => {
							const chemical = chemicals.find((c) => c.id === goalId);
							return (
								<div key={goalId} className="flex items-center gap-3 p-2.5 bg-accent-light rounded-lg">
									<span className="w-5 h-5 rounded-full bg-success flex items-center justify-center shrink-0">
										<svg width="12" height="12" viewBox="0 0 10 10" fill="none">
											<path
												d="M2 5l2 2 4-4"
												stroke="white"
												strokeWidth="1.5"
												strokeLinecap="round"
												strokeLinejoin="round"
											/>
										</svg>
									</span>
									<span className="text-sm font-medium text-gray-700">{chemical?.label ?? goalId}</span>
								</div>
							);
						})}
					</div>
				</div>

				<div className="flex gap-3">
					<button
						onClick={() => router.push("/levels")}
						className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
					>
						All Levels
					</button>
					{nextLevel ? (
						<button
							onClick={() => router.push(`/levels/${nextLevel.id}`)}
							className="flex-1 px-4 py-2.5 bg-primary rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity cursor-pointer"
						>
							Next Level
						</button>
					) : (
						<button
							onClick={() => router.push("/")}
							className="flex-1 px-4 py-2.5 bg-primary rounded-lg text-sm font-medium text-white hover:opacity-90 transition-opacity cursor-pointer"
						>
							Home
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
     