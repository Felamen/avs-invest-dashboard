"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";

export default function AccountModal({
  open,
  onClose,
  forced = false,
}: {
  open: boolean;
  onClose: () => void;
  /** first-login flow — user must set a password before continuing (no dismiss) */
  forced?: boolean;
}) {
  const { currentUser, token, apiUrl, refresh } = useAuth();
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setNewPassword("");
      setConfirm("");
      setCurrentPassword("");
      setError(null);
      setDone(false);
    }
  }, [open]);

  if (!open || !currentUser) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!newPassword || newPassword.length < 8) {
      setError("Your new password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirm) {
      setError("The two passwords don't match.");
      return;
    }
    if (!currentPassword) {
      setError("Enter your current password to confirm it's you.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`${apiUrl}/api/auth/update-account`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Couldn't save your password.");
        setSaving(false);
        return;
      }
      await refresh();
      setDone(true);
      setSaving(false);
      setTimeout(() => onClose(), 900);
    } catch {
      setError("Couldn't reach the server. Is it running?");
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={() => !forced && onClose()}
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 p-6 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {forced ? "Welcome — set your password" : "Change password"}
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            {forced
              ? `Hi ${currentUser.name.split(" ")[0]} — choose your own password before you start. You sign in with ${currentUser.email}.`
              : `Signed in as ${currentUser.email}. Set a new password below.`}
          </p>
        </div>

        {done ? (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-3 text-center">
            ✓ Password updated. Use it next time you sign in.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={forced ? "Choose a password" : "New password"}>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="acc-input"
                placeholder="At least 8 characters"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Confirm new password">
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="acc-input"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Current password">
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="acc-input"
                placeholder="Confirm it's you"
                autoComplete="current-password"
              />
            </Field>

            {error && (
              <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              {!forced && (
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-medium text-sm hover:bg-slate-50"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-medium text-sm hover:opacity-90 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save password"}
              </button>
            </div>
          </form>
        )}
      </div>
      <style jsx>{`
        .acc-input {
          width: 100%;
          margin-top: 0.25rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          border: 1px solid rgb(203 213 225);
          font-size: 0.875rem;
          color: rgb(15 23 42);
          outline: none;
        }
        .acc-input:focus {
          border-color: rgb(13 148 136);
          box-shadow: 0 0 0 2px rgb(13 148 136 / 0.2);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}
