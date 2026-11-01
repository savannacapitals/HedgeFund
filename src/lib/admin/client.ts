// Browser helpers shared by the admin screens.

export const inputCls =
    "w-full px-3 py-2 rounded bg-terminal-bg border border-terminal-border text-xs font-mono focus:outline-none focus:border-terminal-gold";
export const btnCls =
    "px-3 py-1.5 rounded border border-terminal-border text-xs font-mono hover:bg-terminal-bg disabled:opacity-40";
export const primaryBtnCls =
    "px-3 py-1.5 rounded bg-terminal-gold text-terminal-bg text-xs font-mono font-bold hover:bg-terminal-gold/90 disabled:opacity-40";
export const dangerBtnCls =
    "px-3 py-1.5 rounded border border-red-400/50 text-red-400 text-xs font-mono hover:bg-red-400/10 disabled:opacity-40";

export async function adminApi(url: string, body?: any) {
    const res = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: body ? { "Content-Type": "application/json" } : undefined,
        body: body ? JSON.stringify(body) : undefined,
        cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json.error || "Request failed.");
    return json;
}

export function formatMoney(amount: number, currency: string) {
    try {
        return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
    } catch {
        return `${amount.toFixed(2)} ${currency}`;
    }
}

export function shortDate(iso?: string | null) {
    if (!iso) return "—";
    return new Date(iso).toISOString().slice(0, 16).replace("T", " ");
}
