import { Fragment } from "react";

type InlineNode =
  | { t: "text"; v: string }
  | { t: "bold"; v: InlineNode[] }
  | { t: "italic"; v: InlineNode[] }
  | { t: "underline"; v: InlineNode[] }
  | { t: "strike"; v: InlineNode[] }
  | { t: "code"; v: string };

function parseInline(src: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let i = 0;

  function peek(s: string) {
    return src.startsWith(s, i);
  }

  function consumeUntil(end: string): string | null {
    const start = i;
    while (i < src.length) {
      if (src.startsWith(end, i)) {
        const text = src.slice(start, i);
        i += end.length;
        return text;
      }
      i++;
    }
    i = start;
    return null;
  }

  function consumeWrapped(end: string): InlineNode[] | null {
    const saved = i;
    const buf: string[] = [];
    while (i < src.length) {
      if (src.startsWith(end, i)) {
        const text = buf.join("");
        i += end.length;
        return parseInline(text);
      }
      buf.push(src[i]);
      i++;
    }
    i = saved;
    return null;
  }

  while (i < src.length) {
    if (peek("**")) {
      i += 2;
      const inner = consumeWrapped("**");
      if (inner) { nodes.push({ t: "bold", v: inner }); continue; }
      nodes.push({ t: "text", v: "**" });
      continue;
    }
    if (peek("__")) {
      i += 2;
      const inner = consumeWrapped("__");
      if (inner) { nodes.push({ t: "underline", v: inner }); continue; }
      nodes.push({ t: "text", v: "__" });
      continue;
    }
    if (peek("~~")) {
      i += 2;
      const inner = consumeWrapped("~~");
      if (inner) { nodes.push({ t: "strike", v: inner }); continue; }
      nodes.push({ t: "text", v: "~~" });
      continue;
    }
    if (peek("*") && !peek("**")) {
      i += 1;
      const inner = consumeWrapped("*");
      if (inner) { nodes.push({ t: "italic", v: inner }); continue; }
      nodes.push({ t: "text", v: "*" });
      continue;
    }
    if (peek("`")) {
      i += 1;
      const text = consumeUntil("`");
      if (text !== null) { nodes.push({ t: "code", v: text }); continue; }
      nodes.push({ t: "text", v: "`" });
      continue;
    }

    const last = nodes[nodes.length - 1];
    if (last && last.t === "text") {
      last.v += src[i];
    } else {
      nodes.push({ t: "text", v: src[i] });
    }
    i++;
  }

  return nodes;
}

function renderInline(nodes: InlineNode[], keyPrefix = ""): React.ReactNode {
  return nodes.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`;
    if (node.t === "text") return <Fragment key={key}>{node.v}</Fragment>;
    if (node.t === "bold") return <strong key={key} className="font-bold text-foreground">{renderInline(node.v, key)}</strong>;
    if (node.t === "italic") return <em key={key} className="italic">{renderInline(node.v, key)}</em>;
    if (node.t === "underline") return <u key={key}>{renderInline(node.v, key)}</u>;
    if (node.t === "strike") return <s key={key} className="line-through">{renderInline(node.v, key)}</s>;
    if (node.t === "code") return (
      <code key={key} className="bg-muted/80 border border-border text-xs font-mono px-1.5 py-0.5 rounded">
        {node.v}
      </code>
    );
    return null;
  });
}

type BlockNode =
  | { t: "h1" | "h2" | "h3"; src: string }
  | { t: "blockquote"; src: string }
  | { t: "listitem"; src: string }
  | { t: "codeblock"; lines: string[]; lang: string }
  | { t: "paragraph"; src: string };

function parseBlocks(text: string): BlockNode[] {
  const lines = text.split("\n");
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.trimStart().startsWith("```")) {
      const lang = line.trimStart().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++;
      blocks.push({ t: "codeblock", lines: codeLines, lang });
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push({ t: "h3", src: line.slice(4) });
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ t: "h2", src: line.slice(3) });
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push({ t: "h1", src: line.slice(2) });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      blocks.push({ t: "blockquote", src: line.slice(2) });
      i++;
      continue;
    }

    // List item
    if (/^[-*] /.test(line)) {
      blocks.push({ t: "listitem", src: line.slice(2) });
      i++;
      continue;
    }

    blocks.push({ t: "paragraph", src: line });
    i++;
  }

  return blocks;
}

export function DiscordMarkdown({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseBlocks(text);

  const rendered: React.ReactNode[] = [];
  let listBuffer: { t: "listitem"; src: string }[] = [];

  function flushList() {
    if (!listBuffer.length) return;
    rendered.push(
      <ul key={`list-${rendered.length}`} className="space-y-1 pl-1 my-1">
        {listBuffer.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-primary/70 flex-shrink-0" />
            <span>{renderInline(parseInline(item.src), `li-${i}`)}</span>
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  }

  blocks.forEach((block, idx) => {
    if (block.t === "listitem") {
      listBuffer.push(block);
      return;
    }
    flushList();

    if (block.t === "h1") {
      rendered.push(
        <h2 key={idx} className="text-xl font-bold tracking-tight text-foreground mt-1">
          {renderInline(parseInline(block.src), `h1-${idx}`)}
        </h2>
      );
    } else if (block.t === "h2") {
      rendered.push(
        <h3 key={idx} className="text-base font-bold text-foreground mt-1">
          {renderInline(parseInline(block.src), `h2-${idx}`)}
        </h3>
      );
    } else if (block.t === "h3") {
      rendered.push(
        <h4 key={idx} className="text-sm font-semibold text-foreground mt-0.5">
          {renderInline(parseInline(block.src), `h3-${idx}`)}
        </h4>
      );
    } else if (block.t === "blockquote") {
      rendered.push(
        <div key={idx} className="flex gap-2.5 my-0.5">
          <div className="w-1 rounded-full bg-muted-foreground/40 flex-shrink-0" />
          <p className="text-muted-foreground italic">
            {renderInline(parseInline(block.src), `bq-${idx}`)}
          </p>
        </div>
      );
    } else if (block.t === "codeblock") {
      rendered.push(
        <pre key={idx} className="bg-muted/60 border border-border rounded-lg p-3 text-xs font-mono overflow-x-auto my-1">
          {block.lines.join("\n")}
        </pre>
      );
    } else if (block.t === "paragraph") {
      if (block.src === "") {
        rendered.push(<div key={idx} className="h-1" />);
      } else {
        rendered.push(
          <p key={idx}>
            {renderInline(parseInline(block.src), `p-${idx}`)}
          </p>
        );
      }
    }
  });

  flushList();

  return (
    <div className={`space-y-0.5 text-sm leading-relaxed ${className}`}>
      {rendered}
    </div>
  );
}
