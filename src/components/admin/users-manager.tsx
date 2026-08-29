"use client";

import { useState, useEffect, useCallback } from "react";
import { UserPlus, Shield, UserCheck, Key, Copy, Check, Eye, EyeOff, RefreshCw, X, AlertCircle } from "lucide-react";
import type { AdminSession } from "@/lib/auth";

interface UserItem {
  id: string;
  name: string;
  displayName: string | null;
  username: string;
  email: string;
  role: "ADMIN" | "MANAGER";
  batch: number | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count?: {
    assignedComplaints: number;
  };
}

interface UsersManagerProps {
  session: AdminSession;
}

export function UsersManager({ session }: UsersManagerProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    batch: 34, // Default to 3rd Year (Batch 34)
    role: "MANAGER" as "ADMIN" | "MANAGER",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    username: string;
    email: string;
    pass: string;
    role: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const currentUser = users.find((u) => u.id === session.sub);
  const isAdmin = currentUser ? currentUser.role === "ADMIN" : session.role === "ADMIN";

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users");
      if (!res.ok) {
        throw new Error("Failed to load user accounts");
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch (err: unknown) {
      setError((err as Error).message || "Could not fetch team accounts.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const generateRandomPassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: pass }));
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username.trim() ? formData.username.trim() : undefined,
          email: formData.email.trim(),
          password: formData.password,
          batch: Number(formData.batch),
          role: formData.role,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to create account");
      }

      setCreatedCredentials({
        username: data.user.username,
        email: data.user.email,
        pass: formData.password,
        role: data.user.role,
      });

      // Reset form
      setFormData({
        name: "",
        username: "",
        email: "",
        password: "",
        batch: 34,
        role: "MANAGER",
      });

      fetchUsers();
    } catch (err: unknown) {
      setError((err as Error).message || "Could not create user account.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user: UserItem) => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          isActive: !user.isActive,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Could not update status");
      }
      setSuccess(`Account for ${user.displayName || user.username} updated.`);
      setTimeout(() => setSuccess(null), 3000);
      fetchUsers();
    } catch (err: unknown) {
      setError((err as Error).message);
    }
  };

  const copyToClipboard = () => {
    if (!createdCredentials) return;
    const text = `NETRONiX Portal Login:\nUsername: ${createdCredentials.username}\nEmail: ${createdCredentials.email}\nPassword: ${createdCredentials.pass}\nRole: ${createdCredentials.role}\nLogin URL: http://localhost:3000/admin/login`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const adminCount = users.filter((u) => u.role === "ADMIN").length;
  const juniorCount = users.filter((u) => u.role === "MANAGER").length;

  return (
    <div className="flex flex-col gap-6">
      {/* ── Top Bar ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-[#141414] border border-white/5">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-heading font-semibold text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            Team & Junior Accounts
          </h2>
          <p className="text-xs text-neutral-400 font-mono">
            {users.length} accounts · {adminCount} Executive Admins · {juniorCount} Junior Coordinators (3rd Year)
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => {
              setCreatedCredentials(null);
              generateRandomPassword();
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-medium transition-colors inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-red-600/20"
          >
            <UserPlus className="w-4 h-4" />
            Create Junior / Staff Account
          </button>
        ) : (
          <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[11px] font-mono text-neutral-400">
            Role: Junior Coordinator (Managed by Admins)
          </div>
        )}
      </div>

      {/* ── Alert Messages ─────────────────────────────────────────────── */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 font-mono flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-mono flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          {success}
        </div>
      )}

      {/* ── Access Control Guidelines ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-[#0F0F0F] border border-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            Executive Admin Access (Final Year)
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Full system control. Can modify event statuses, toggle pre-registration, configure auto-timers, manage complaints, and provision junior coordinator logins.
          </p>
        </div>

        <div className="p-4 rounded-xl bg-[#0F0F0F] border border-white/5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-sky-400">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            Junior Coordinator Access (Batch 34 / 3rd Year)
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Operational access. Can view live events, inspect registration submissions, update candidate statuses (Confirmed / Rejected), write admin notes, and triage complaints.
          </p>
        </div>
      </div>

      {/* ── Accounts List ──────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-white/5 bg-[#141414] overflow-hidden">
        {loading ? (
          <p className="p-8 text-xs font-mono text-neutral-500 text-center">Loading team accounts...</p>
        ) : users.length === 0 ? (
          <p className="p-8 text-xs font-mono text-neutral-500 text-center">No accounts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-white/10 text-neutral-400 bg-[#0D0D0D]">
                  <th className="px-4 py-3">User & Name</th>
                  <th className="px-4 py-3">Role & Batch</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((user) => {
                  const isCurrent = user.id === session.sub;
                  return (
                    <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center font-bold text-white text-[11px]">
                            {(user.displayName || user.username).charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-sans font-medium text-white flex items-center gap-1.5">
                              {user.displayName || user.username}
                              {isCurrent && <span className="text-[10px] text-neutral-500">(You)</span>}
                            </div>
                            <div className="text-[11px] text-neutral-500 font-mono">@{user.username}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              user.role === "ADMIN"
                                ? "bg-red-500/15 text-red-400 border border-red-500/30"
                                : "bg-sky-500/15 text-sky-400 border border-sky-500/30"
                            }`}
                          >
                            {user.role === "ADMIN" ? "Executive Admin" : "Junior Coordinator"}
                          </span>
                          {user.batch && (
                            <span className="px-1.5 py-0.5 rounded bg-white/5 text-[10px] text-neutral-400">
                              Batch {user.batch}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-neutral-300">{user.email}</td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] ${
                            user.isActive ? "text-emerald-400" : "text-neutral-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-400" : "bg-neutral-600"}`}
                          />
                          {user.isActive ? "Active" : "Deactivated"}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        {isAdmin && !isCurrent && (
                          <button
                            onClick={() => handleToggleActive(user)}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                              user.isActive
                                ? "border-red-500/30 text-red-400 hover:bg-red-500/10"
                                : "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                            }`}
                          >
                            {user.isActive ? "Deactivate" : "Reactivate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Create Junior Account Modal ─────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-[#141414] border border-white/10 p-6 flex flex-col gap-5 shadow-2xl relative">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-heading font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-red-500" />
                Provision Junior / Staff Account
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createdCredentials ? (
              <div className="flex flex-col gap-4">
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono">
                  ✅ Account successfully created and ready for use!
                </div>

                <div className="p-4 rounded-xl bg-[#0A0A0A] border border-white/10 flex flex-col gap-2 font-mono text-xs text-neutral-300">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-neutral-500">Role:</span>
                    <span className="font-semibold text-white">{createdCredentials.role}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-neutral-500">Username:</span>
                    <span className="font-semibold text-white">{createdCredentials.username}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-neutral-500">Email:</span>
                    <span>{createdCredentials.email}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-neutral-500">Password:</span>
                    <span className="font-semibold text-amber-400">{createdCredentials.pass}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={copyToClipboard}
                    className="flex-1 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-mono font-medium transition-colors inline-flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copied to Clipboard!" : "Copy Login Credentials"}
                  </button>

                  <button
                    onClick={() => {
                      setCreatedCredentials(null);
                      setIsModalOpen(false);
                    }}
                    className="py-2.5 px-4 rounded-lg border border-white/10 hover:bg-white/5 text-neutral-300 text-xs font-mono font-medium transition-colors cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateAccount} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-mono text-neutral-400">Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Ali Khan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-mono text-white bg-[#0A0A0A] focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-neutral-400">Batch / Year *</label>
                    <select
                      value={formData.batch}
                      onChange={(e) => setFormData({ ...formData, batch: Number(e.target.value) })}
                      className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-mono text-white bg-[#0A0A0A] focus:outline-none focus:border-red-500"
                    >
                      <option value={34}>Batch 34 (3rd Year Coordinator)</option>
                      <option value={35}>Batch 35 (2nd Year)</option>
                      <option value={33}>Batch 33 (4th Year Executive)</option>
                      <option value={36}>Batch 36 (Freshman)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-neutral-400">Role Permissions *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as "ADMIN" | "MANAGER" })}
                      className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-mono text-white bg-[#0A0A0A] focus:outline-none focus:border-red-500"
                    >
                      <option value="MANAGER">MANAGER (Junior / 3rd Year)</option>
                      <option value="ADMIN">ADMIN (Full Executive Access)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-neutral-400">Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="u2022xxx@giki.edu.pk"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-mono text-white bg-[#0A0A0A] focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-mono text-neutral-400">Username (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. ali_34"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-mono text-white bg-[#0A0A0A] focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-mono text-neutral-400">Password *</label>
                    <button
                      type="button"
                      onClick={generateRandomPassword}
                      className="text-[10px] font-mono text-red-400 hover:text-red-300 inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" /> Auto-Generate
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full rounded-lg border border-white/10 px-3 py-2 text-xs font-mono text-white bg-[#0A0A0A] focus:outline-none focus:border-red-500 pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="py-2 px-4 rounded-lg border border-white/10 hover:bg-white/5 text-neutral-300 text-xs font-mono transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="py-2 px-4 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-mono font-medium transition-colors cursor-pointer inline-flex items-center gap-2"
                  >
                    <UserCheck className="w-4 h-4" />
                    {submitting ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
