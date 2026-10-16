import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin-nav";
import { listPublicationRequests } from "@/lib/publication-requests";

export const dynamic = "force-dynamic";

async function pendingRequestCount() {
  try {
    return (await listPublicationRequests()).filter((request) => request.status === "pending_review").length;
  } catch (error) {
    console.error("admin pending requests count failed", error);
    return 0;
  }
}

export default async function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="admin-shell">
      <AdminNav pendingRequests={await pendingRequestCount()} />
      <div className="admin-shell-main">{children}</div>
    </div>
  );
}
