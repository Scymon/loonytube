// Article composer domain types. Shared by the composer, its blocks, and helpers.

export type BlockType = "text" | "h2" | "h3" | "quote" | "code" | "image" | "divider" | "video";

export type Block = {
  id: string;
  type: BlockType;
  value?: string;
  url?: string;
  caption?: string;
  videoId?: string;
  videoTitle?: string;
  videoThumb?: string;
};

export type BlockConfig = { type: BlockType; icon: string; label: string };

export const BLOCK_TYPES: BlockConfig[] = [
  { type: "text",    icon: "\u00b6",   label: "Paragraph" },
  { type: "h2",      icon: "H2",  label: "Heading 2" },
  { type: "h3",      icon: "H3",  label: "Heading 3" },
  { type: "quote",   icon: "\u275d",   label: "Pull quote" },
  { type: "code",    icon: "</>", label: "Code" },
  { type: "divider", icon: "\u2014",   label: "Divider" },
  { type: "image",   icon: "\u229e",   label: "Image" },
  { type: "video",   icon: "\u25b6",   label: "Video" },
];

export type VideoRow = { id: string; title: string; thumbnail: string | null };
