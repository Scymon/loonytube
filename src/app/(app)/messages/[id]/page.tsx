import { redirect } from "next/navigation";
export default function MessageConvoRedirect({ params }: { params: { id: string } }) {
  redirect(`/threads/dms/${params.id}`);
}
