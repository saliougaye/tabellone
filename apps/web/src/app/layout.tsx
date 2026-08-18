import { SerwistProvider } from "@serwist/turbopack/react";
import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import type { ReactNode } from "react";
import { strings } from "@/strings";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next";

const plexSans = IBM_Plex_Sans({
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	variable: "--font-plex-sans",
	display: "swap",
});

export const metadata: Metadata = {
	title: strings.appName,
	description: "Arrivi e partenze in tempo reale per le stazioni italiane",
	icons: {
		icon: [
			{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
			{ url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
		],
		apple: "/icons/apple-touch-icon.png",
	},
};

export const viewport: Viewport = {
	themeColor: [
		{ media: "(prefers-color-scheme: light)", color: "#f9fafb" },
		{ media: "(prefers-color-scheme: dark)", color: "#0e0f12" },
	],
};

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html
			lang="it"
			className={plexSans.variable}
		>
			<body>
				<SerwistProvider swUrl="/serwist/sw.js">{children}</SerwistProvider>
				<Analytics />
			</body>
		</html>
	);
}
