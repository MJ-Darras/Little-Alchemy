"use client";

import { useRouter } from "next/navigation";
import { LEVELS } from "@/data/levels";
import { useChemicals } from "@/hooks/useChemicals";

export default function LevelsPage() {
	const router = useRouter();
	const { chemicals } = useChemicals();

	return (
		<div className="min-h-screen bg-offWhite">
			<div className="max-w-3xl mx-auto px-6 py-12">
				<div className="mb-8">
					<button
						onClick={() => router.push("/")}
						className="pb-4 text-[13px] text-accent-light-grey hover:text-primary transition-colors inline-block cursor-pointer"
					>
						Back
					</button>
					<h1 className="text-4xl font-bold text-primary">Levels</h1>
					<p className="text-gray-500 mt-2 text-sm">
						Complete each challenge by synthesizing the required compounds from a limited set of elements.
					</p>
				</div>

				<div className="flex flex-col gap-4">
					{LEVELS.map((level, index) => {
						const goalChemicals = level.goalChemicalIds
							.map((id) => chemicals.find((c) => c.id === id))
							.filter(Boolean);

						return (
							<div
								key={level.id}
								onClick={() => router.push(`/levels/${level.id}`)}
								className="bg-white rounded-xl p-5 border border-gray-200 hover:border-primary hover:shadow-md cursor-pointer transition-all group"
							>
								<div className="flex items-start justify-between gap-4">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											<span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">
												Level {index + 1}
											</span>
										</div>
										<h2 className="text-base font-semibold text-gray-800 mb-1">{level.title}</h2>
										<p className="text-xs text-gray-500 leading-relaxed line-clamp-2">{level.scenario}</p>
									</div>
									<span className="text-gray-300 group-hover:text-primary transition-colors text-lg shrink-0 mt-1">
										
									</span>
								</div>

								<div className="mt-4 pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
									<span className="text-xs text-gray-400">Synthesize:</span>
									{goalChemicals.map(
										(c) =>
											c && (
												<span
													key={c.id}
													className="text-xs bg-accent-light text-primary px-2 py-0.5 rounded-full font-medium"
												>
													{c.label}
												</span>
											)
									)}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
