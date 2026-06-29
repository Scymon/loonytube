import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import DmShell from "@/components/threads/dms/DmShell";

export const dynamic = "force-dynamic";

export default async function DmConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <Suspense fallback={null}>
      <DmShell conversationId={id} meId={user.id} />
    </Suspense>
  );
}
