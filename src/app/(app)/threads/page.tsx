import { redirect } from "next/navigation";

export default function ThreadsHome() {
  // When more sections exist (Posts, Groups, Channels), this becomes
  // a mobile section-picker. For now, DMs are the primary section.
  redirect("/threads/dms");
}
