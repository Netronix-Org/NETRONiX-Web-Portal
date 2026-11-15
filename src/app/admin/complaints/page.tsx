import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin-permissions.server";
import ComplaintsDesk from "./complaints-desk";

export default async function ComplaintsPage() {
  const session = await getSession();
  if (!session) redirect("/admin/login?next=/admin/complaints");
  if (!await hasAdminPermission(session.role, "complaints")) redirect("/admin/portal");
  return <ComplaintsDesk />;
}
