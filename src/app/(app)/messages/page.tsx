import { redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import Messenger from "@/components/messages/Messenger";

export const dynamic = "force-dynamic";
export const metadata = { title: "Messages · LoonyTube" };

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <Suspense fallback={null}><Messenger meId={user.id} /></Suspense>;
}
