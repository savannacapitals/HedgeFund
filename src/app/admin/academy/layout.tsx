import SectionGuard from "@/components/admin/SectionGuard";

export default function Layout({ children }: { children: React.ReactNode }) {
    return <SectionGuard section="academy">{children}</SectionGuard>;
}
