"use client";

import { useRouter } from "next/navigation";
import { Level, LEVELS } from "@/data/levels";
import { useChemicals, ChemicalData } from "@/hooks/useChemicals";
import { FormulaPreview } from "@/components/ui/Chemicals/FormulaPreview";
import { ChemicalCardProps } from "@/components/ui/Chemicals/ChemicalCard";
import WorkspaceProvider from "@/hooks/WorkspaceContext";
import WorkspaceCanvas from "@/components/ui/WorkspaceCanvas";
import ChemicalCard from "@/components/ui/Chemicals/ChemicalCard";
import GoalPanel from "@/components/ui/GoalPanel";
import LevelCompleteModal from "@/components/ui/LevelCompleteModal";
import ChemicalChatbot from "@/components/ui/ChemicalChatbot";

type Props = {
	level: Level;
};

function toCardProps(c: ChemicalData): ChemicalCardProps {
	return {
		id:      c.id,
		label:   c.label,
		info:    c.info,
		preview: <FormulaPreview formula={c.formula || c.id} category={c.info} />,
	};
}

export default function LevelEnvironment({ level }: Props) {
	const router = useRouter();
	const levelIndex = LEVELS.findIndex((l) => l.id === level.id);

	const { chemicals: firestoreChemicals } = useChemicals();

	const allChemicals: ChemicalCardProps[] = firestoreChemicals.map(toCardProps);

	const availableChemicals = allChemicals.filter((c) =>
		level.availableChemicalIds.includes(c.id)
	);

	return (
		<WorkspaceProvider chemicals={allChemicals} levelGoals={level.goalChemicalIds} levelTitle={level.title} levelScenario={level.scenario}>
			<LevelCompleteModal levelId={level.id} />
			<div className="flex w-full h-screen">
				{/* Sidebar */}
				<div className="flex flex-col w-90 bg-offWhite border-r border-gray-200 overflow-y-auto overflow-x-hidden">
					{/* Header */}
					<div className="px-4 pt-4 pb-2 border-b border-gray-200">
						<button
							onClick={() => router.push("/levels")}
							className="text-xs text-accent-light-grey hover:text-primary transition-colors inline-block cursor-pointer"
						>
							Back
						</button>
						<p className="text-xs pt-6 font-semibold text-primary uppercase tracking-widest">
							Level {levelIndex + 1}
						</p>
						<h1 className="font-semibold uppercase text-primary">{level.title}</h1>
					</div>

					{/* Scenario */}
					<div className="px-4 py-3 border-b border-gray-200">
						<p className="text-xs font-semibold text-black uppercase tracking-widest mb-2">Scenario</p>
						<p className="text-xs text-accent-dark leading-relaxed">{level.scenario}</p>
					</div>

					{/* Available chemicals */}
					<div className="px-4 pt-3 pb-2">
						<p className="text-xs font-semibold text-black uppercase tracking-widest mb-2">
							Available Elements
						</p>
						<div className="flex flex-col gap-2">
							{availableChemicals.map(({ id, label, preview, info }) => (
								<ChemicalCard key={id} id={id} label={label} preview={preview} info={info} source="sidebar" />
							))}
						</div>
					</div>

					{/* Goals */}
					<GoalPanel />
				</div>

				{/* Canvas */}
				<WorkspaceCanvas />
			</div>
			<ChemicalChatbot />
		</WorkspaceProvider>
	);
}
