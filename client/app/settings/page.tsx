"use client";

import { useState } from "react";
import AccessGuard from "@/components/AccessGuard";
import { team as initialTeam, orgLabel, type Role, type TeamMember } from "@/lib/teamData";

const initialIntegrations = {
  vertexHygiene: true,
  airbnb:        true,
  bookingDotCom: true,
  vrbo:          false,
  mapbox:        true,
  stripe:        false,
  googleCal:     false,
};

const initialNotifications = {
  newBookingEmail:    true,
  newBookingSms:      false,
  cleaningReminder:   true,
  paymentReceived:    true,
  weeklyReport:       true,
  vacancyAlert:       true,
  reviewReceived:     true,
};

export default function SettingsPage() {
  const [orgName, setOrgName] = useState("AVS Invest Ltd");
  const [orgEmail, setOrgEmail] = useState("hello@avsinvest.co.uk");
  const [orgPhone, setOrgPhone] = useState("020 0000 0000");
  const [orgAddress, setOrgAddress] = useState("Greater London, UK");
  const [companyNumber, setCompanyNumber] = useState("000000000");

  const [team, setTeam] = useState<TeamMember[]>(initialTeam);
  const [integrations, setIntegrations] = useState(initialIntegrations);
  const [notifications, setNotifications] = useState(initialNotifications);
  const [showLiveKey, setShowLiveKey] = useState(false);
  const [showTestKey, setShowTestKey] = useState(false);

  function saveOrg()        { alert("Organisation profile saved (will persist to MongoDB after Step 8)"); }
  function saveIntegrations() { alert("Integration settings saved"); }
  function saveNotifications(){ alert("Notification preferences saved"); }
  function regenerateKey()    { alert("API key regenerated. The old key has been revoked."); }
  function exportData()       { alert("Exporting all data as a ZIP archive. You'll get an email when it's ready."); }
  function deleteOrg() {
    if (confirm("This will permanently delete your AVS Invest organisation. There is no undo. Continue?")) {
      alert("(Demo) Organisation would be deleted here.");
    }
  }
  function changeRole(id: string, role: Role) {
    setTeam(team.map((m) => (m.id === id ? { ...m, role } : m)));
  }
  function removeMember(id: string) {
    setTeam(team.filter((m) => m.id !== id));
  }

  return (
    <AccessGuard page="settings">
    <div className="px-8 py-8 space-y-8 max-w-5xl">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your organisation, team, integrations and notifications.
        </p>
      </header>

      <Section title="Organisation profile" description="Public-facing details shown on invoices, the website, and booking confirmation emails.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Organisation name" value={orgName} onChange={setOrgName} />
          <Field label="Companies House number" value={companyNumber} onChange={setCompanyNumber} />
          <Field label="Contact email" type="email" value={orgEmail} onChange={setOrgEmail} />
          <Field label="Contact phone" value={orgPhone} onChange={setOrgPhone} />
          <Field label="Registered address" value={orgAddress} onChange={setOrgAddress} fullWidth />
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={saveOrg} className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-800">
            Save changes
          </button>
        </div>
      </Section>

      <Section
        title="Team"
        description="Add, remove or change the role of people who can access AVS Invest."
        action={
          <button onClick={() => alert("Invite-by-email form - coming after auth wiring")} className="bg-slate-900 text-white text-xs px-3 py-1.5 rounded hover:bg-slate-800">
            + Invite member
          </button>
        }
      >
        <ul className="divide-y divide-slate-100">
          {team.map((m) => (
            <li key={m.id} className="flex items-center gap-4 py-3">
              <div className={[
                "w-9 h-9 rounded-full flex items-center justify-center text-slate-900 text-sm font-semibold bg-gradient-to-br",
                m.org === "Vertex" ? "from-cyan-400 to-emerald-500" : "from-teal-400 to-emerald-500",
              ].join(" ")}>
                {m.initials}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-2 flex-wrap">
                  {m.name}
                  <span className={[
                    "text-[10px] uppercase tracking-wider px-2 py-0.5 rounded",
                    m.org === "Vertex" ? "bg-cyan-100 text-cyan-800" : "bg-emerald-100 text-emerald-800",
                  ].join(" ")}>
                    {orgLabel[m.org]}
                  </span>
                  {m.status === "Invited" && (
                    <span className="text-[10px] uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">
                      Pending invite
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 truncate">{m.email}</div>
              </div>
              <select
                value={m.role}
                onChange={(e) => changeRole(m.id, e.target.value as Role)}
                disabled={m.role === "Owner"}
                className="text-sm border border-slate-200 rounded px-2 py-1 bg-white disabled:opacity-50"
              >
                {(["Owner", "Admin", "Manager", "Cleaner", "Investor"] as Role[]).map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
              <button
                onClick={() => removeMember(m.id)}
                disabled={m.role === "Owner"}
                className="text-xs text-rose-600 hover:underline disabled:opacity-30 disabled:no-underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      </Section>

      <Section title="Integrations" description="Connect AVS Invest to the services that keep your portfolio running.">
        <div className="space-y-3">
          <Toggle label="Vertex Hygiene" sub="Cleaning operations API. When ON, AVS auto-schedules cleans after every guest checkout." value={integrations.vertexHygiene} onChange={(v) => setIntegrations({ ...integrations, vertexHygiene: v })} />
          <Toggle label="Airbnb" sub="iCal sync of bookings + listing performance metrics." value={integrations.airbnb} onChange={(v) => setIntegrations({ ...integrations, airbnb: v })} />
          <Toggle label="Booking.com" sub="iCal sync + nightly rate optimisation." value={integrations.bookingDotCom} onChange={(v) => setIntegrations({ ...integrations, bookingDotCom: v })} />
          <Toggle label="Vrbo" sub="iCal sync only (rate sync coming Q3)." value={integrations.vrbo} onChange={(v) => setIntegrations({ ...integrations, vrbo: v })} />
          <Toggle label="Mapbox" sub="Used by the ROI Map. Currently using free OpenStreetMap tiles via Leaflet." value={integrations.mapbox} onChange={(v) => setIntegrations({ ...integrations, mapbox: v })} />
          <Toggle label="Stripe Connect" sub="Collect deposits and rent automatically." value={integrations.stripe} onChange={(v) => setIntegrations({ ...integrations, stripe: v })} />
          <Toggle label="Google Calendar" sub="Mirror cleaning + booking events to your calendar." value={integrations.googleCal} onChange={(v) => setIntegrations({ ...integrations, googleCal: v })} />
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={saveIntegrations} className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-800">
            Save integrations
          </button>
        </div>
      </Section>

      <Section title="Notifications" description="Choose how you want to be alerted when things happen.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <Toggle label="New booking - email" sub="When a guest books any property" value={notifications.newBookingEmail} onChange={(v) => setNotifications({ ...notifications, newBookingEmail: v })} />
          <Toggle label="New booking - SMS" sub="High-priority text alert" value={notifications.newBookingSms} onChange={(v) => setNotifications({ ...notifications, newBookingSms: v })} />
          <Toggle label="Cleaning reminder" sub="24 hours before any scheduled clean" value={notifications.cleaningReminder} onChange={(v) => setNotifications({ ...notifications, cleaningReminder: v })} />
          <Toggle label="Payment received" sub="When a deposit or rent payment lands" value={notifications.paymentReceived} onChange={(v) => setNotifications({ ...notifications, paymentReceived: v })} />
          <Toggle label="Weekly report" sub="Every Monday morning, portfolio summary" value={notifications.weeklyReport} onChange={(v) => setNotifications({ ...notifications, weeklyReport: v })} />
          <Toggle label="Vacancy alert" sub="When a property has no booking for >7 days" value={notifications.vacancyAlert} onChange={(v) => setNotifications({ ...notifications, vacancyAlert: v })} />
          <Toggle label="Review received" sub="When a guest leaves a rating" value={notifications.reviewReceived} onChange={(v) => setNotifications({ ...notifications, reviewReceived: v })} />
        </div>
        <div className="flex justify-end mt-4">
          <button onClick={saveNotifications} className="bg-slate-900 text-white text-sm px-4 py-2 rounded-md hover:bg-slate-800">
            Save preferences
          </button>
        </div>
      </Section>

      <Section title="API keys" description="Use these to integrate AVS Invest with other tools you build.">
        <div className="space-y-3">
          <ApiKey label="Live key" value="avs_live_sk_8f3a__not_a_real_key__1c7b9" visible={showLiveKey} onToggle={() => setShowLiveKey(!showLiveKey)} onRegenerate={regenerateKey} />
          <ApiKey label="Test key" value="avs_test_sk_xxx__not_a_real_key__yyy" visible={showTestKey} onToggle={() => setShowTestKey(!showTestKey)} onRegenerate={regenerateKey} />
        </div>
        <p className="text-xs text-slate-500 mt-3">Treat your live key like a password. If it leaks, regenerate it immediately.</p>
      </Section>

      <Section title="Danger zone" description="Irreversible operations. Make sure you have a backup before continuing." tone="rose">
        <div className="space-y-3">
          <DangerRow title="Export all data" description="Download a ZIP of every property, booking, cleaning record, and team member." buttonLabel="Request export" buttonTone="slate" onClick={exportData} />
          <DangerRow title="Delete organisation" description="Permanently delete AVS Invest and all associated data. Cannot be undone." buttonLabel="Delete organisation" buttonTone="rose" onClick={deleteOrg} />
        </div>
      </Section>
    </div>
    </AccessGuard>
  );
}

function Section({
  title, description, children, action, tone,
}: {
  title: string; description?: string; children: React.ReactNode; action?: React.ReactNode; tone?: "rose";
}) {
  const ringClass = tone === "rose" ? "border-rose-200" : "border-slate-200";
  return (
    <section className={`bg-white rounded-xl border ${ringClass} p-5`}>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className={["text-lg font-semibold", tone === "rose" ? "text-rose-700" : ""].join(" ")}>{title}</h2>
          {description && <p className="text-xs text-slate-500 mt-1">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function Field({
  label, value, onChange, type = "text", fullWidth = false,
}: {
  label: string; value: string; onChange: (v: string) => void; type?: string; fullWidth?: boolean;
}) {
  return (
    <label className={fullWidth ? "md:col-span-2" : ""}>
      <span className="text-xs uppercase tracking-wider text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
      />
    </label>
  );
}

function Toggle({
  label, sub, value, onChange,
}: {
  label: string; sub?: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        aria-pressed={value}
        className={["relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors", value ? "bg-emerald-500" : "bg-slate-300"].join(" ")}
      >
        <span className={["inline-block h-4 w-4 rounded-full bg-white transform transition-transform shadow", value ? "translate-x-6" : "translate-x-1"].join(" ")} />
      </button>
    </div>
  );
}

function ApiKey({
  label, value, visible, onToggle, onRegenerate,
}: {
  label: string; value: string; visible: boolean; onToggle: () => void; onRegenerate: () => void;
}) {
  const masked = value.slice(0, 8) + "•".repeat(20) + value.slice(-4);
  return (
    <div className="bg-slate-50 rounded-lg p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-xs uppercase tracking-wider text-slate-500">{label}</div>
        <div className="font-mono text-sm break-all">{visible ? value : masked}</div>
      </div>
      <button onClick={onToggle} className="text-xs px-3 py-1.5 rounded border border-slate-300 hover:bg-white">
        {visible ? "Hide" : "Reveal"}
      </button>
      <button onClick={() => navigator.clipboard?.writeText(value)} className="text-xs px-3 py-1.5 rounded border border-slate-300 hover:bg-white">
        Copy
      </button>
      <button onClick={onRegenerate} className="text-xs px-3 py-1.5 rounded bg-rose-600 text-white hover:bg-rose-700">
        Regenerate
      </button>
    </div>
  );
}

function DangerRow({
  title, description, buttonLabel, buttonTone, onClick,
}: {
  title: string; description: string; buttonLabel: string; buttonTone: "slate" | "rose"; onClick: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-lg bg-rose-50/40 border border-rose-100">
      <div className="min-w-0">
        <div className="text-sm font-medium">{title}</div>
        <div className="text-xs text-slate-600 mt-0.5">{description}</div>
      </div>
      <button
        onClick={onClick}
        className={["text-sm px-3 py-1.5 rounded shrink-0", buttonTone === "rose" ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-slate-900 text-white hover:bg-slate-800"].join(" ")}
      >
        {buttonLabel}
      </button>
    </div>
  );
}
