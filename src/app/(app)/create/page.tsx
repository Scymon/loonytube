import CreateTabs from "@/components/create/CreateTabs";

export const metadata = { title: "Create · LoonyTube" };

export default function CreatePage() {
  return (
    <div className="mx-auto max-w-3xl">
      <CreateTabs />
    </div>
  );
}
