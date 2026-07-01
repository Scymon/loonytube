export type BlockType =
  | 'hero' | 'text' | 'image' | 'video'
  | 'cta' | 'features' | 'columns' | 'divider' | 'spacer' | 'group';

export interface FeatureItem {
  emoji?: string;
  title: string;
  desc?: string;
}

export interface Block {
  id: string;
  type: BlockType;
  props: Record<string, unknown>;
  name?: string;
  hidden?: boolean;
  groupId?: string;
}

export const BLOCK_DEFAULTS: Record<BlockType, Record<string, unknown>> = {
  hero: {
    heading: 'Welcome',
    subheading: 'Your tagline here.',
    ctaText: 'Get started',
    ctaUrl: '/',
    bgColor: '#0a1a2c',
    align: 'center',
  },
  text: { content: 'Write your content here...', align: 'left', size: 'base' },
  image: { url: '', alt: '', caption: '', size: 'full' },
  video: { videoId: '', title: '' },
  cta: {
    heading: 'Ready to get started?',
    body: '',
    buttonText: 'Sign up free',
    buttonUrl: '/signup',
    bgColor: '#0d2b3e',
  },
  features: {
    heading: 'Features',
    columns: 3,
    items: [
      { emoji: '\u26a1', title: 'Fast', desc: 'Built for speed.' },
      { emoji: '\ud83d\udd12', title: 'Secure', desc: 'Privacy first.' },
      { emoji: '\ud83c\udfa8', title: 'Beautiful', desc: 'Designed to impress.' },
    ],
  },
  columns: { ratio: '50/50', left: 'Left column content...', right: 'Right column content...' },
  divider: {},
  spacer: { height: 48 },
  group:  { name: 'New Group' },
};

export const BLOCK_META: Record<BlockType, { label: string; icon: string; desc: string }> = {
  hero:     { label: 'Hero',     icon: '\ud83e\uddb8', desc: 'Full-width header section' },
  text:     { label: 'Text',     icon: '\ud83d\udcdd', desc: 'Paragraph / markdown text' },
  image:    { label: 'Image',    icon: '\ud83d\uddbc\ufe0f', desc: 'Image with caption' },
  video:    { label: 'Video',    icon: '\ud83c\udfac', desc: 'Cloudflare Stream embed' },
  cta:      { label: 'CTA',      icon: '\ud83c\udfaf', desc: 'Call-to-action banner' },
  features: { label: 'Features', icon: '\u2728', desc: 'Feature grid (2-4 cols)' },
  columns:  { label: 'Columns',  icon: '\u25eb', desc: 'Two-column layout' },
  divider:  { label: 'Divider',  icon: '\u2014', desc: 'Horizontal rule' },
  spacer:   { label: 'Spacer',   icon: '\u2195\ufe0f', desc: 'Empty vertical space' },
  group:    { label: 'Group',    icon: '\ud83d\udcc1', desc: 'Layer group'          },
};

export const BLOCK_ORDER: BlockType[] = [
  'hero', 'text', 'image', 'video', 'cta', 'features', 'columns', 'divider', 'spacer',
];
