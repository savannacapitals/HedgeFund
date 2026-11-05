import PromoBanner from "@/components/promotions/PromoBanner";

// Refresh the offer strip at least once a minute (staff changes clear it immediately)
export const revalidate = 60;

export default function AcademyLayout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <PromoBanner />
            {children}
        </>
    );
}
