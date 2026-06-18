"use client";

import { useState } from "react";
import InviteFront from "@/components/auth/InviteFront";
import SignupForm from "@/components/auth/SignupForm";

export default function SignupFlow({ inviteOnly }: { inviteOnly: boolean }) {
  const [code, setCode] = useState<string | null>(null);
  if (inviteOnly && !code) return <InviteFront onValid={setCode} />;
  return <SignupForm inviteCode={code ?? undefined} />;
}
