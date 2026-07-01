import { renderMd } from "@/lib/renderMd";
import type { InlineEditProps } from "./BlockRenderer";

type Props = { props: Record<string, unknown> } & InlineEditProps;

export default function TextBlock({ props, editing = false, onEdit }: Props) {
  const content    = (props.content    as string) || "";
  const align      = (props.align      as string) || "left";
  const size       = (props.size       as string) || "base";
  const padTop     = (props.padTop     as number) ?? 24;
  const padBottom  = (props.padBottom  as number) ?? 24;
  const textColor  = (props.textColor  as string) || "";
  const bgColor    = (props.bgColor    as string) || "";
  const sizeClass  = size === "sm" ? "text-sm" : size === "lg" ? "text-lg" : "text-base";
  const alignClass = align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left";

  return (
    <div
      className={`mx-auto max-w-2xl px-6 ${sizeClass} ${alignClass}`}
      style={{
        paddingTop: padTop,
        paddingBottom: padBottom,
        ...(textColor ? { color: textColor } : {}),
        ...(bgColor   ? { background: bgColor } : {}),
      }}
    >
      {editing ? (
        <textarea
          autoFocus
          className="w-full bg-panel/60 border border-teal/30 rounded-xl text-foam font-mono text-sm
            leading-relaxed p-4 outline-none focus:border-teal/60 resize-none transition-colors"
          value={content}
          onChange={(e) => onEdit?.("content", e.target.value)}
          rows={Math.max(4, content.split("\n").length + 2)}
          placeholder="Write markdown here..."
        />
      ) : (
        <div className="space-y-2">
          {content ? renderMd(content) : (
            <p className="text-mist/40 italic text-sm">Double-click to add text...</p>
          )}
        </div>
      )}
    </div>
  );
}
