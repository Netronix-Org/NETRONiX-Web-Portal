import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/auth";
import { hasAdminPermission } from "@/lib/admin-permissions.server";
import ComplaintsDesk from "./complaints-desk";

export default async function ComplaintsPage() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/admin/login?next=/admin/complaints");
  if (!await hasAdminPermission(admin.role, "complaints")) redirect("/admin/portal");
  return <ComplaintsDesk currentUser={{ id: admin.id, name: admin.name, email: admin.email, role: admin.role }} />;
}
