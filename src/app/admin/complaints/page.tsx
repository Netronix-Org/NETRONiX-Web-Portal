"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { uiSounds } from "@/lib/audio";
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  Download,
  LogOut,
  RefreshCw,
  Search,
  XCircle,
  UserCheck,
  Send,
} from "lucide-react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER";
}

interface ComplaintItem {
  id: string;
  ticketId: string;
  name: string;
  email: string;
  location: string;
  issueType: "NETWORK" | "WIFI" | "LAN" | "OTHER";
  description: string;
  status: "REPORTED" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "REJECTED";
  adminResponse: string | null;
  assignedToId: string | null;
  assignedTo?: { id: string; name: string; email: string; role: string } | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  _count?: { history: number };
}

interface StatusHistoryItem {
  id: string;
  previousStatus: string | null;
  newStatus: string;
  notes: string | null;
  createdAt: string;
  changedBy?: { name: string; email: string; role: string } | null;
}

interface StatsData {
  total: number;
  reported: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  rejected: number;
  recent24h: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  REPORTED: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  ASSIGNED: { bg: "bg-blue-500/10", text: "text-blue-400", border: "border-blue-500/30" },
  IN_PROGRESS: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
  RESOLVED: { bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  REJECTED: { bg: "bg-neutral-500/10", text: "text-neutral-400", border: "border-neutral-500/30" },
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  REPORTED: ["ASSIGNED", "IN_PROGRESS", "RESOLVED", "REJECTED"],
  ASSIGNED: ["IN_PROGRESS", "RESOLVED", "REJECTED", "REPORTED"],
  IN_PROGRESS: ["RESOLVED", "REJECTED", "ASSIGNED"],
  RESOLVED: ["IN_PROGRESS"],
  REJECTED: ["REPORTED"],
};

/** The desk's active filters as a query-string, shared by the list fetch and the CSV export link. */
function filterParams(query: string, status: string, issueType: string, assignedToId: string) {
  const params = new URLSearchParams();
  if (query) params.set("query", query);
  if (status) params.set("status", status);
  if (issueType) params.set("issueType", issueType);
  if (assignedToId) params.set("assignedToId", assignedToId);
  return params;
}

export default function AdminDashboardPage() {
  const router = useRouter();

  // Current admin session
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);
  const [staffList, setStaffList] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & Pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [issueTypeFilter, setIssueTypeFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selected Detail Modal
  const [selectedTicket, setSelectedTicket] = useState<ComplaintItem | null>(null);
  const [ticketHistory, setTicketHistory] = useState<StatusHistoryItem[]>([]);
  const [savingAction, setSavingAction] = useState(false);

  // Edit fields inside modal
  const [newStatus, setNewStatus] = useState<string>("");
  const [newAssignedTo, setNewAssignedTo] = useState<string>("");
  const [adminResponseText, setAdminResponseText] = useState("");
  const [auditNoteText, setAuditNoteText] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);

