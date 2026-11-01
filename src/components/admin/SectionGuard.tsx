import Link from "next/link";
import { redirect } from "next/navigation";
import { getStaffAccess } from "@/lib/auth/staff";
import { SECTION_ROLES, type SectionKey } from "@/lib/auth/roles";

/** Server-side gate for one part of /admin. The page inside is never sent to the wrong role. */
export default async function SectionGuard({ section, children }: { section: SectionKey; children: React.ReactNode }) {
    const access = await getStaffAccess(SECTION_ROLES[section]);
    if (access.status === "anonymous") redirect("/login");
    if (access.status === "forbidden") {
        return (
            <div className="max-w-xl mx-auto px-6 py-24 text-center">
                <h1 className="text-2xl font-bold text-terminal-text mb-2">Not part of your role</h1>
                <p className="text-terminal-muted text-xs font-mono mb-6">
                    Your role does not include this section. Ask an administrator if you need it.
                </p>
                <Link href="/admin/dashboard" className="text-xs font-mono text-terminal-gold hover:underline">
                    &larr; Back to the dashboard
                </Link>
            </div>
        );
    }
    return <>{children}</>;
}
