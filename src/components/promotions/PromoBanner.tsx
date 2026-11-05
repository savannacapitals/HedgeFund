import PromoBannerClient from "@/components/promotions/PromoBannerClient";
import { getBannerOffer } from "@/lib/promotions/server";

/**
 * The offer strip shown on the home page, pricing and the Academy.
 * It reads the live promotion from the database (cached for a minute) and renders nothing when there is none,
 * so there is no hard-coded copy to forget to remove.
 */
export default async function PromoBanner() {
    const offer = await getBannerOffer();
    if (!offer) return null;
    return <PromoBannerClient offer={offer} />;
}
