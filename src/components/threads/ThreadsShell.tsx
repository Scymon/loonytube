import ThreadsSidebar from "@/components/threads/ThreadsSidebar";
import ThreadsTabBar from "@/components/threads/ThreadsTabBar";

export default function ThreadsShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full">
      <ThreadsSidebar />
      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <ThreadsTabBar />
        {children}
      </div>
    </div>
  );
}
