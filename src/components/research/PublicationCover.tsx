import { canonicalCategory, RESEARCH_CATEGORIES } from "@/lib/research/shared";

// Abstract "report cover" artwork. Every publication gets a motif that belongs to its desk
// (macro, rates, equities, policy, digital assets) and is varied deterministically from its slug,
// so a given report always looks the same and no two reports look identical.
// The artwork is purely decorative: it carries no data, labels or figures.

const W = 640;
const H = 360;

const INK = "#0a1d19";
const GRID = "rgba(140, 205, 180, 0.07)";
const LINE = "rgba(126, 200, 172, 0.42)";
const LINE_SOFT = "rgba(126, 200, 172, 0.2)";
const PALE = "#d3e8e0";
const GOLD = "#c9ab6c";

function hash(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function rng(seed: number) {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const n = (value: number) => value.toFixed(1);

type Rand = () => number;
const between = (r: Rand, a: number, b: number) => a + r() * (b - a);

function smoothPath(points: [number, number][]): string {
    if (points.length < 3) return `M${points.map((p) => `${n(p[0])} ${n(p[1])}`).join("L")}`;
    let d = `M${n(points[0][0])} ${n(points[0][1])}`;
    for (let i = 1; i < points.length - 1; i++) {
        const mx = (points[i][0] + points[i + 1][0]) / 2;
        const my = (points[i][1] + points[i + 1][1]) / 2;
        d += `Q${n(points[i][0])} ${n(points[i][1])} ${n(mx)} ${n(my)}`;
    }
    const last = points[points.length - 1];
    return d + `T${n(last[0])} ${n(last[1])}`;
}

/* ------------------------------ motifs ------------------------------ */

function Macro({ r }: { r: Rand }) {
    const cx = between(r, 400, 470);
    const cy = between(r, 160, 200);
    const R = between(r, 118, 140);
    const rings = 5 + Math.floor(r() * 3);
    const tilt = between(r, -28, 28);
    const dotAngle = r() * Math.PI * 2;
    const dotRing = 3 + Math.floor(r() * (rings - 3));
    const dotR = (R * dotRing) / rings;
    return (
        <g fill="none" strokeWidth={1}>
            {Array.from({ length: rings }, (_, i) => (
                <circle key={i} cx={n(cx)} cy={n(cy)} r={n((R * (i + 1)) / rings)} stroke={i === rings - 1 ? LINE : LINE_SOFT} />
            ))}
            <g transform={`rotate(${n(tilt)} ${n(cx)} ${n(cy)})`} stroke={LINE_SOFT}>
                {[0.3, 0.6, 0.86].map((k) => (
                    <ellipse key={k} cx={n(cx)} cy={n(cy)} rx={n(R * k)} ry={n(R)} />
                ))}
                <line x1={n(cx - R - 18)} y1={n(cy)} x2={n(cx + R + 18)} y2={n(cy)} stroke={LINE} />
            </g>
            <circle cx={n(cx + dotR * Math.cos(dotAngle))} cy={n(cy + dotR * Math.sin(dotAngle))} r={4} fill={GOLD} stroke="none" />
            <circle cx={n(cx + dotR * Math.cos(dotAngle))} cy={n(cy + dotR * Math.sin(dotAngle))} r={11} stroke={GOLD} strokeOpacity={0.55} />
        </g>
    );
}

function FixedIncome({ r }: { r: Rand }) {
    const x0 = 270;
    const x1 = 600;
    const base = 296;
    const curves = 5 + Math.floor(r() * 2);
    const gold = Math.floor(r() * curves);
    const steps = 9;
    const paths = Array.from({ length: curves }, (_, k) => {
        const lift = 36 + k * 20 + between(r, -4, 6);
        const reach = between(r, 90, 140);
        const rate = between(r, 2.2, 3.6);
        const pts: [number, number][] = Array.from({ length: steps }, (_, i) => {
            const t = i / (steps - 1);
            const y = base - lift - reach * (1 - Math.exp(-rate * t)) - between(r, 0, 3);
            return [x0 + t * (x1 - x0), y];
        });
        return smoothPath(pts);
    });
    return (
        <g fill="none">
            <line x1={x0} y1={base} x2={x1} y2={base} stroke={LINE} />
            <line x1={x0} y1={base} x2={x0} y2={70} stroke={LINE_SOFT} />
            {Array.from({ length: 10 }, (_, i) => (
                <line key={i} x1={n(x0 + (i * (x1 - x0)) / 9)} y1={base} x2={n(x0 + (i * (x1 - x0)) / 9)} y2={base + (i % 3 === 0 ? 9 : 5)} stroke={LINE} />
            ))}
            {paths.map((d, k) => (
                <path key={k} d={d} stroke={k === gold ? GOLD : LINE} strokeWidth={k === gold ? 2 : 1.2} strokeOpacity={k === gold ? 1 : 0.8} />
            ))}
        </g>
    );
}

function Equities({ r }: { r: Rand }) {
    const count = 13 + Math.floor(r() * 3);
    const x0 = 262;
    const gap = (610 - x0) / count;
    const base = 300;
    let level = between(r, 90, 130);
    const highlight = new Set([Math.floor(r() * count), Math.floor(r() * count)]);
    const candles = Array.from({ length: count }, (_, i) => {
        const open = level;
        level = Math.min(190, Math.max(40, level + between(r, -26, 30)));
        const close = level;
        const high = Math.max(open, close) + between(r, 6, 22);
        const low = Math.min(open, close) - between(r, 6, 22);
        return { x: x0 + gap * (i + 0.5), open, close, high, low, i };
    });
    return (
        <g>
            <line x1={x0 - 6} y1={base} x2={612} y2={base} stroke={LINE} />
            {candles.map((c) => {
                const up = c.close >= c.open;
                const gold = highlight.has(c.i);
                const stroke = gold ? GOLD : LINE;
                const top = base - Math.max(c.open, c.close);
                const height = Math.max(3, Math.abs(c.close - c.open));
                return (
                    <g key={c.i} stroke={stroke} strokeWidth={1}>
                        <line x1={n(c.x)} y1={n(base - c.high)} x2={n(c.x)} y2={n(base - c.low)} />
                        <rect x={n(c.x - gap * 0.26)} y={n(top)} width={n(gap * 0.52)} height={n(height)} fill={up ? (gold ? GOLD : "rgba(126,200,172,0.5)") : INK} />
                    </g>
                );
            })}
        </g>
    );
}

function Policy({ r }: { r: Rand }) {
    const cols = 6 + Math.floor(r() * 4);
    const width = 330;
    const x0 = 640 - 36 - width - 20;
    const gap = width / (cols - 1);
    const gold = 1 + Math.floor(r() * (cols - 2));
    const top = between(r, 120, 140);
    const bottom = 286;
    return (
        <g fill="none" strokeWidth={1}>
            <polygon points={`${n(x0 - 22)},${n(top - 14)} ${n(x0 + width / 2)},${n(top - 62)} ${n(x0 + width + 22)},${n(top - 14)}`} stroke={LINE} />
            <rect x={n(x0 - 22)} y={n(top - 14)} width={n(width + 44)} height={12} stroke={LINE} />
            {Array.from({ length: cols }, (_, i) => {
                const x = x0 + i * gap;
                const isGold = i === gold;
                return (
                    <g key={i} stroke={isGold ? GOLD : LINE} strokeWidth={isGold ? 1.6 : 1}>
                        <rect x={n(x - 9)} y={n(top + 2)} width={18} height={6} />
                        <line x1={n(x - 6)} y1={n(top + 8)} x2={n(x - 6)} y2={bottom} />
                        <line x1={n(x + 6)} y1={n(top + 8)} x2={n(x + 6)} y2={bottom} />
                        <line x1={n(x)} y1={n(top + 8)} x2={n(x)} y2={bottom} strokeOpacity={0.4} />
                    </g>
                );
            })}
            {[0, 1, 2].map((s) => (
                <rect key={s} x={n(x0 - 22 - s * 10)} y={bottom + s * 7} width={n(width + 44 + s * 20)} height={7} stroke={LINE_SOFT} />
            ))}
        </g>
    );
}

function Digital({ r }: { r: Rand }) {
    const step = 46;
    const nodes: { x: number; y: number; row: number; col: number }[] = [];
    for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 8; col++) {
            const x = 270 + col * step + (row % 2 ? step / 2 : 0);
            const y = 66 + row * (step * 0.866);
            if (x < 618) nodes.push({ x, y, row, col });
        }
    }
    const find = (row: number, col: number) => nodes.find((p) => p.row === row && p.col === col);
    const edges: [typeof nodes[number], typeof nodes[number]][] = [];
    for (const p of nodes) {
        const targets = [find(p.row, p.col + 1), find(p.row + 1, p.col + (p.row % 2 ? 1 : 0)), find(p.row + 1, p.col + (p.row % 2 ? 0 : -1))];
        for (const q of targets) if (q && r() < 0.6) edges.push([p, q]);
    }
    const lit = new Set<number>();
    while (lit.size < 3) lit.add(Math.floor(r() * nodes.length));
    const pale = new Set<number>();
    while (pale.size < 6) pale.add(Math.floor(r() * nodes.length));
    return (
        <g>
            {edges.map(([a, b], i) => (
                <line key={i} x1={n(a.x)} y1={n(a.y)} x2={n(b.x)} y2={n(b.y)} stroke={LINE_SOFT} strokeWidth={1} />
            ))}
            {nodes.map((p, i) => {
                const isGold = lit.has(i);
                return (
                    <g key={i}>
                        {isGold && <circle cx={n(p.x)} cy={n(p.y)} r={11} fill="none" stroke={GOLD} strokeOpacity={0.5} />}
                        <circle cx={n(p.x)} cy={n(p.y)} r={isGold ? 4.5 : 3} fill={isGold ? GOLD : pale.has(i) ? PALE : INK} stroke={isGold ? GOLD : LINE} strokeWidth={1} />
                    </g>
                );
            })}
        </g>
    );
}

