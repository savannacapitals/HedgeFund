import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffAccess } from "@/lib/auth/staff";
import { ADMIN_AREA_ROLES } from "@/lib/auth/roles";
import AdminShell from "@/components/admin/AdminShell";

export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

// Everything under /admin is for staff roles only.
// Auth runs on the server before any admin page is sent to the browser.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    const access = await getStaffAccess(ADMIN_AREA_ROLES);

    if (access.status === "anonymous") {
        redirect("/login");
    }

    if (access.status === "forbidden") {
        return (
            <div className="min-h-screen bg-terminal-bg text-terminal-text px-6 py-24 max-w-xl mx-auto text-center">
                <h1 className="text-2xl font-bold mb-2">No access</h1>
                <p className="text-terminal-muted text-xs font-mono">
                    This area is for Savanna staff. If you think you should have access, ask an administrator.
                </p>
            </div>
        );
    }

    return <AdminShell role={access.role}>{children}</AdminShell>;
}
