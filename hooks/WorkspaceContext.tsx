"use client";

import { ReactNode, useEffect, useRef, useState, useMemo, createContext, useContext } from "react";
import { DragEndEvent, DndContext, DragOverlay, rectIntersection } from "@dnd-kit/core";
import ChemicalCard, { ChemicalCardProps } from "@/components/ui/Chemicals/ChemicalCard";
import { findReaction } from "@/utils/findReaction";
import { useReactions } from "@/hooks/useReactions";
import { MetadataMenuState } from "@/components/ui/ChemicalMetadataMenu";

export type WorkspaceItem = Omit<ChemicalCardProps, "preview"> & {
	x: number;
	y: number;
	chemicalId: string;
};

type WorkspaceContextValue = {
	workspaceItems: WorkspaceItem[];
	activeItem: ChemicalCardProps | null;
	canvasNodeRef: React.RefObject<HTMLDivElement | null>;
	chemicals: ChemicalCardProps[];
	clearWorkspace: () => void;
	levelGoals: string[] | undefined;
    levelTitle: string | undefined;
    levelScenario: string | undefined;
	completedGoals: string[];
	isLevelComplete: boolean;
	metadataMenu: MetadataMenuState | null;
    setMetadataMenu: (state: MetadataMenuState | null) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function useWorkspace() {
	const context = useContext(WorkspaceContext);
	if (!context) throw new Error("useWorkspace must be used inside <WorkspaceProvider>");
	return context;
}

const STORAGE_KEY = "workspace_items";

export default function WorkspaceProvider({
	children,
	chemicals,
	levelGoals,
    levelTitle,
    levelScenario
}: {
	children: ReactNode;
	chemicals: ChemicalCardProps[];
	levelGoals?: string[];
	levelTitle?: string;
    levelScenario?: string;
}) {
	const isLevelMode = levelGoals !== undefined;
	const { reactions } = useReactions();
	const [activeItem, setActiveItem] = useState<ChemicalCardProps | null>(null);
	const canvasNodeRef = useRef<HTMLDivElement>(null);
	const [metadataMenu, setMetadataMenu] = useState<MetadataMenuState | null>(null);

	const [workspaceItems, setWorkspaceItems] = useState<WorkspaceItem[]>([]);
	const [hasHydrated, setHasHydrated] = useState(false);

	// load from localStorage after first client render. 
	// Doing this in a useEffect rather than useState's lazy initializer avoids hydration mismatch
	// Server renders [] and the client matches, then this effect populates the real state.
	useEffect(() => {
		if (isLevelMode) {
			setHasHydrated(true);
			return;
		}
		try {
			const stored = localStorage.getItem(STORAGE_KEY);
			if (stored) {
				setWorkspaceItems(JSON.parse(stored));
			}
		} catch {
			console.log("Failed to restore workspace from localStorage");
		}
		setHasHydrated(true);
		// we intentionally want this to run only once on mount.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	useEffect(() => {
		if (isLevelMode) return;
		if (!hasHydrated) return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(workspaceItems));
		} catch {
			console.log("Failed to save workspace to localstorage");
		}
	}, [workspaceItems, isLevelMode, hasHydrated]);

	const completedGoals = useMemo(() => {
		if (!levelGoals) return [];
		return levelGoals.filter((goalId) => workspaceItems.some((item) => item.chemicalId === goalId));
	}, [levelGoals, workspaceItems]);

	const isLevelComplete =
		levelGoals !== undefined ? levelGoals.length > 0 && completedGoals.length === levelGoals.length : false;

	function clearWorkspace() {
		setWorkspaceItems([]);
	}

	function handleDragEnd(event: DragEndEvent) {
		const { active, over, delta } = event;
		const source = active.data.current?.source as "sidebar" | "canvas" | undefined;
		const bounds = canvasNodeRef.current?.getBoundingClientRect() ?? null;

		const droppedOnChemical = over?.data.current?.target === "chemical" && over.data.current?.id !== active.id;

		if (droppedOnChemical) {
			const targetId = over!.data.current!.id as string;
			const draggedItemData = active.data.current?.item as ChemicalCardProps | undefined;
			const draggedId = source === "canvas" ? (active.id as string) : undefined;
			
			const targetItem = workspaceItems.find((i) => i.id === targetId);
			const draggedChemicalId = source === "canvas" ? workspaceItems.find((i) => i.id === draggedId)?.chemicalId : draggedItemData?.id;

			if (targetItem && draggedChemicalId) {
				const reaction = findReaction(draggedChemicalId, targetItem.chemicalId, reactions);
				
				if (reaction) {
					setWorkspaceItems((prev) => {
						const resultItem: WorkspaceItem = {
							id: Date.now().toString(),
							chemicalId: reaction.result,
							label: reaction.resultLabel,
							info: reaction.resultInfo ?? "",
							source: "canvas",
							x: targetItem.x,
							y: targetItem.y,
						};
						return [...prev.filter((i) => i.id !== draggedId && i.id !== targetId), resultItem];
					});
					setActiveItem(null);
					return;
				}
			}
		}

		if (source === "sidebar") {
			if (!bounds) return;
			
			let x = 0;
			let y = 0;

			if (active.rect.current.translated) {
				x = active.rect.current.translated.left - bounds.left;
				y = active.rect.current.translated.top - bounds.top;
			} else {
				const activatorEvent = event.activatorEvent as PointerEvent;
				x = (activatorEvent.clientX || 0) - bounds.left + delta.x;
				y = (activatorEvent.clientY || 0) - bounds.top + delta.y;
			}

			if (x < 0) {
				setActiveItem(null);
				return;
			}

			const draggedItem = active.data.current?.item as ChemicalCardProps | undefined;
			if (!draggedItem) return;

			const clampedX = Math.min(x, bounds.width);
			const clampedY = Math.max(0, Math.min(y, bounds.height));

			setWorkspaceItems((prev) => [
				...prev,
				{
					id: Date.now().toString(),
					chemicalId: draggedItem.id,
					label: draggedItem.label,
					info: draggedItem.info,
					source: "canvas",
					x: clampedX,
					y: clampedY,
				},
			]);
		} else if (source === "canvas") {
			setWorkspaceItems((prev) => {
				const item = prev.find((i) => i.id === active.id);
				if (!item) return prev;
				const newX = item.x + delta.x;
				const newY = item.y + delta.y;
				if (newX < 0) return prev.filter((i) => i.id !== active.id);
				const clampedX = bounds ? Math.min(newX, bounds.width) : newX;
				const clampedY = bounds ? Math.max(0, Math.min(newY, bounds.height)) : newY;
				const refreshedId = Date.now().toString();
				return prev.map((i) =>i.id === active.id
						? { ...i, id: refreshedId, x: clampedX, y: clampedY }
						: i
				);
			});
		}

		setActiveItem(null);
	}

	return (
		<WorkspaceContext.Provider
			value={{ workspaceItems, activeItem, canvasNodeRef, chemicals, clearWorkspace, levelGoals,levelTitle,levelScenario, completedGoals, isLevelComplete, metadataMenu, setMetadataMenu, }}
		>
			<DndContext
				collisionDetection={rectIntersection}
				onDragStart={(event) => {
					const item = event.active.data.current?.item as ChemicalCardProps | undefined;
					setActiveItem(item ?? null);
				}}
				onDragEnd={handleDragEnd}
			>
				<DragOverlay dropAnimation={null}>
					{activeItem ? <ChemicalCard {...activeItem} x={undefined} y={undefined} isOverlay /> : null}
				</DragOverlay>
				{children}
			</DndContext>
		</WorkspaceContext.Provider>
	);
}
