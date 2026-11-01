import { formatUsdc, paymentUri } from "@/lib/payments/usdc/quote";
import { getNetworkMode, type ResolvedUsdcChain } from "@/lib/payments/usdc/chains";
import type { UsdcPaymentRow } from "@/lib/payments/usdc/create-payment";

/** What the browser is allowed to see about a payment */
export function buildPaymentView(payment: UsdcPaymentRow, chains: ResolvedUsdcChain[]) {
    const amount = BigInt(payment.amount_units);
    return {
        id: payment.id,
        status: payment.status,
        address: payment.deposit_address,
        amountDue: formatUsdc(amount),
        amountDueUnits: Number(payment.amount_units),
        received: formatUsdc(BigInt(payment.received_units || 0)),
        receivedUnits: Number(payment.received_units || 0),
        testMode: getNetworkMode() === "testnet",
        networks: chains.map((c) => ({
            id: c.id,
            name: c.name,
            chainId: c.chainId,
            token: c.usdc,
            tokenUrl: `${c.explorer}/token/${c.usdc}`,
            addressUrl: `${c.explorer}/address/${payment.deposit_address}`,
            uri: paymentUri(c.chainId, c.usdc, payment.deposit_address, amount),
        })),
    };
}
