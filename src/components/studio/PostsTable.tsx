"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { nfmt, ago } from "@/lib/format";

export type ThreadRow = {
  id: string; body: string; comments: number; likes: number; created_at: string;
};

export default function PostsTable({ initial }: { initial: ThreadRow[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState(initial);

  async function remove(id: string) {
    if (!confirm("Delete this thread? The post and all its comments will be removed.")) return;
    const { error } = await supabase.from("posts").delete().eq("id", id);
    if (!error) setRows((rs) => rs.filter((r) => r.id !== id));
  }

  if (rows.length === 0) {
    return <p className="rounded-xl border border-edge bg-surface px-4 py-10 text-center text-sm text-mist">No threads yet. <Link href="/create" className="text-teal hover:underline">Start a thread</Link>.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-edge">
      <table className="w-full min-w-[680px] text-sm">
        <thead className="border-b border-edge bg-surface text-left text-xs uppercase tracking-wide text-mist">
          <tr>
            <th className="px-4 py-3 font-semibold">Thread (original post)</th>
            <th className="px-3 py-3 text-right font-semibold">Comments</th>
            <th className="px-3 py-3 text-right font-semibold">Likes</th>
            <th className="px-3 py-3 font-semibold">Date</th>
            <th className="px-3 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-edge">
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-edge/30">
              <td className="px-4 py-3"><p className="line-clamp-2 max-w-lg text-foam">{r.body}</p></td>
              <td className="px-3 py-3 text-right text-foam">{nfmt(r.comments)}</td>
              <td className="px-3 py-3 text-right text-foam">{nfmt(r.likes)}</td>
              <td className="px-3 py-3 text-mist">{ago(r.created_at)}</td>
              <td className="px-3 py-3">
                <div className="flex items-center justify-end gap-3 whitespace-nowrap">
                  <Link href={`/post/${r.id}`} className="font-semibold text-teal hover:underline">View</Link>
                  <button onClick={() => remove(r.id)} className="text-mist hover:text-loonred">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