  // 1. Fetch Current User
  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthenticated");
        return res.json();
      })
      .then((data) => setCurrentUser(data.admin))
      .catch(() => {
        router.push("/admin/login");
      });
  }, [router]);

  // 2. Fetch Stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 3. Fetch Staff List
  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setStaffList(data.users || []);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // 4. Fetch Complaints List
  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const params = filterParams(searchQuery, statusFilter, issueTypeFilter, assignedFilter);
      params.set("page", currentPage.toString());
      params.set("limit", "12");

      const res = await fetch(`/api/admin/complaints?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
        setTotalPages(data.pagination.totalPages || 1);
        setTotalCount(data.pagination.total || 0);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, searchQuery, statusFilter, issueTypeFilter, assignedFilter]);

  useEffect(() => {
    // Initial fetch on mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
    fetchStaff();
  }, [fetchStats, fetchStaff]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchComplaints();
  }, [fetchComplaints]);

  // Handle Manual Refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchStats();
    fetchComplaints();
  };

  // Open Detail Modal
  const handleOpenDetail = async (complaint: ComplaintItem) => {
    setSelectedTicket(complaint);
    setNewStatus(complaint.status);
    setNewAssignedTo(complaint.assignedToId || "");
    setAdminResponseText(complaint.adminResponse || "");
    setAuditNoteText("");
    setUpdateError(null);
    setUpdateSuccess(null);
    uiSounds.playClick();

    try {
      const res = await fetch(`/api/admin/complaints/${complaint.ticketId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTicket(data.complaint);
        setTicketHistory(data.complaint.history || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Save Modal Updates
  const handleSaveUpdates = async () => {
    if (!selectedTicket) return;
    setSavingAction(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const payload: {
        status?: string;
        assignedToId?: string | null;
        adminResponse?: string | null;
        notes?: string;
      } = {};

      if (newStatus !== selectedTicket.status) {
        payload.status = newStatus;
      }

      if (newAssignedTo !== (selectedTicket.assignedToId || "")) {
        payload.assignedToId = newAssignedTo ? newAssignedTo : null;
      }

      if (adminResponseText !== (selectedTicket.adminResponse || "")) {
        payload.adminResponse = adminResponseText;
      }

      if (auditNoteText.trim()) {
        payload.notes = auditNoteText.trim();
      }

      const res = await fetch(`/api/complaints/${selectedTicket.ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update complaint");
      }

      uiSounds.playClick();
      setUpdateSuccess("Ticket updated successfully & notifications queued.");
      // Refresh local list and detail
      fetchComplaints();
      fetchStats();

      // Refresh ticket detail
      const detailRes = await fetch(`/api/admin/complaints/${selectedTicket.ticketId}`);
      if (detailRes.ok) {
        const detailData = await detailRes.json();
        setSelectedTicket(detailData.complaint);
        setTicketHistory(detailData.complaint.history || []);
      }
    } catch (err) {
      setUpdateError(err instanceof Error ? err.message : "Error saving updates");
    } finally {
      setSavingAction(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    uiSounds.playClick();
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col">
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <header className="border-b border-white/10 bg-[#0A0A0A]/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="font-heading font-bold text-xl tracking-tight text-white">
              NETRON<span style={{ color: "#E11D2E" }}>iX</span>
            </Link>
            <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-xs font-mono bg-red-500/10 text-red-400 border border-red-500/20">
              Operations Core
            </span>
          </div>

          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="flex items-center gap-3">
                <Link
                  href="/admin/portal"
                  className="hidden md:inline-block px-3 py-1.5 rounded-lg text-xs font-mono font-medium border border-white/10 bg-[#141414] hover:bg-[#1A1A1A] transition-colors"
                >
                  Events Portal
                </Link>
                <div className="w-8 h-8 rounded-full bg-neutral-800 border border-white/10 flex items-center justify-center text-sm font-semibold text-neutral-300">
                  {currentUser.name[0]}
                </div>
                <div className="hidden md:block text-left text-xs">
                  <p className="font-medium text-white">{currentUser.name}</p>
                  <p className="text-neutral-500 uppercase font-mono">{currentUser.role}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-8">
        {/* Top bar & actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl sm:text-3xl font-semibold tracking-tight">
              Network Operations Desk
            </h1>
            <p className="text-sm text-neutral-400 mt-1">
              Active student network complaints and infrastructure incident queue.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={`/api/admin/complaints/export?${filterParams(searchQuery, statusFilter, issueTypeFilter, assignedFilter).toString()}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-medium border border-white/10 bg-[#141414] hover:bg-[#1A1A1A] transition-colors"
              title="Download the complaints matching the current filters as CSV"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </a>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-mono font-medium border border-white/10 bg-[#141414] hover:bg-[#1A1A1A] transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Overview Metrics Grid ─────────────────────────────────────────── */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard
              label="Total Complaints"
              value={stats.total}
              icon={Activity}
              color="text-white"
              border="border-white/10"
            />
            <MetricCard
              label="Reported"
              value={stats.reported}
              icon={AlertCircle}
              color="text-red-400"
              border="border-red-500/20"
              pulse
            />
            <MetricCard
              label="Assigned"
              value={stats.assigned}
              icon={UserCheck}
              color="text-blue-400"
              border="border-blue-500/20"
            />
            <MetricCard
              label="In Progress"
              value={stats.inProgress}
              icon={Clock}
              color="text-amber-400"
              border="border-amber-500/20"
            />
            <MetricCard
              label="Resolved"
              value={stats.resolved}
              icon={CheckCircle2}
              color="text-emerald-400"
              border="border-emerald-500/20"
            />
            <MetricCard
              label="Rejected"
              value={stats.rejected}
              icon={XCircle}
              color="text-neutral-400"
              border="border-neutral-500/20"
            />
          </div>
        )}

        {/* ── Filters & Search ─────────────────────────────────────────────── */}
        <div className="p-4 rounded-2xl border border-white/10 bg-[#0E0E0E] flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              placeholder="Search ID, name, email, room…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 rounded-xl text-sm bg-[#161616] border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs font-mono bg-[#161616] border border-white/10 text-neutral-300 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="">All Statuses</option>
              <option value="REPORTED">Reported</option>
              <option value="ASSIGNED">Assigned</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>

            {/* Category filter */}
            <select
              value={issueTypeFilter}
              onChange={(e) => {
                setIssueTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs font-mono bg-[#161616] border border-white/10 text-neutral-300 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="">All Issue Categories</option>
              <option value="NETWORK">Network / General</option>
              <option value="WIFI">Campus WiFi</option>
              <option value="LAN">LAN / Ethernet</option>
              <option value="OTHER">Other</option>
            </select>

            {/* Assigned filter */}
            <select
              value={assignedFilter}
              onChange={(e) => {
                setAssignedFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 rounded-xl text-xs font-mono bg-[#161616] border border-white/10 text-neutral-300 focus:outline-none focus:border-red-500 cursor-pointer"
            >
              <option value="">All Assignees</option>
              <option value="unassigned">Unassigned</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Complaints Table ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-white/10 bg-[#0E0E0E] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-[#141414] text-[11px] font-mono uppercase text-neutral-400 tracking-wider">
                  <th className="py-3.5 px-4 font-medium">Ticket ID</th>
                  <th className="py-3.5 px-4 font-medium">Student / Email</th>
                  <th className="py-3.5 px-4 font-medium">Location</th>
                  <th className="py-3.5 px-4 font-medium">Category</th>
                  <th className="py-3.5 px-4 font-medium">Status</th>
                  <th className="py-3.5 px-4 font-medium">Assignee</th>
                  <th className="py-3.5 px-4 font-medium">Logged</th>
                  <th className="py-3.5 px-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-500 font-mono">
                      Loading queue data…
                    </td>
                  </tr>
                ) : complaints.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-neutral-500 font-mono">
                      No complaints found matching the criteria.
                    </td>
                  </tr>
                ) : (
                  complaints.map((c) => {
                    const statusMeta = STATUS_COLORS[c.status] || STATUS_COLORS.REPORTED;
                    return (
                      <tr
                        key={c.id}
                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                        onClick={() => handleOpenDetail(c)}
                      >
                        <td className="py-4 px-4 font-mono font-bold text-white text-xs whitespace-nowrap">
                          {c.ticketId}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-medium text-white">{c.name}</p>
                          <p className="text-xs text-neutral-500 font-mono">{c.email}</p>
                        </td>
                        <td className="py-4 px-4 text-neutral-300 text-xs whitespace-nowrap">
                          {c.location}
                        </td>
                        <td className="py-4 px-4 text-neutral-400 text-xs font-mono uppercase">
                          {c.issueType}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-mono font-medium border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                          >
                            {c.status.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs whitespace-nowrap">
                          {c.assignedTo ? (
                            <span className="text-neutral-200 font-medium">{c.assignedTo.name}</span>
                          ) : (
                            <span className="text-neutral-600 font-mono">Unassigned</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-xs text-neutral-500 font-mono whitespace-nowrap">
                          {new Date(c.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleOpenDetail(c)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-red-500 hover:text-white text-neutral-300 transition-colors cursor-pointer"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-neutral-400 font-mono">
            <span>
              Showing {complaints.length} of {totalCount} total entries
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1 || loading}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Previous
              </button>
              <span>
                Page {currentPage} of {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages || loading}
                onClick={() => setCurrentPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Detail / Triage Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 10 }}
              transition={{ duration: 0.3 }}
              className="w-full max-w-3xl my-8 rounded-3xl border border-white/10 bg-[#0F0F0F] p-6 sm:p-8 flex flex-col gap-6 shadow-2xl relative"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="font-heading font-bold text-xl text-white">
                      Ticket {selectedTicket.ticketId}
                    </h2>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-medium border ${
                        STATUS_COLORS[selectedTicket.status]?.bg
                      } ${STATUS_COLORS[selectedTicket.status]?.text} ${
                        STATUS_COLORS[selectedTicket.status]?.border
                      }`}
                    >
                      {selectedTicket.status.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 font-mono mt-1">
                    Logged on {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedTicket(null)}
                  className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-white/5 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Alerts inside modal */}
              {updateError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono">
                  {updateError}
                </div>
              )}
              {updateSuccess && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-mono">
                  {updateSuccess}
                </div>
              )}

              {/* Student Metadata Card */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-[#141414] border border-white/5 text-xs">
                <div>
                  <span className="text-neutral-500 font-mono block">Student Name:</span>
                  <span className="text-white font-medium">{selectedTicket.name}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-mono block">Student Email:</span>
                  <span className="text-white font-medium">{selectedTicket.email}</span>
                </div>
                <div>
                  <span className="text-neutral-500 font-mono block">Room / Block:</span>
                  <span className="text-white font-medium">{selectedTicket.location}</span>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-mono uppercase text-neutral-400 block mb-1">
                  Issue Description
                </label>
                <div className="p-4 rounded-xl bg-[#141414] border border-white/5 text-sm text-neutral-200 leading-relaxed whitespace-pre-wrap">
                  {selectedTicket.description}
                </div>
              </div>

              {/* Triage & Management Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-white/10 pt-4">
                {/* Status Transition Picker */}
                <div>
                  <label className="text-xs font-mono uppercase text-neutral-400 block mb-1.5">
                    Update Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#161616] border border-white/10 text-white focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value={selectedTicket.status}>
                      Current: {selectedTicket.status.replace("_", " ")}
                    </option>
                    {(VALID_TRANSITIONS[selectedTicket.status] || []).map((st) => (
                      <option key={st} value={st}>
                        Transition to: {st.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Staff Assignment */}
                <div>
                  <label className="text-xs font-mono uppercase text-neutral-400 block mb-1.5">
                    Assign Engineer / Lead
                  </label>
                  <select
                    value={newAssignedTo}
                    onChange={(e) => setNewAssignedTo(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl text-sm bg-[#161616] border border-white/10 text-white focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    <option value="">Unassigned</option>
                    {staffList.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} ({staff.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Public Response Text (Sent to student via email & portal) */}
              <div>
                <label className="text-xs font-mono uppercase text-neutral-400 block mb-1.5">
                  Public Response / Resolution Note (Visible to Student & Sent via Email)
                </label>
                <textarea
                  rows={3}
                  value={adminResponseText}
                  onChange={(e) => setAdminResponseText(e.target.value)}
                  placeholder="e.g. Swapped port on switch 3B; WiFi AP restarted; please test connection."
                  className="w-full p-3 rounded-xl text-sm bg-[#161616] border border-white/10 text-white focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              {/* Status History / Audit Trail */}
              {ticketHistory.length > 0 && (
                <div className="border-t border-white/10 pt-4">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-3">
                    Audit Trail & History ({ticketHistory.length})
                  </h3>
                  <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                    {ticketHistory.map((h) => (
                      <div
                        key={h.id}
                        className="p-2.5 rounded-lg bg-[#141414] border border-white/5 text-xs flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between text-neutral-400">
                          <span className="font-mono text-white font-medium">
                            {h.newStatus.replace("_", " ")}
                          </span>
                          <span className="font-mono text-[11px]">
                            {new Date(h.createdAt).toLocaleString()}
                          </span>
                        </div>
                        {h.notes && <p className="text-neutral-300 text-[12px]">{h.notes}</p>}
                        {h.changedBy && (
                          <span className="text-[10px] text-neutral-500 font-mono">
                            By: {h.changedBy.name} ({h.changedBy.role})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Modal Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-end gap-3 border-t border-white/10 pt-4">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-full text-xs font-mono font-medium text-neutral-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <motion.button
                  type="button"
                  disabled={savingAction}
                  onClick={handleSaveUpdates}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-full text-xs font-mono font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  style={{ backgroundColor: "#E11D2E" }}
                  whileHover={{ backgroundColor: "#FF3B4D", scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Send className="w-3.5 h-3.5" />
                  {savingAction ? "Saving & Notifying…" : "Save & Notify Student"}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Metric Card Component ───────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  color,
  border,
  pulse = false,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  border: string;
  pulse?: boolean;
}) {
  return (
    <div className={`p-4 rounded-2xl border ${border} bg-[#0E0E0E] flex flex-col justify-between`}>
      <div className="flex items-center justify-between text-neutral-400">
        <span className="text-[11px] font-mono uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-2xl font-mono font-bold ${color}`}>{value}</span>
        {pulse && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" aria-hidden="true" />
        )}
      </div>
    </div>
  );
}
