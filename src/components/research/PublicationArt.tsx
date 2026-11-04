import type { ReactNode } from "react";

/**
 * Abstract identity plate for a publication.
 *
 * Every plate is drawn from the category (which sets the motif) and the slug (which sets the
 * proportions), so a given report always looks the same and neighbouring reports differ.
 * The shapes are decorative only: they do not represent data, and no real figures are drawn.
 * Colours come from the theme tokens, so the plates follow light and dark mode.
 */

const W = 400;
const H = 200;

const n = (value: number) => Math.round(value * 10) / 10;

function hash(input: string): number {
    let h = 2166136261;
    for (let i = 0; i < input.length; i++) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function makeRandom(seed: number) {
    let s = seed || 1;
    return () => {
        s ^= s << 13;
        s ^= s >>> 17;
        s ^= s << 5;
        s >>>= 0;
        return s / 4294967296;
    };
}

type Random = () => number;

const GOLD = "stroke-terminal-gold";
const GOLD_FILL = "fill-terminal-gold";
const GREEN = "stroke-terminal-emerald";
const GREEN_FILL = "fill-terminal-emerald";

function macro(rand: Random): ReactNode {
    const cx = n(235 + rand() * 90);
    const cy = n(92 + rand() * 36);
    const rings = Array.from({ length: 7 }, (_, i) => 16 + i * 17);
    const outer = rings[rings.length - 1];
    const dots = Array.from({ length: 6 }, () => {
        const angle = rand() * Math.PI * 2;
        const radius = rings[1 + Math.floor(rand() * (rings.length - 1))];
        return { x: n(cx + Math.cos(angle) * radius), y: n(cy + Math.sin(angle) * radius) };
    });
    return (
        <g fill="none" strokeWidth={1}>
            {rings.map((r, i) => (
                <circle key={r} cx={cx} cy={cy} r={r} className={GOLD} strokeOpacity={n(0.6 - i * 0.065)} />
            ))}
            {[0.3, 0.58, 0.84].map((k) => (
                <ellipse key={k} cx={cx} cy={cy} rx={n(outer * k)} ry={outer} className={GOLD} strokeOpacity={0.26} />
            ))}
            <line x1={n(cx - outer)} x2={n(cx + outer)} y1={cy} y2={cy} className={GOLD} strokeOpacity={0.3} />
            {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={2.4} className={`${GREEN_FILL} ${GREEN}`} strokeWidth={0} />
            ))}
        </g>
    );
}

function fixedIncome(rand: Random): ReactNode {
    const curves = [0, 1, 2].map((i) => {
        const base = 156 - i * 15 + rand() * 6;
        const amp = 62 + rand() * 28 - i * 9;
        const k = 2 + rand() * 1.8;
        const points = Array.from({ length: 25 }, (_, j) => {
            const t = j / 24;
            return [n(24 + t * 352), n(base - amp * (1 - Math.exp(-k * t)))] as const;
        });
        return { points, d: `M${points.map((p) => `${p[0]} ${p[1]}`).join(" L")}` };
    });
    return (
        <g fill="none" strokeWidth={1}>
            {[44, 84, 124, 164].map((y) => (
                <line key={y} x1={24} x2={376} y1={y} y2={y} className="stroke-terminal-border" strokeDasharray="2 5" />
            ))}
            {curves.map((c, i) => (
                <path
                    key={i}
                    d={c.d}
                    className={i === 0 ? GOLD : GREEN}
                    strokeOpacity={i === 0 ? 0.85 : 0.5 - i * 0.12}
                    strokeWidth={i === 0 ? 1.6 : 1}
                    strokeLinejoin="round"
                />
            ))}
            {[0, 4, 8, 12, 18, 24].map((idx) => (
                <circle
                    key={idx}
                    cx={curves[0].points[idx][0]}
                    cy={curves[0].points[idx][1]}
                    r={2.6}
                    className={`${GOLD} fill-terminal-bg`}
                    strokeWidth={1.2}
                />
            ))}
        </g>
    );
}

function equities(rand: Random): ReactNode {
    let value = 96 + rand() * 18;
    const candles = Array.from({ length: 22 }, (_, i) => {
        const open = value;
        value = Math.min(158, Math.max(42, value + (rand() - 0.45) * 17));
        const close = value;
        return {
            x: n(26 + i * 16.2),
            open: n(200 - open),
            close: n(200 - close),
            high: n(200 - (Math.max(open, close) + rand() * 9)),
            low: n(200 - (Math.min(open, close) - rand() * 9)),
            up: close >= open,
        };
    });
    return (
        <g fill="none" strokeWidth={1}>
            {[60, 100, 140].map((y) => (
                <line key={y} x1={20} x2={380} y1={y} y2={y} className="stroke-terminal-border" strokeDasharray="2 5" />
            ))}
            {candles.map((c, i) => {
                const top = Math.min(c.open, c.close);
                const height = Math.max(2, Math.abs(c.open - c.close));
                return (
                    <g key={i} className={c.up ? GREEN : GOLD} strokeOpacity={c.up ? 0.75 : 0.6}>
                        <line x1={c.x} x2={c.x} y1={c.high} y2={c.low} />
                        <rect
                            x={n(c.x - 4)}
                            y={n(top)}
                            width={8}
                            height={n(height)}
                            className={c.up ? "fill-terminal-emerald/20" : "fill-transparent"}
                        />
                    </g>
                );
            })}
        </g>
    );
}

