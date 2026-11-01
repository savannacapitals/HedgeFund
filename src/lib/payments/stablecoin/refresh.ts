import { ingestNetworks, type IngestReport } from "@/lib/payments/stablecoin/ingest";
import { expireOldPayments, matchPendingPayments, repairSucceededPayments } from "@/lib/payments/stablecoin/match";

/** One full pass: look at the blockchains, match payments, tidy up */
export async function refreshPayments(options: { force?: boolean } = {}): Promise<{
    networks: IngestReport[];
    matched: number;
    repaired: number;
}> {
    const networks = await ingestNetworks({ force: options.force });
    await expireOldPayments();
    const { matched } = await matchPendingPayments();
    const { repaired } = await repairSucceededPayments();
    return { networks, matched, repaired };
}
