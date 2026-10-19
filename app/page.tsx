"use client";

import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";

export default function Home() {
	const router = useRouter();
	return (
		<div className="flex flex-col items-center justify-center p-4 h-screen space-y-25">
			<h1 className="text-5xl text-primary">MCS08 - Little Alchemy</h1>
			<div className="flex flex-col items-center gap-8">
				<Button
					label="Free Experiment"
					className="text-2xl text-primary px-8 py-3"
					onClick={() => router.push("/experiment")}
				/>
				<Button
					label="Play Levels"
					className="text-2xl text-primary px-8 py-3"
					onClick={() => router.push("/levels")}
				/>
			</div>
		</div>
	);
}
