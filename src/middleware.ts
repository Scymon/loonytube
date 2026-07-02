import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Skip static assets entirely: they need no session, and the auth check
  // costs a network round-trip to Supabase on every matched request.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/stream-webhook|.*\\.(?:png|jpg|jpeg|gif|svg|webp|avif|ico|txt|xml|json|woff2?|ttf|mp4|webm)$).*)"],
};
