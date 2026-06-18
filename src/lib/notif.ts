export type Notif = {
  id: string; actor_id: string | null; actor_username: string | null; actor_name: string | null;
  actor_avatar: string | null; type: string; entity_type: string | null; entity_id: string | null;
  read: boolean; created_at: string;
};

export const NOTIF_VERB: Record<string, string> = {
  follow: "followed you",
  post_like: "liked your post",
  video_like: "liked your video",
  comment: "commented on your thread",
  video_comment: "commented on your video",
  dm: "sent you a message",
};

export function notifHref(n: Notif): string | null {
  if (n.type === "dm") return n.actor_id ? `/messages?to=${n.actor_id}` : "/messages";
  if (!n.entity_id) return null;
  if (n.entity_type === "post") return `/post/${n.entity_id}`;
  if (n.entity_type === "video") return `/watch/${n.entity_id}`;
  return null; // profile pages not built yet
}
