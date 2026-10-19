import { ChemicalCardProps } from "@/components/ui/Chemicals/ChemicalCard";
import { useDraggable, useDroppable } from "@dnd-kit/core";

// Defines the source where chemical is stored
export type DragSource = "sidebar" | "canvas";

// A custom hook to make chemical objects draggable using dnd-kit
export function useChemicalDraggable(id: string, source: DragSource = "sidebar", item?: ChemicalCardProps) {
	// Initializes draggable behavior with an id and some metadata, such as source and item
    const { attributes, listeners, setNodeRef: setDraggableRef, isDragging } = useDraggable({
        id,
        data: { source, item },
    });

	// We use DragOverlay in WorkspaceContext, so we don't translate the original node.
	// Instead, we lower opacity for sidebar items to show a copy is being dragged,
	// and we completely hide the canvas item so it looks like it's actually being picked up.
    const style = isDragging
        ? source === "sidebar"
            ? { opacity: 0.5 }
            : { opacity: 0 }
        : undefined;

    return { setNodeRef: setDraggableRef, listeners, attributes, style };
}

// NEW: makes a canvas card a drop target
export function useChemicalDroppable(id: string) {
    const { setNodeRef, isOver } = useDroppable({
        id: `droppable-${id}`,  // prefix avoids ID collision with the draggable
        data: { target: "chemical", id },
    });

    return { setNodeRef, isOver };
}