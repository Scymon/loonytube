"use client";

// Left toolbar group: back to pages + inline-editable page title.
export default function TitleBar({
  title, setTitle, onSaveTitle, onClose,
}: {
  title: string;
  setTitle: (v: string) => void;
  onSaveTitle: () => void;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 text-sm text-mist hover:text-foam transition-colors shrink-0"
        title="Back to pages list"
      >
        ← Pages
      </button>
      <span className="text-mist/30 select-none">│</span>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={onSaveTitle}
        className="min-w-0 flex-1 bg-transparent text-sm font-semibold text-foam outline-none
          placeholder:text-mist hover:text-white focus:text-white"
        placeholder="Page title"
      />
    </div>
  );
}
