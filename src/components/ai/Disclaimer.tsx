import Link from "next/link";
import { INDEPENDENCE_NOTICE, NO_GUARANTEE_NOTICE } from "@/lib/ai/config";

export default function Disclaimer({ compact = false }: { compact?: boolean }) {
    return (
        <div className="aio-notice" role="note">
            <strong style={{ color: "var(--sc-text)" }}>Independent research. No guarantees.</strong> {INDEPENDENCE_NOTICE} {NO_GUARANTEE_NOTICE}
            {!compact && (
                <>
                    {" "}Memberships and assistance fees pay for Savanna&apos;s research and help, never for a third-party account, approval or job. See our{" "}
                    <Link href="/ai-opportunities/terms" style={{ color: "var(--sc-green)" }}>Terms</Link> and{" "}
                    <Link href="/ai-opportunities/privacy" style={{ color: "var(--sc-green)" }}>Privacy</Link> pages.
                </>
            )}
        </div>
    );
}
