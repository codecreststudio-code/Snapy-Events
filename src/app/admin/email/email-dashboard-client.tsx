"use client"

import { useState, useCallback } from "react"
import {
  Mail, FileText, Settings, Search, Send, Plus, Trash2, Edit3, Copy,
  CheckCircle, XCircle, Clock, Eye, MousePointer, RefreshCw, Save,
  ChevronDown, ExternalLink, AlertCircle, AlertTriangle, Loader2, BarChart2
} from "lucide-react"

// ────── Types ──────────────────────────────────────────────────────────
interface EmailTemplate {
  id: string
  name: string
  subject: string
  html_content: string
  text_content?: string
  variables: string[]
  is_system: boolean
  created_at: string
  updated_at: string
}

interface EmailLog {
  id: string
  recipient: string
  subject: string
  email_type: string
  status: "pending" | "sent" | "failed"
  error_message?: string
  retry_count: number
  opened_at?: string
  clicked_at?: string
  created_at: string
}

interface EmailSettings {
  sender_name: string
  sender_email: string
  reply_to: string
  support_email: string
  contact_email: string
  logo_url?: string
  signature?: string
  footer_text: string
  company_address?: string
  social_links?: Record<string, string>
}

interface Props {
  initialTemplates: EmailTemplate[]
  initialLogs: EmailLog[]
  initialSettings: EmailSettings
}

// ────── Helpers ─────────────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  sent: "bg-emerald-500/10 text-emerald-400",
  pending: "bg-amber-500/10 text-amber-400",
  failed: "bg-red-500/10 text-red-400",
}
const STATUS_ICON: Record<string, React.ReactNode> = {
  sent: <CheckCircle className="h-3.5 w-3.5" />,
  pending: <Clock className="h-3.5 w-3.5" />,
  failed: <XCircle className="h-3.5 w-3.5" />,
}

