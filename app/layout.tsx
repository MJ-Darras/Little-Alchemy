import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const font = Space_Grotesk({ subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
	title: "MCS08",
	description: "An application to simulate chemical reactions.",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${font.className}`}>
				<Script src="/smiles-drawer.min.js" strategy="beforeInteractive" />
				{children}
			</body>
		</html>
	);
}