function Generic({ r }: { r: Rand }) {
    const cx = between(r, 420, 480);
    const cy = between(r, 160, 200);
    const count = 6 + Math.floor(r() * 3);
    const gold = 2 + Math.floor(r() * (count - 2));
    return (
        <g fill="none" strokeWidth={1}>
            {Array.from({ length: count }, (_, i) => {
                const s = 26 + i * 20;
                return <rect key={i} x={n(cx - s)} y={n(cy - s)} width={n(s * 2)} height={n(s * 2)} transform={`rotate(45 ${n(cx)} ${n(cy)})`} stroke={i === gold ? GOLD : i % 2 ? LINE : LINE_SOFT} strokeWidth={i === gold ? 1.6 : 1} />;
            })}
        </g>
    );
}

/* ------------------------------ cover ------------------------------ */

export default function PublicationCover({
    seed,
    category,
    label,
    className = "",
}: {
    seed: string;
    category: string;
    /** Small caption in the lower right (for example the publication month). Decorative. */
    label?: string;
    className?: string;
}) {
    const cat = canonicalCategory(category);
    const r = rng(hash(`${seed}|${cat}`));
    const motif = (() => {
        switch (cat) {
            case RESEARCH_CATEGORIES[0]:
                return <Macro r={r} />;
            case RESEARCH_CATEGORIES[1]:
                return <FixedIncome r={r} />;
            case RESEARCH_CATEGORIES[2]:
                return <Equities r={r} />;
            case RESEARCH_CATEGORIES[3]:
                return <Policy r={r} />;
            case RESEARCH_CATEGORIES[4]:
                return <Digital r={r} />;
            default:
                return <Generic r={r} />;
        }
    })();

    return (
        <div className={`relative aspect-[16/9] w-full overflow-hidden bg-[#0a1d19] ${className}`} aria-hidden="true">
            <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" focusable="false">
                <rect width={W} height={H} fill={INK} />
                {Array.from({ length: 15 }, (_, i) => (
                    <line key={`v${i}`} x1={i * 44} y1={0} x2={i * 44} y2={H} stroke={GRID} />
                ))}
                {Array.from({ length: 9 }, (_, i) => (
                    <line key={`h${i}`} x1={0} y1={i * 44} x2={W} y2={i * 44} stroke={GRID} />
                ))}
                {motif}
                <rect x={14} y={14} width={W - 28} height={H - 28} fill="none" stroke={GOLD} strokeOpacity={0.3} />
                <image href="/brand/savanna-tree.png" x={34} y={30} width={46} height={20} preserveAspectRatio="xMidYMid meet" />
                <text x={90} y={46} fill={PALE} fillOpacity={0.85} fontSize={11} letterSpacing={3.2} fontFamily="var(--font-jetbrains-mono), ui-monospace, monospace">
                    SAVANNA RESEARCH
                </text>
                <text x={34} y={H - 32} fill={GOLD} fontSize={11} letterSpacing={2.6} fontFamily="var(--font-jetbrains-mono), ui-monospace, monospace">
                    {cat.toUpperCase()}
                </text>
                {label && (
                    <text x={W - 34} y={H - 32} textAnchor="end" fill={PALE} fillOpacity={0.6} fontSize={11} letterSpacing={2.6} fontFamily="var(--font-jetbrains-mono), ui-monospace, monospace">
                        {label.toUpperCase()}
                    </text>
                )}
            </svg>
        </div>
    );
}
