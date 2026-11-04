export type NavItem = { label: string; href: string; highlight?: boolean };

export const MAIN_NAV: NavItem[] = [
    { label: "Platform", href: "/#platform" },
    { label: "Research", href: "/research" },
    { label: "Academy", href: "/academy" },
    { label: "AI Opportunities", href: "/ai-opportunities", highlight: true },
    { label: "Pricing", href: "/pricing" },
];

export function navItemIsActive(href: string, pathname: string) {
    if (href.startsWith("/#")) return pathname === "/";
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(`${href}/`);
}
