"use client";

import { useDroppable } from "@dnd-kit/core";
import ChemicalCard from "./Chemicals/ChemicalCard";
import ChemicalMetadataMenu from "./ChemicalMetadataMenu";
import { useWorkspace } from "@/hooks/WorkspaceContext";
import ClearWorkspaceButton from "./clearWorkspaceButton";

// canvas component where chemicals can be dropped
export default function WorkspaceCanvas() {
	// access workspace state and shared references from the context
	const { workspaceItems, canvasNodeRef, chemicals , metadataMenu, setMetadataMenu } = useWorkspace();
	// enables this component as a droppable area with id canvas
	const { setNodeRef } = useDroppable({ id: "canvas" });
	// combine dnd kit reference with our own canvas reference
	const setCanvasRef = (node: HTMLDivElement | null) => {
		setNodeRef(node);
		canvasNodeRef.current = node;
	};

	// return main canvas container
	return (
		<div ref={setCanvasRef} className="flex-1 relative bg-white overflow-hidden">
			{/* render all items currently placed in the workspace */}
			{workspaceItems.map((item) => {
				const base = chemicals.find((c) => c.id === item.chemicalId);
				if (!base) return null;
				return <ChemicalCard key={item.id} {...item} preview={base.preview} />;
			})}
			{/* Clear button */}
			<div className="mt-auto p-4 flex justify-end">
				<ClearWorkspaceButton />
			</div>
			{metadataMenu ? (
                <ChemicalMetadataMenu
                    state={metadataMenu}
                    onClose={() => setMetadataMenu(null)}
                />
            ) : null}
		</div>
	);
}
