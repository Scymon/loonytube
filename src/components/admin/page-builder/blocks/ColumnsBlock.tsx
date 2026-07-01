import { renderMd } from "@/lib/renderMd";

export default function ColumnsBlock({ props }: { props: Record<string, unknown> }) {
  const ratio = (props.ratio as string) || '50/50';
  const left  = (props.left  as string) || '';
  const right = (props.right as string) || '';

  const [lw, rw] = ratio === '33/67' ? ['w-1/3', 'w-2/3']
                 : ratio === '67/33' ? ['w-2/3', 'w-1/3']
                 : ['w-1/2', 'w-1/2'];

  return (
    <div className="mx-auto max-w-4xl px-6 py-8 flex flex-col sm:flex-row gap-8">
      <div className={`${lw} space-y-1`}>{renderMd(left)}</div>
      <div className={`${rw} space-y-1`}>{renderMd(right)}</div>
    </div>
  );
}
