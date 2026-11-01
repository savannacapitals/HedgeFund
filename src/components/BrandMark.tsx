import Image from "next/image";

interface BrandMarkProps {
    /** Height in px. Leave out to use the size set by the .brand-mark CSS (header / footer). */
    height?: number;
    /** "auto" follows the site theme. "light" always uses the deeper gold, for surfaces that are always light (e.g. the certificate). */
    tone?: "auto" | "light";
    /** Put the mark on its own line, centred (auth cards, certificate, checkout messages). */
    centered?: boolean;
    className?: string;
}

/**
 * The Savanna Capitals diamond mark.
 * Two gold versions are shipped: bright gold for the dark theme, deeper gold for the light theme.
 * CSS (globals.css) shows the right one, so there is no flash and no JavaScript is needed.
 */
export default function BrandMark({ height, tone = "auto", centered = false, className = "" }: BrandMarkProps) {
    return (
        <span className={`brand-mark${centered ? " is-centered" : ""} ${className}`.trim()} style={height ? { height } : undefined} aria-hidden="true">
            {tone === "auto" && (
                <Image src="/brand/savanna-mark.png" alt="" width={268} height={300} className="logo-dark" />
            )}
            <Image
                src="/brand/savanna-mark-light.png"
                alt=""
                width={268}
                height={300}
                className={tone === "auto" ? "logo-light" : undefined}
            />
        </span>
    );
}
