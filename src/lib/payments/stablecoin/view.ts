import { formatAmount } from "@/lib/payments/stablecoin/quote";
import type { ResolvedNetwork } from "@/lib/payments/stablecoin/networks";
import type { PaymentRow } from "@/lib/payments/stablecoin/create-payment";

function walletLink(n: ResolvedNetwork, tokenId: string, units: bigint): string {
    if (n.family === "evm") return `ethereum:${tokenId}@${n.chainId}/transfer?address=${n.address}&uint256=${units.toString()}`;
    if (n.family === "solana") return `solana:${n.address}?amount=${formatAmount(units)}&spl-token=${tokenId}`;
    return n.address; // Tron and Stellar wallets do not share a payment-link format: the QR holds the address
}

/** What the browser is allowed to see about a payment */
export function buildPaymentView(payment: PaymentRow, networks: ResolvedNetwork[]) {
    const units = BigInt(payment.amount_units);
    return {
        id: payment.id,
        status: payment.status,
        amountDue: formatAmount(units),
        amountDueUnits: Number(units),
        expiresAt: payment.expires_at,
        paidNetwork: payment.paid_network,
        paidToken: payment.paid_token,
        networks: networks.map((n) => ({
            id: n.id,
            name: n.name,
            family: n.family,
            address: n.address,
            addressUrl: n.addressUrl + (n.family === "stellar" ? n.stellarAccount : n.address),
            warning:
                n.family === "stellar"
                    ? "This address includes your payment ID. Use a wallet that supports Stellar M... addresses, or choose another network."
                    : null,
            tokens: n.tokens.map((t) => ({
                symbol: t.symbol,
                id: t.id,
                uri: walletLink(n, t.id, units),
            })),
        })),
    };
}
