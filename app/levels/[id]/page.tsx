import { notFound } from "next/navigation";
import { LEVELS } from "@/data/levels";
import LevelEnvironment from "@/components/ui/LevelEnvironment";

export default async function LevelPage({ params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const level = LEVELS.find((l) => l.id === id);
	if (!level) notFound();
	return <LevelEnvironment level={level} />;
}
