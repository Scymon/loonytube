import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NotificationList from "@/components/notifications/NotificationList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notifications · LoonyTube" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <NotificationList meId={user.id} />;
}
