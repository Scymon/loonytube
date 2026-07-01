export default function VideoBlock({ props }: { props: Record<string, unknown> }) {
  const videoId  = props.videoId as string;
  const title    = (props.title    as string) || "";
  const autoplay = !!(props.autoplay);
  const loop     = !!(props.loop);
  const muted    = (props.muted as boolean) !== false;

  if (!videoId) {
    return (
      <div className="mx-auto my-6 flex h-48 max-w-3xl items-center justify-center rounded-xl border border-dashed border-edge bg-panel text-sm text-mist">
        No video ID set
      </div>
    );
  }

  return (
    <div className="mx-auto my-6 max-w-3xl px-4">
      <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingTop: '56.25%' }}>
        <iframe
          src={`https://iframe.cloudflarestream.com/${videoId}?controls=true${autoplay ? "&autoplay=true" : ""}${loop ? "&loop=true" : ""}${muted ? "&muted=true" : ""}`}
          title={title || "Video"}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
      {title && <p className="mt-2 text-center text-sm text-mist">{title}</p>}
    </div>
  );
}
