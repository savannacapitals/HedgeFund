import Image from "next/image";

interface BrandMarkProps {
    /**
     * "logo" is the full official lockup (acacia tree + SAVANNA CAPITALS wordmark), the default.
     * "tree" is the tree on its own, for tight spaces such as a collapsed sidebar.
     */
    variant?: "logo" | "tree";
    /** Height in px. Leave out to use the size set by the .brand-mark CSS (header / footer). */
    height?: number;
    /** "auto" follows the site theme. "light" always uses the deeper gold, for surfaces that are always light (e.g. the certificate). */
    tone?: "auto" | "light";
    /** Put the logo on its own line, centred (auth cards, certificate, checkout messages). */
    centered?: boolean;
    className?: string;
}

const ASSETS = {
    logo: { dark: "/brand/savanna-logo.png", light: "/brand/savanna-logo-light.png", width: 483, height: 320 },
    tree: { dark: "/brand/savanna-tree.png", light: "/brand/savanna-tree-light.png", width: 460, height: 200 },
} as const;

/**
 * The Savanna Capitals logo.
 * Two gold versions are shipped: bright gold for the dark theme, deeper bronze for the light theme.
 * CSS (globals.css) shows the right one, so there is no flash and no JavaScript is needed.
 * The full logo carries its own alt text; the tree-only mark is decorative (put a label on the link around it).
 */
export default function BrandMark({ variant = "logo", height, tone = "auto", centered = false, className = "" }: BrandMarkProps) {
    const asset = ASSETS[variant];
    const alt = variant === "logo" ? "Savanna Capitals" : "";
    return (
        <span
            className={`brand-mark brand-mark--${variant}${centered ? " is-centered" : ""} ${className}`.trim()}
            style={height ? { height } : undefined}
        >
            {tone === "auto" && (
                <Image src={asset.dark} alt={alt} width={asset.width} height={asset.height} quality={90} className="logo-dark" />
            )}
            <Image
                src={asset.light}
                alt={alt}
                width={asset.width}
                height={asset.height}
                quality={90}
                className={tone === "auto" ? "logo-light" : undefined}
            />
        </span>
    );
}
