"use client";
import { useMemo, useState } from "react";
import ChemicalCard from "@/components/ui/Chemicals/ChemicalCard";
import { FormulaPreview } from "@/components/ui/Chemicals/FormulaPreview";
import WorkspaceCanvas from "@/components/ui/WorkspaceCanvas";
import WorkspaceProvider from "@/hooks/WorkspaceContext";
import ChemicalChatbot from "@/components/ui/ChemicalChatbot";
import { useChemicals } from "@/hooks/useChemicals";
import { useRouter } from "next/navigation";

const SEARCH_THRESHOLD = 10;

export default function ExperimentEnvironment() {
	const router = useRouter();
	const { chemicals: firestoreChemicals } = useChemicals();
	const [searchQuery, setSearchQuery] = useState("");

	const sidebarChemicals = useMemo(
		() =>
			firestoreChemicals
				.filter((c) => c.isElement)
				.map((c) => ({
					id:      c.id,
					label:   c.label,
					info:    c.info,
					preview: <FormulaPreview formula={c.formula || c.id} category={c.info} />,
				})),
		[firestoreChemicals]
	);

	const allChemicals = useMemo(
		() =>
			firestoreChemicals.map((c) => ({
				id:      c.id,
				label:   c.label,
				info:    c.info,
				preview: <FormulaPreview formula={c.formula || c.id} category={c.info} />,
			})),
		[firestoreChemicals]
	);

	const filteredChemicals = useMemo(() => {
		const q = searchQuery.trim().toLowerCase();
		if (!q) return sidebarChemicals;
		return sidebarChemicals.filter((c) => {
			const tokens = `${c.label} ${c.info}`.toLowerCase().split(/\s+/);
			return tokens.some((token) => token.startsWith(q));
		});
	}, [searchQuery, sidebarChemicals]);

	const showSearch = sidebarChemicals.length > SEARCH_THRESHOLD;

	return (
		<WorkspaceProvider chemicals={allChemicals}>
			<div className="flex w-full h-screen">
				{/* Sidebar */}
				<div className="flex flex-col w-90 h-screen bg-offWhite border-r border-gray-200 shrink-0 overflow-y-auto overflow-x-hidden">
					<div className="flex-1 relative">
						<div className="sticky top-0 bg-offWhite z-10 pb-2">
							<button
								onClick={() => router.push("/")}
								className="text-sm px-4 pt-4 text-accent-light-grey hover:text-primary transition-colors mb-4 inline-block cursor-pointer"
							>
								Back
							</button>
							<p className="px-4 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-widest">
								Chemical Objects
							</p>

							{showSearch ? (
								<div className="px-3">
									<input
										type="text"
										value={searchQuery}
										onChange={(e) => setSearchQuery(e.target.value)}
										placeholder="Search by name or category..."
										className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-primary"
										aria-label="Search chemicals"
									/>
								</div>
							) : null}
						</div>

						<div className="flex flex-col gap-2 px-3">
							{filteredChemicals.map(({ id, label, preview, info }) => (
								<ChemicalCard id={id} key={id} label={label} preview={preview} info={info} source="sidebar" />
							))}
						</div>
					</div>
				</div>
				{/* canvas component */}
				<WorkspaceCanvas />
			</div>
			<ChemicalChatbot />
		</WorkspaceProvider>
	);
}
