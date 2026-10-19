"use client";

import { useState, useEffect } from "react";
import { useWorkspace } from "@/hooks/WorkspaceContext";

// button to clear all items from the workspace canvas, with a two-click confirmation pattern
export default function ClearWorkspaceButton() {
	const { workspaceItems, clearWorkspace } = useWorkspace();
	// tracks whether the button is in "confirm" state
	const [confirming, setConfirming] = useState(false);

	// auto-reset the confirmation state after 3 seconds if the user doesn't follow through
	useEffect(() => {
		if (!confirming) return;
		const timeout = setTimeout(() => setConfirming(false), 3000);
		return () => clearTimeout(timeout);
	}, [confirming]);

	// first click enters confirming state, second click clears the workspace
	function handleClick() {
		if (confirming) {
			clearWorkspace();
			setConfirming(false);
		} else {
			setConfirming(true);
		}
	}

	// only render when there are items on the canvas
	if (workspaceItems.length === 0) return null;

	return (
		<button
			onClick={handleClick}
			className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
				confirming
					? "bg-error text-white border-error"
					: "bg-white text-gray-500 border-gray-300 hover:text-gray-700 hover:border-gray-400"
			}`}
		>
			{confirming ? "Confirm?" : "Clear All"}
		</button>
	);
}