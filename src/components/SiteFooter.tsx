import Link from "next/link";
import BrandMark from "@/components/BrandMark";

const columns = [
    {
        title: "Platform",
        links: [
            { href: "/#platform", label: "How it works" },
            { href: "/research", label: "Research library" },
            { href: "/academy", label: "Savanna Academy" },
            { href: "/ai-opportunities", label: "AI Opportunities" },
            { href: "/pricing", label: "Pricing" },
        ],
    },
    {
        title: "Learn",
        links: [
            { href: "/academy", label: "Course catalogue" },
            { href: "/dashboard", label: "Your dashboard" },
            { href: "/verify", label: "Verify a certificate" },
            { href: "/community/killzone", label: "Killzone Journal" },
        ],
    },
    {
        title: "Company",
        links: [
            { href: "/#about", label: "About" },
            { href: "/contact", label: "Contact" },
            { href: "/ai-opportunities/terms", label: "AI terms" },
            { href: "/ai-opportunities/privacy", label: "AI privacy" },
        ],
    },
];

export default function SiteFooter() {
    const year = new Date().getFullYear();
    return (
        <footer className="site-footer">
            <div className="footer-grid">
                <div className="footer-brand">
                    <Link href="/" className="brand-lockup">
                        <BrandMark />
                        <span className="brand-name">
                            SAVANNA<span>CAPITALS</span>
                        </span>
                    </Link>
                    <p>Independent thinking. African perspective. Global context.</p>
                    <p className="footer-brand-note">Research, education and guidance. Not investment advice, job placement or a guarantee of work.</p>
                </div>
                {columns.map((column) => (
                    <div className="footer-col" key={column.title}>
                        <h2>{column.title}</h2>
                        {column.links.map((link) => (
                            <Link href={link.href} key={link.href + link.label}>
                                {link.label}
                            </Link>
                        ))}
                    </div>
                ))}
            </div>
            <div className="footer-bottom">
                <span>© {year} Savanna Capitals. All rights reserved.</span>
                <span>Research and education platform. Not investment advice.</span>
            </div>
        </footer>
    );
}