function Badge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOR[status] ?? "bg-ink/5 text-ink-secondary"}`}>
      {STATUS_ICON[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

function fmtDate(s?: string | null) {
  if (!s) return "—"
  return new Date(s).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })
}

// ────── Main Component ──────────────────────────────────────────────────
export default function EmailDashboardClient({ initialTemplates, initialLogs, initialSettings }: Props) {
  const [tab, setTab] = useState<"templates" | "logs" | "settings">("templates")
  const [templates, setTemplates] = useState<EmailTemplate[]>(initialTemplates)
  const [logs, setLogs] = useState<EmailLog[]>(initialLogs)
  const [settings, setSettings] = useState<EmailSettings>(initialSettings)

  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState<Partial<EmailTemplate> | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [testRecipient, setTestRecipient] = useState("")
  const [testTemplateId, setTestTemplateId] = useState("")

  // Logs filter state
  const [logSearch, setLogSearch] = useState("")
  const [logStatus, setLogStatus] = useState("")

  // UI state
  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null)

  function showToast(msg: string, type: "ok" | "err" = "ok") {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  async function apiPost(body: object) {
    const res = await fetch("/api/admin/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    return res.json()
  }

  // ── Template actions ──
  function openNew() {
    setEditingTemplate({ id: "", name: "", subject: "", html_content: "", text_content: "", variables: [], is_system: false })
    setIsNew(true)
  }

  function openEdit(t: EmailTemplate) {
    setEditingTemplate({ ...t })
    setIsNew(false)
  }

  function duplicateTemplate(t: EmailTemplate) {
    setEditingTemplate({
      ...t,
      id: `${t.id}-copy`,
      name: `${t.name} (copy)`,
      is_system: false,
    })
    setIsNew(true)
  }

  async function saveTemplate() {
    if (!editingTemplate) return
    if (!editingTemplate.id || !editingTemplate.name || !editingTemplate.subject || !editingTemplate.html_content) {
      showToast("Please fill in all required fields", "err")
      return
    }
    setBusy(true)
    const result = await apiPost({ action: "upsert", template: editingTemplate })
    setBusy(false)
    if (result.error) return showToast(result.error, "err")
    // Refresh templates
    const r = await fetch("/api/admin/emails?resource=templates")
    const j = await r.json()
    setTemplates(j.data ?? [])
    setEditingTemplate(null)
    showToast("Template saved successfully")
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this custom template? This cannot be undone.")) return
    setBusy(true)
    const result = await apiPost({ action: "delete", id })
    setBusy(false)
    if (result.error) return showToast(result.error, "err")
    setTemplates(prev => prev.filter(t => t.id !== id))
    showToast("Template deleted")
  }

  async function sendTestEmail() {
    if (!testTemplateId || !testRecipient) return showToast("Please select a template and enter a recipient", "err")
    setBusy(true)
    const result = await apiPost({ action: "test", template_id: testTemplateId, recipient: testRecipient })
    // Every send writes a new email_logs row, so refetch logs regardless of
    // outcome — otherwise the Sent/Failed header counts and the Logs tab
    // stay stale until the user manually clicks Refresh or reloads the page.
    const r = await fetch("/api/admin/emails?resource=logs")
    const j = await r.json()
    setLogs(j.data ?? [])
    setBusy(false)
    if (result.error) return showToast("Test failed: " + result.error, "err")
    showToast(`Test email sent to ${testRecipient}`)
  }

  // ── Settings actions ──
  async function saveSettings() {
    setBusy(true)
    const result = await apiPost({ action: "save_settings", settings })
    setBusy(false)
    if (result.error) return showToast(result.error, "err")
    showToast("Email settings saved!")
  }

  // ── Logs refresh ──
  async function refreshLogs() {
    setBusy(true)
    const params = new URLSearchParams({ resource: "logs" })
    if (logStatus) params.set("status", logStatus)
    if (logSearch) params.set("search", logSearch)
    const r = await fetch(`/api/admin/emails?${params}`)
    const j = await r.json()
    setLogs(j.data ?? [])
    setBusy(false)
  }

  const filteredLogs = logs.filter(l => {
    const matchStatus = !logStatus || l.status === logStatus
    const matchSearch = !logSearch || l.recipient.toLowerCase().includes(logSearch.toLowerCase()) || l.subject.toLowerCase().includes(logSearch.toLowerCase())
    return matchStatus && matchSearch
  })

  // ── Stats ──
  const sentCount = logs.filter(l => l.status === "sent").length
  const failedCount = logs.filter(l => l.status === "failed").length
  const openedCount = logs.filter(l => l.opened_at).length
  const clickedCount = logs.filter(l => l.clicked_at).length

  // ────── Render ──────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-ink/5">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-semibold transition-all ${toast.type === "ok" ? "bg-emerald-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.type === "ok" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="bg-surface-card border-b border-hairline-dark px-6 py-5">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h1 className="text-2xl font-playfair font-light text-ink flex items-center gap-2">
              <Mail className="h-6 w-6 text-mauve" />
              Email Management
            </h1>
            <p className="text-sm text-ink-secondary mt-0.5">Manage templates, view logs, and configure email settings.</p>
          </div>
          {/* Stats row */}
          <div className="hidden md:flex items-center gap-6">
            {[
              { label: "Sent", value: sentCount, color: "text-emerald-400" },
              { label: "Failed", value: failedCount, color: "text-red-400" },
              { label: "Opened", value: openedCount, color: "text-mauve" },
              { label: "Clicked", value: clickedCount, color: "text-mauve" },
            ].map(s => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-ink-tertiary font-semibold">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-4 max-w-7xl mx-auto">
          {(["templates", "logs", "settings"] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${tab === t ? "bg-mauve text-white" : "text-ink-secondary hover:bg-mauve/5"}`}
            >
              {t === "templates" && <FileText className="h-4 w-4" />}
              {t === "logs" && <BarChart2 className="h-4 w-4" />}
              {t === "settings" && <Settings className="h-4 w-4" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">

        {/* ─── TEMPLATES TAB ─────────────────────────────────────────── */}
        {tab === "templates" && (
          <div className="space-y-6">
            {/* Test email panel */}
            <div className="bg-surface-card border border-hairline-dark rounded-2xl p-5 flex flex-col sm:flex-row gap-3 items-start sm:items-end">
              <div className="flex-1 space-y-1.5">
                <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Send Test Email</label>
                <div className="flex gap-2">
                  <select
                    value={testTemplateId}
                    onChange={e => setTestTemplateId(e.target.value)}
                    className="flex-1 border border-hairline-dark rounded-lg px-3 py-2 text-sm bg-surface-card text-ink"
                  >
                    <option value="">— Select template —</option>
                    {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                  <input
                    type="email"
                    placeholder="Recipient email"
                    value={testRecipient}
                    onChange={e => setTestRecipient(e.target.value)}
                    className="flex-1 border border-hairline-dark rounded-lg px-3 py-2 text-sm"
                  />
                  <button
                    onClick={sendTestEmail}
                    disabled={busy}
                    className="flex items-center gap-1.5 bg-mauve text-[#faf6ed] px-4 py-2 rounded-lg text-sm font-bold hover:bg-mauve-strong disabled:opacity-50"
                  >
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send Test
                  </button>
                </div>
              </div>
            </div>

            {/* Template editor modal */}
            {editingTemplate && (
              <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center pt-8 px-4 overflow-y-auto">
                <div className="bg-surface-card rounded-2xl shadow-2xl w-full max-w-3xl">
                  <div className="flex items-center justify-between p-5 border-b border-hairline-dark">
                    <h2 className="font-bold text-ink text-lg">{isNew ? "Create Template" : "Edit Template"}</h2>
                    <button onClick={() => setEditingTemplate(null)} className="text-ink-tertiary hover:text-ink-secondary text-xl font-bold">×</button>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Template ID *</label>
                        <input
                          disabled={!isNew}
                          value={editingTemplate.id ?? ""}
                          onChange={e => setEditingTemplate(p => ({ ...p, id: e.target.value.toLowerCase().replace(/\s+/g, "_") }))}
                          placeholder="e.g. monthly_newsletter"
                          className="w-full border border-hairline-dark rounded-lg px-3 py-2 text-sm disabled:bg-ink/5"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Display Name *</label>
                        <input
                          value={editingTemplate.name ?? ""}
                          onChange={e => setEditingTemplate(p => ({ ...p, name: e.target.value }))}
                          placeholder="Monthly Newsletter"
                          className="w-full border border-hairline-dark rounded-lg px-3 py-2 text-sm"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Subject Line *</label>
                      <input
                        value={editingTemplate.subject ?? ""}
                        onChange={e => setEditingTemplate(p => ({ ...p, subject: e.target.value }))}
                        placeholder="Hello {{host_name}}, your monthly update is here!"
                        className="w-full border border-hairline-dark rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Variables (comma-separated)</label>
                      <input
                        value={(editingTemplate.variables ?? []).join(", ")}
                        onChange={e => setEditingTemplate(p => ({ ...p, variables: e.target.value.split(",").map(v => v.trim()).filter(Boolean) }))}
                        placeholder="host_name, event_name, dashboard_url"
                        className="w-full border border-hairline-dark rounded-lg px-3 py-2 text-sm"
                      />
                      <p className="text-xs text-ink-tertiary">Use these as <code>{"{{variable_name}}"}</code> in your HTML body.</p>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">HTML Body *</label>
                      <textarea
                        value={editingTemplate.html_content ?? ""}
                        onChange={e => setEditingTemplate(p => ({ ...p, html_content: e.target.value }))}
                        rows={10}
                        placeholder="<h1>Hello {{host_name}}</h1><p>...</p>"
                        className="w-full border border-hairline-dark rounded-lg px-3 py-2 text-sm font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Plain Text (optional)</label>
                      <textarea
                        value={editingTemplate.text_content ?? ""}
                        onChange={e => setEditingTemplate(p => ({ ...p, text_content: e.target.value }))}
                        rows={3}
                        placeholder="Plain text fallback..."
                        className="w-full border border-hairline-dark rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 p-5 border-t border-hairline-dark">
                    <button onClick={() => setEditingTemplate(null)} className="px-4 py-2 rounded-lg text-sm text-ink-secondary hover:bg-mauve/5 font-semibold">Cancel</button>
                    <button onClick={saveTemplate} disabled={busy} className="flex items-center gap-1.5 bg-mauve text-[#faf6ed] px-5 py-2 rounded-lg text-sm font-bold hover:bg-mauve-strong disabled:opacity-50">
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save Template
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Templates list */}
            <div className="bg-surface-card border border-hairline-dark rounded-2xl overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-hairline-dark">
                <h2 className="font-bold text-ink">Email Templates</h2>
                <button
                  onClick={openNew}
                  className="flex items-center gap-1.5 bg-mauve text-[#faf6ed] px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-mauve-strong"
                >
                  <Plus className="h-4 w-4" />
                  New Template
                </button>
              </div>
              <div className="divide-y divide-hairline-dark">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center justify-between px-5 py-4 hover:bg-mauve/5 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${t.is_system ? "bg-mauve/10" : "bg-ink/5"}`}>
                        <FileText className={`h-4 w-4 ${t.is_system ? "text-mauve" : "text-ink-secondary"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-ink text-sm">{t.name}</p>
                          {t.is_system && <span className="text-xs bg-mauve/10 text-mauve font-bold px-1.5 py-0.5 rounded-full">System</span>}
                        </div>
                        <p className="text-xs text-ink-tertiary mt-0.5">{t.subject}</p>
                        {t.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {t.variables.map(v => (
                              <code key={v} className="text-[10px] bg-ink/5 text-ink-secondary px-1.5 py-0.5 rounded font-mono">{"{{" + v + "}}"}</code>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => duplicateTemplate(t)} className="p-1.5 text-ink-tertiary hover:text-ink-secondary hover:bg-mauve/5 rounded-lg" title="Duplicate">
                        <Copy className="h-4 w-4" />
                      </button>
                      <button onClick={() => openEdit(t)} className="p-1.5 text-ink-tertiary hover:text-ink-secondary hover:bg-mauve/5 rounded-lg" title="Edit">
                        <Edit3 className="h-4 w-4" />
                      </button>
                      {!t.is_system && (
                        <button onClick={() => deleteTemplate(t.id)} className="p-1.5 text-red-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg" title="Delete">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── LOGS TAB ─────────────────────────────────────────────── */}
        {tab === "logs" && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-surface-card border border-hairline-dark rounded-2xl p-4 flex flex-wrap gap-3 items-center">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-tertiary" />
                <input
                  value={logSearch}
                  onChange={e => setLogSearch(e.target.value)}
                  placeholder="Search recipient or subject..."
                  className="w-full pl-9 pr-3 py-2 border border-hairline-dark rounded-lg text-sm"
                />
              </div>
              <select
                value={logStatus}
                onChange={e => setLogStatus(e.target.value)}
                className="border border-hairline-dark rounded-lg px-3 py-2 text-sm bg-surface-card min-w-[120px]"
              >
                <option value="">All statuses</option>
                <option value="sent">Sent</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button onClick={refreshLogs} disabled={busy} className="flex items-center gap-1.5 border border-hairline-dark px-3 py-2 rounded-lg text-sm font-semibold text-ink-secondary hover:bg-mauve/5 disabled:opacity-50">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                Refresh
              </button>
            </div>

            {/* Logs table */}
            <div className="bg-surface-card border border-hairline-dark rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-ink/5 border-b border-hairline-dark">
                    <tr>
                      {["Recipient", "Subject", "Type", "Status", "Opened", "Clicked", "Sent At", "Retries"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-bold text-ink-secondary uppercase tracking-wider whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-hairline-dark">
                    {filteredLogs.length === 0 && (
                      <tr><td colSpan={8} className="px-4 py-8 text-center text-ink-tertiary text-sm">No email logs found.</td></tr>
                    )}
                    {filteredLogs.map(log => (
                      <tr key={log.id} className="hover:bg-mauve/5 transition-colors">
                        <td className="px-4 py-3 font-medium text-ink max-w-[180px] truncate">{log.recipient}</td>
                        <td className="px-4 py-3 text-ink-secondary max-w-[200px] truncate">{log.subject}</td>
                        <td className="px-4 py-3">
                          <span className="text-xs bg-ink/5 text-ink-secondary px-2 py-0.5 rounded-full font-mono">{log.email_type}</span>
                        </td>
                        <td className="px-4 py-3"><Badge status={log.status} /></td>
                        <td className="px-4 py-3 text-ink-tertiary text-xs">
                          {log.opened_at ? (
                            <span className="flex items-center gap-1 text-emerald-400"><Eye className="h-3 w-3" />{fmtDate(log.opened_at)}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-ink-tertiary text-xs">
                          {log.clicked_at ? (
                            <span className="flex items-center gap-1 text-mauve"><MousePointer className="h-3 w-3" />{fmtDate(log.clicked_at)}</span>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-ink-tertiary text-xs whitespace-nowrap">{fmtDate(log.created_at)}</td>
                        <td className="px-4 py-3 text-center text-ink-tertiary">{log.retry_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── SETTINGS TAB ─────────────────────────────────────────── */}
        {tab === "settings" && (
          <div className="space-y-6 max-w-3xl">
            <div className="bg-surface-card border border-hairline-dark rounded-2xl p-6 space-y-5">
              <h2 className="font-bold text-ink text-lg flex items-center gap-2"><Mail className="h-5 w-5 text-mauve" />Sender Configuration</h2>
              <div className="bg-amber-500/10 border border-amber-200 rounded-lg px-3 py-2.5 text-xs text-amber-800 flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                <span>
                  <strong>Sender Email</strong> must be on a domain you've verified in Resend — a webmail address
                  (gmail.com, yahoo.com, etc.) will always be rejected, since only the domain's owner can verify it.
                  Use <code className="bg-amber-500/10 px-1 rounded">onboarding@resend.dev</code> for testing, or add and
                  verify your own domain at{" "}
                  <a href="https://resend.com/domains" target="_blank" rel="noreferrer" className="underline font-semibold">
                    resend.com/domains
                  </a>{" "}
                  first. Reply-To, Support, and Contact emails have no such restriction.
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {([
                  { key: "sender_name", label: "Sender Name", placeholder: "Snapsy Event" },
                  { key: "sender_email", label: "Sender Email", placeholder: "onboarding@resend.dev" },
                  { key: "reply_to", label: "Reply-To Email", placeholder: "snapsyevent@gmail.com" },
                  { key: "support_email", label: "Support Email", placeholder: "snapsyevent@gmail.com" },
                  { key: "contact_email", label: "Contact Email", placeholder: "snapsyevent@gmail.com" },
                  { key: "logo_url", label: "Logo URL (optional)", placeholder: "https://..." },
                ] as const).map(({ key, label, placeholder }) => (
                  <div key={key} className="space-y-1.5">
                    <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">{label}</label>
                    <input
                      value={(settings as any)[key] ?? ""}
                      onChange={e => setSettings(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full border border-hairline-dark rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-surface-card border border-hairline-dark rounded-2xl p-6 space-y-4">
              <h2 className="font-bold text-ink text-lg flex items-center gap-2"><FileText className="h-5 w-5 text-mauve" />Email Footer & Signature</h2>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Footer Text</label>
                <input
                  value={settings.footer_text ?? ""}
                  onChange={e => setSettings(p => ({ ...p, footer_text: e.target.value }))}
                  placeholder="© Snapsy. All rights reserved."
                  className="w-full border border-hairline-dark rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Company Address</label>
                <input
                  value={settings.company_address ?? ""}
                  onChange={e => setSettings(p => ({ ...p, company_address: e.target.value }))}
                  placeholder="123 Example Street, City, Country"
                  className="w-full border border-hairline-dark rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-ink-secondary uppercase tracking-wider">Email Signature (HTML)</label>
                <textarea
                  value={settings.signature ?? ""}
                  onChange={e => setSettings(p => ({ ...p, signature: e.target.value }))}
                  rows={3}
                  placeholder="Warm regards,<br/>The Snapsy Team"
                  className="w-full border border-hairline-dark rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={saveSettings}
                disabled={busy}
                className="flex items-center gap-2 bg-mauve text-[#faf6ed] px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-mauve-strong disabled:opacity-50 shadow-md"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Settings
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
