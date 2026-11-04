import type { ReactNode } from "react";
import type { ArticleBlock } from "@/lib/research/format";

/**
 * Renders parsed article blocks as React elements. Text is never injected as HTML, so an article
 * body cannot add markup or scripts to the page.
 */

// **bold**, *italic*, and [label](https://link) or [label](/internal-path)
const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*|\[[^\]\n]+\]\((?:https?:\/\/|\/)[^)\s]*\))/g;

function renderInline(text: string): ReactNode[] {
    return text.split(INLINE).map((part, index) => {
        if (!part) return null;
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
            return (
                <strong key={index} className="font-semibold text-terminal-text">
                    {part.slice(2, -2)}
                </strong>
            );
        }
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
            return <em key={index}>{part.slice(1, -1)}</em>;
        }
        const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (link) {
            const external = /^https?:\/\//.test(link[2]);
            return (
                <a
                    key={index}
                    href={link[2]}
                    {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                    className="text-terminal-gold underline decoration-terminal-gold/40 underline-offset-4 transition-colors hover:decoration-terminal-gold"
                >
                    {link[1]}
                </a>
            );
        }
        return part;
    });
}

export default function ArticleBody({ blocks }: { blocks: ArticleBlock[] }) {
    return (
        <div className="font-editorial text-[1.0625rem] leading-[1.8] text-terminal-text/90 sm:text-[1.1875rem] sm:leading-[1.85]">
            {blocks.map((block, index) => {
                switch (block.type) {
                    case "heading":
                        return block.level === 2 ? (
                            <h2
                                key={index}
                                id={block.id}
                                className="mb-5 mt-14 scroll-mt-28 border-t border-terminal-border pt-8 font-headline text-[1.6rem] leading-[1.25] tracking-[-0.01em] text-terminal-text first:mt-0 first:border-t-0 first:pt-0 sm:text-[1.9rem]"
                            >
                                {block.text}
                            </h2>
                        ) : (
                            <h3
                                key={index}
                                id={block.id}
                                className="mb-3 mt-10 scroll-mt-28 font-editorial text-[1.2rem] font-semibold leading-snug text-terminal-text sm:text-[1.35rem]"
                            >
                                {block.text}
                            </h3>
                        );
                    case "list": {
                        const items = block.items.map((item, i) => (
                            <li key={i} className="pl-1.5">
                                {renderInline(item)}
                            </li>
                        ));
                        return block.ordered ? (
                            <ol key={index} className="mb-6 list-decimal space-y-3 pl-7 marker:font-mono marker:text-[.8em] marker:text-terminal-gold">
                                {items}
                            </ol>
                        ) : (
                            <ul key={index} className="mb-6 list-disc space-y-3 pl-6 marker:text-terminal-gold">
                                {items}
                            </ul>
                        );
                    }
                    case "quote":
                        return (
                            <blockquote
                                key={index}
                                className="my-9 whitespace-pre-line border-l-2 border-terminal-gold pl-6 text-[1.2em] italic leading-[1.6] text-terminal-text"
                            >
                                {renderInline(block.text)}
                            </blockquote>
                        );
                    case "rule":
                        return <hr key={index} className="my-10 border-0 border-t border-terminal-border" />;
                    default:
                        return (
                            <p key={index} className="mb-6 whitespace-pre-line">
                                {renderInline(block.text)}
                            </p>
                        );
                }
            })}
        </div>
    );
}
