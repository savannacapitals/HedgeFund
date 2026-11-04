// Turns the plain-text article body stored in `research_articles.body` into structured blocks.
//
// Supported (all optional, all backwards compatible with the original "## heading" + paragraphs format):
//   ## Heading            -> section heading (also "# ")
//   ### Subheading        -> subheading (also "####")
//   - item / * item       -> bullet list
//   1. item               -> numbered list
//   > quote               -> pull quote
//   ---                   -> divider
//   | a | b |  tables     -> simple table (second row of dashes marks the header)
//   **bold**, *italic*, `code`, [text](https://link)  -> inline formatting
//
// Nothing is ever injected as HTML. The renderer builds React elements from these blocks.

export type Block =
    | { type: "h2"; id: string; text: string }
    | { type: "h3"; id: string; text: string }
    | { type: "p"; text: string }
    | { type: "ul"; items: string[] }
    | { type: "ol"; items: string[]; start: number }
    | { type: "quote"; text: string }
    | { type: "hr" }
    | { type: "table"; header: string[]; rows: string[][] };

export interface TocItem {
    id: string;
    text: string;
    level: 2 | 3;
}

/** Removes inline markers so headings can be shown (and slugged) as clean text. */
export function stripInline(text: string): string {
    return text
        .replace(/\[([^\]]+)\]\([^)\s]+\)/g, "$1")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*\s][^*]*)\*/g, "$1")
        .replace(/`([^`]+)`/g, "$1")
        .trim();
}

function slugifyHeading(text: string): string {
    const slug = text
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70)
        .replace(/-+$/g, "");
    return slug || "section";
}

const HEADING = /^(#{1,4})\s+(.+?)\s*#*\s*$/;
const BULLET = /^\s*[-*\u2022]\s+(.*)$/;
const NUMBERED = /^\s*(\d{1,3})[.)]\s+(.*)$/;
const QUOTE = /^\s*>\s?(.*)$/;
const RULE = /^\s*([-*_])(\s*\1){2,}\s*$/;
const TABLE_ROW = /^\s*\|.*\|?\s*$/;
const TABLE_DIVIDER = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;

function splitRow(line: string): string[] {
    return line
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((cell) => cell.trim());
}

export function parseArticleBody(body: string): { blocks: Block[]; toc: TocItem[] } {
    const lines = String(body || "").replace(/\r\n?/g, "\n").split("\n");
    const blocks: Block[] = [];
    const toc: TocItem[] = [];
    const used = new Map<string, number>();

    const uniqueId = (text: string) => {
        const base = slugifyHeading(text);
        const seen = used.get(base) || 0;
        used.set(base, seen + 1);
        return seen === 0 ? base : `${base}-${seen + 1}`;
    };

    let paragraph: string[] = [];
    const flushParagraph = () => {
        if (paragraph.length) {
            blocks.push({ type: "p", text: paragraph.join("\n") });
            paragraph = [];
        }
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (!line.trim()) {
            flushParagraph();
            continue;
        }

        const heading = line.match(HEADING);
        if (heading) {
            flushParagraph();
            const level = heading[1].length <= 2 ? 2 : 3;
            const text = stripInline(heading[2]);
            const id = uniqueId(text);
            blocks.push({ type: level === 2 ? "h2" : "h3", id, text });
            toc.push({ id, text, level });
            continue;
        }

        if (RULE.test(line)) {
            flushParagraph();
            blocks.push({ type: "hr" });
            continue;
        }

        // Table: a row of pipes followed by a divider row
        if (TABLE_ROW.test(line) && i + 1 < lines.length && TABLE_DIVIDER.test(lines[i + 1]) && lines[i + 1].includes("-")) {
            flushParagraph();
            const header = splitRow(line);
            const rows: string[][] = [];
            i += 2;
            while (i < lines.length && lines[i].trim() && TABLE_ROW.test(lines[i])) {
                rows.push(splitRow(lines[i]));
                i++;
            }
            i--;
            blocks.push({ type: "table", header, rows });
            continue;
        }

        if (QUOTE.test(line)) {
            flushParagraph();
            const quote: string[] = [];
            while (i < lines.length && QUOTE.test(lines[i]) && lines[i].trim()) {
                quote.push((lines[i].match(QUOTE) as RegExpMatchArray)[1]);
                i++;
            }
            i--;
            blocks.push({ type: "quote", text: quote.join("\n").trim() });
            continue;
        }

        if (BULLET.test(line)) {
            flushParagraph();
            const items: string[] = [];
            while (i < lines.length && lines[i].trim()) {
                const bullet = lines[i].match(BULLET);
                if (bullet) items.push(bullet[1].trim());
                else if (!HEADING.test(lines[i]) && !NUMBERED.test(lines[i]) && items.length) items[items.length - 1] += " " + lines[i].trim();
                else break;
                i++;
            }
            i--;
            blocks.push({ type: "ul", items });
            continue;
        }

        if (NUMBERED.test(line)) {
            flushParagraph();
            const first = line.match(NUMBERED) as RegExpMatchArray;
            const items: string[] = [];
            while (i < lines.length && lines[i].trim()) {
                const numbered = lines[i].match(NUMBERED);
                if (numbered) items.push(numbered[2].trim());
                else if (!HEADING.test(lines[i]) && !BULLET.test(lines[i]) && items.length) items[items.length - 1] += " " + lines[i].trim();
                else break;
                i++;
            }
            i--;
            blocks.push({ type: "ol", items, start: parseInt(first[1], 10) || 1 });
            continue;
        }

        paragraph.push(line.trimEnd());
    }
    flushParagraph();

    return { blocks, toc };
}
