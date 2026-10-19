export default function Button({
	label = " ",
	onClick,
	className,
}: {
	label?: string;
	onClick?: () => void;
	className?: string;
}) {
	return (
		<button onClick={onClick} className="">
			<span className={`group relative inline-block text-sm font-medium`}>
				<span className="absolute inset-0 translate-x-0 translate-y-0 bg-accent-dark transition-transform group-hover:translate-x-0.5 group-hover:translate-y-0.5"></span>
				<span className={`relative block border border-current bg-offWhite ${className}`}>{label}</span>
			</span>
		</button>
	);
}
