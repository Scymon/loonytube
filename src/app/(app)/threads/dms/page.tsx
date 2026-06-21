import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import DmShell from "@/components/threads/dms/DmShell";

export const dynamic = "force-dynamic";

export default async function DmsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return (
    <Suspense fallback={null}>
      <DmShell meId={user.id} />
    </Suspense>
  );
}
