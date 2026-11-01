import type { NetworkId, TokenSymbol } from "@/lib/payments/stablecoin/networks";

/** A confirmed incoming stablecoin transfer to one of our deposit addresses */
export interface IncomingTransfer {
    network: NetworkId;
    token: TokenSymbol;
    /** Unique within a network (a transaction can hold several transfers) */
    ref: string;
    txid: string;
    from: string | null;
    to: string;
    amountUnits: bigint;
    occurredAt: Date;
}

export interface ScanResult {
    transfers: IncomingTransfer[];
    /** Where to continue next time. Null means "unchanged". */
    nextCursor: string | null;
}

export interface ScanOptions {
    now?: () => number;
    /** How far back the very first scan looks, in minutes */
    firstScanMinutes?: number;
}

export const FIRST_SCAN_MINUTES = 30;
