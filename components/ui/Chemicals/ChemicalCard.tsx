import React, { ReactNode } from "react";
import { DragSource, useChemicalDraggable, useChemicalDroppable } from "@/hooks/ChemicalDragDrop";
import { useWorkspace } from "@/hooks/WorkspaceContext";

// Defines the parameters to be used by chemical objects
export type ChemicalCardProps = {
	id: string; // unique identifier
    chemicalId? : string; //identifier for metadata
	label: string; // display name
	preview: ReactNode; // visual representation of chemical
	info: string; // additional info such as the chemical type
	x?: number; // x coordinates in the canvas
	y?: number; // y coordinates in the canvas
	source?: DragSource; // origin source of the item
	isOverlay?: boolean; // whether this card is being rendered as a drag overlay
};
// Main function that returns the chemical object
export default function ChemicalCard({ id, chemicalId, label, preview, info, x, y, source, isOverlay }: ChemicalCardProps) {
	// allowing the object to use the draggable hook we created
    const { setNodeRef: setDraggableRef, listeners, attributes, style } = useChemicalDraggable(id, source, {
        id,
		label,
		preview,
		info,
		x,
		y,
		source,
    });

    // only canvas items are drop targets
    const { setNodeRef: setDroppableRef, isOver } = useChemicalDroppable(id);
    const { setMetadataMenu } = useWorkspace();

    // merge both refs onto the same element
    const setRef = (node: HTMLDivElement | null) => {
        if (!isOverlay) setDraggableRef(node);
        if (!isOverlay && source === "canvas") setDroppableRef(node);
    };

    const positionalStyle =
        x !== undefined && y !== undefined
            ? { position: "absolute" as const, left: x, top: y }
            : {};

    const overlayStyle = isOverlay ? { cursor: "grabbing" } : {};

    // highlight when another card is dragged over this one
    const overStyle = isOver && source === "canvas" && !isOverlay
        ? { outline: "2px solid #6366f1", borderRadius: "8px" }
        : {};

    function openMetadataMenu(clientX: number, clientY: number) {
        if (source !== "canvas" || isOverlay) return;
        const typeId = chemicalId ?? id;
        setMetadataMenu({
            chemical: { id: typeId, label, preview, info, source },
            x: clientX,
            y: clientY,
        });
    }

    function handleContextMenu(event: React.MouseEvent) {
        if (source !== "canvas" || isOverlay) return;
        event.preventDefault();
        openMetadataMenu(event.clientX, event.clientY);
        const typeId = chemicalId ?? id;
        setMetadataMenu({
            chemical: { id : typeId, label, preview, info, source },
            x: event.clientX,
            y: event.clientY,
        });
    }

    return (
        <div
            ref={setRef}
            style={{ ...positionalStyle, ...(isOverlay ? overlayStyle : style), ...overStyle }}
            {...(isOverlay ? {} : listeners)}
            {...(isOverlay ? {} : attributes)}
            onContextMenu={handleContextMenu}
            className={`group flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 ${isOverlay ? "cursor-grabbing w-max bg-white shadow-md shadow-gray-200/50" : "cursor-grab active:cursor-grabbing"} ${source === "canvas" ? "w-max" : ""} touch-none`}
        >
			{/* Left side: preview + label */}
            <div className="flex items-center gap-3">
                {preview}
                <span className="text-sm text-gray-600 group-hover:text-gray-900">{label}</span>
            </div>
           {/* Right side: additional info */}
		    {source === "sidebar" && !isOverlay ? (
                <span className="text-xs text-accent-light-grey group-hover:text-primary text-right">{info}</span>
            ) : null}
        </div>
    );
}