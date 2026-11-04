import { Playfair_Display, Source_Serif_4 } from "next/font/google";

// Editorial typefaces are loaded for the research section only, so the rest of the site is unaffected.
const headline = Playfair_Display({ subsets: ["latin"], variable: "--font-headline", display: "swap" });
const editorial = Source_Serif_4({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-editorial", display: "swap" });

export default function ResearchLayout({ children }: { children: React.ReactNode }) {
    return <div className={`${headline.variable} ${editorial.variable}`}>{children}</div>;
}