function policy(rand: Random): ReactNode {
    const columns = 7;
    const gap = 40;
    const startX = n(48 + rand() * 40);
    const width = (columns - 1) * gap;
    const left = startX - 16;
    const right = startX + width + 16;
    return (
        <g fill="none" strokeWidth={1}>
            <polygon
                points={`${left},58 ${n((left + right) / 2)},${n(22 + rand() * 10)} ${right},58`}
                className={GOLD}
                strokeOpacity={0.55}
            />
            <line x1={left} x2={right} y1={64} y2={64} className={GOLD} strokeOpacity={0.7} />
            {Array.from({ length: columns }, (_, i) => {
                const x = n(startX + i * gap);
                return (
                    <g key={i} className={GOLD} strokeOpacity={0.5}>
                        <rect x={n(x - 7)} y={72} width={14} height={78} />
                        <line x1={n(x - 11)} x2={n(x + 11)} y1={72} y2={72} />
                        <line x1={n(x - 11)} x2={n(x + 11)} y1={150} y2={150} />
                    </g>
                );
            })}
            <line x1={n(left - 8)} x2={n(right + 8)} y1={158} y2={158} className={GOLD} strokeOpacity={0.45} />
            <line x1={n(left - 18)} x2={n(right + 18)} y1={166} y2={166} className={GOLD} strokeOpacity={0.3} />
            <circle cx={n((left + right) / 2)} cy={46} r={3} className={`${GREEN_FILL}`} strokeWidth={0} />
        </g>
    );
}

function digital(rand: Random): ReactNode {
    const rows = 6;
    const cols = 10;
    const nodes: { x: number; y: number; hot: boolean }[] = [];
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            nodes.push({
                x: n(30 + c * 38 + (r % 2 ? 19 : 0) + (rand() - 0.5) * 8),
                y: n(26 + r * 30 + (rand() - 0.5) * 8),
                hot: rand() < 0.14,
            });
        }
    }
    const edges: [number, number][] = [];
    nodes.forEach((_, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const candidates: number[] = [];
        if (c < cols - 1) candidates.push(i + 1);
        if (r < rows - 1) {
            candidates.push(i + cols);
            const diagonal = r % 2 ? i + cols + 1 : i + cols - 1;
            const diagonalCol = r % 2 ? c + 1 : c - 1;
            if (diagonalCol >= 0 && diagonalCol < cols) candidates.push(diagonal);
        }
        candidates.forEach((j) => {
            if (rand() < 0.55) edges.push([i, j]);
        });
    });
    return (
        <g fill="none" strokeWidth={1}>
            {edges.map(([a, b], i) => (
                <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} className={GOLD} strokeOpacity={0.28} />
            ))}
            {nodes.map((node, i) =>
                node.hot ? (
                    <g key={i}>
                        <circle cx={node.x} cy={node.y} r={7} className={GREEN} strokeOpacity={0.35} />
                        <circle cx={node.x} cy={node.y} r={3.2} className={`${GREEN_FILL}`} strokeWidth={0} />
                    </g>
                ) : (
                    <circle key={i} cx={node.x} cy={node.y} r={2} className={`${GOLD_FILL}`} fillOpacity={0.55} strokeWidth={0} />
                )
            )}
        </g>
    );
}

function generic(rand: Random): ReactNode {
    const cx = n(250 + rand() * 80);
    const cy = 100;
    return (
        <g fill="none" strokeWidth={1}>
            {[18, 36, 54, 72, 90].map((r, i) => (
                <polygon
                    key={r}
                    points={`${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`}
                    className={GOLD}
                    strokeOpacity={n(0.65 - i * 0.1)}
                />
            ))}
            {[40, 80, 120, 160].map((y) => (
                <line key={y} x1={20} x2={150} y1={y} y2={y} className="stroke-terminal-border" />
            ))}
        </g>
    );
}

const MOTIFS: Record<string, (rand: Random) => ReactNode> = {
    macroeconomics: macro,
    "fixed income": fixedIncome,
    equities,
    policy,
    "digital assets": digital,
};

export default function PublicationArt({ slug, category, className = "" }: { slug: string; category: string; className?: string }) {
    const key = category.trim().toLowerCase();
    const rand = makeRandom(hash(`${slug}|${key}`));
    const motif = (MOTIFS[key] || generic)(rand);

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="xMidYMid slice"
            className={`block h-full w-full ${className}`}
            aria-hidden="true"
            focusable="false"
        >
            <g className="stroke-terminal-border" strokeWidth={1} opacity={0.7}>
                {Array.from({ length: 9 }, (_, i) => (
                    <line key={i} x1={i * 50} x2={i * 50} y1={0} y2={H} />
                ))}
            </g>
            {motif}
        </svg>
    );
}
