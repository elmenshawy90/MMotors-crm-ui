import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import {
  Calendar, Clock, Loader2, Car, Plus, Trash2,
  MessageSquare, FileText, BarChart3, HelpCircle, Search, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────
interface VehicleRow {
  brand: string; model: string; model_year: string;
  chassis_number: string; license_plate: string;
  color_in: string; color_out: string;
  transmission: string; fuel_type: string;
}
const emptyRow = (): VehicleRow => ({
  brand: "", model: "", model_year: "", chassis_number: "",
  license_plate: "", color_in: "", color_out: "", transmission: "", fuel_type: "",
});

function addDays(d: string, n: number) {
  if (!d) return "";
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().split("T")[0];
}

// ─── Searchable Contact Select ────────────────────────────────────────────────
function ContactSearchSelect({
  contacts,
  value,
  onChange,
}: {
  contacts: any[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = contacts.filter((c: any) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    const name = `${c.first_name} ${c.last_name}`.toLowerCase();
    const phone = (c.phone || "").toLowerCase();
    const mobile = (c.mobile || "").toLowerCase();
    const email = (c.email || "").toLowerCase();
    return name.includes(s) || phone.includes(s) || mobile.includes(s) || email.includes(s);
  });

  const selected = contacts.find((c: any) => c.id === value);

  return (
    <Select
      value={value}
      onValueChange={(v) => { onChange(v); setQ(""); }}
    >
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Select contact">
          {selected
            ? `${selected.first_name} ${selected.last_name} — ${selected.phone}`
            : "Select contact"}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="p-0">
        {/* Search input pinned at top */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border sticky top-0 bg-background z-10">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, email…"
            className="flex-1 text-xs outline-none bg-transparent placeholder:text-muted-foreground"
            onKeyDown={(e) => e.stopPropagation()}
            // Keep focus in the input, not the list
            onMouseDown={(e) => e.stopPropagation()}
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(""); inputRef.current?.focus(); }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-52 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No contacts found
            </p>
          ) : (
            filtered.map((c: any) => (
              <SelectItem key={c.id} value={c.id} className="py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">
                    {c.first_name} {c.last_name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {[c.phone, c.mobile, c.email].filter(Boolean).join(" · ")}
                  </span>
                </div>
              </SelectItem>
            ))
          )}
        </div>
      </SelectContent>
    </Select>
  );
}

// ─── Duration MM:SS ────────────────────────────────────────────────────────────
function DurationPicker({ value, onChange }: { value: number; onChange: (s: number) => void }) {
  const m = Math.floor(value / 60), s = value % 60;
  return (
    <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-input bg-background">
      <input
        type="number" min={0} max={999}
        value={m.toString().padStart(2, "0")}
        onChange={(e) => onChange(+(e.target.value || 0) * 60 + s)}
        className="w-9 text-center bg-transparent font-mono text-sm outline-none"
      />
      <span className="text-muted-foreground font-mono select-none">:</span>
      <input
        type="number" min={0} max={59}
        value={s.toString().padStart(2, "0")}
        onChange={(e) => onChange(m * 60 + +(e.target.value || 0))}
        className="w-9 text-center bg-transparent font-mono text-sm outline-none"
      />
      <span className="text-xs text-muted-foreground ml-1 select-none">min</span>
    </div>
  );
}

// ─── Section title ─────────────────────────────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </p>
  );
}

// ─── Field wrapper ─────────────────────────────────────────────────────────────
function Field({
  label, required, children, span2,
}: {
  label: string; required?: boolean; children: React.ReactNode; span2?: boolean;
}) {
  return (
    <div className={span2 ? "col-span-2" : ""}>
      <Label className="text-xs font-medium text-foreground mb-1.5 block">
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      {children}
    </div>
  );
}

// ─── Props ─────────────────────────────────────────────────────────────────────
interface PhoneCallFormProps {
  onSuccess?: () => void;
  editingCall?: any;
}

// ─── Component ────────────────────────────────────────────────────────────────
export function PhoneCallForm({ onSuccess, editingCall }: PhoneCallFormProps) {
  const queryClient = useQueryClient();

  const { data: contactsRes } = useQuery({ queryKey: ["contacts"], queryFn: () => apiClient.getContacts() });
  const { data: branchesRes  } = useQuery({ queryKey: ["branches"],  queryFn: () => apiClient.getBranches() });
  const { data: usersRes     } = useQuery({ queryKey: ["users"],      queryFn: () => apiClient.getUsers() });
  const { data: vehiclesRes  } = useQuery({ queryKey: ["vehicles"],   queryFn: () => apiClient.getVehicles() });
  const { data: profile      } = useQuery({ queryKey: ["profile"],    queryFn: () => apiClient.getProfile() });

  const { data: companiesRes } = useQuery({ queryKey: ["companies"], queryFn: () => apiClient.getCompanies() });

  const contacts  = contactsRes?.data  || [];
  const branches  = branchesRes?.data  || [];
  const users     = usersRes?.data     || [];
  const vehicles  = vehiclesRes?.data  || [];
  const companies = companiesRes?.data || [];

  // Year list: 1980 → next year
  const currentYear = new Date().getFullYear();
  const yearList = Array.from({ length: currentYear - 1979 }, (_, i) => String(currentYear + 1 - i));

  // Extract unique models per brand from existing vehicles
  const modelsByBrand: Record<string, string[]> = {};
  vehicles.forEach((v: any) => {
    const brand = v.company_name || v.brand || v.make || "";
    const model = v.model || "";
    if (brand && model) {
      if (!modelsByBrand[brand]) modelsByBrand[brand] = [];
      if (!modelsByBrand[brand].includes(model)) modelsByBrand[brand].push(model);
    }
  });

  const [f, setF] = useState({
    contact_id: editingCall?.contact_id || "",
    caller_name: editingCall?.caller_name || "",
    caller_phone: editingCall?.caller_phone || "",
    contact_mobile: editingCall?.contact_mobile || "",
    branch_id: editingCall?.branch_id || "",
    agent_id: editingCall?.agent_id || "",
    agent_name: editingCall?.agent_name || "",
    direction: editingCall?.direction || "inbound",
    call_type: editingCall?.call_type || "",
    call_sub_type: editingCall?.call_sub_type || "",
    status: editingCall?.status || "completed",
    purpose: editingCall?.purpose || "inquiry",
    priority: editingCall?.priority || "medium",
    call_duration: editingCall?.call_duration || 0,
    vehicle_id: editingCall?.vehicle_id || "",
    chassis_number: editingCall?.chassis_number || "",
    license_plate: editingCall?.license_plate || "",
    campaign: editingCall?.campaign || "",
    how_found_campaign: editingCall?.how_found_campaign || "",
    in_regard_to: editingCall?.in_regard_to || "",
    regard_to_detail: editingCall?.regard_to_detail || "",
    notes: editingCall?.notes || "",
    call_summary: editingCall?.call_summary || "",
    follow_up_required: editingCall?.follow_up_required || false,
    follow_up_date: editingCall?.follow_up_date
      ? new Date(editingCall.follow_up_date).toISOString().split("T")[0] : "",
    follow_up_date_2: editingCall?.follow_up_date_2 || "",
    follow_up_date_3: editingCall?.follow_up_date_3 || "",
  });

  const [vehicleRows, setVehicleRows] = useState<VehicleRow[]>(
    editingCall?.vehicles_data?.length ? editingCall.vehicles_data : [emptyRow()]
  );
  const [salesInfo, setSalesInfo]           = useState<Record<string, string>>(editingCall?.sales_information || {});
  const [vehicleQs, setVehicleQs] = useState<{ question: string; answer: string }[]>(
    editingCall?.vehicle_questions?.length
      ? editingCall.vehicle_questions
      : []
  );
  const [messages, setMessages]             = useState<{ text: string; time: string; type: string }[]>(editingCall?.sent_messages || []);
  const [msgInput, setMsgInput]             = useState("");
  const [msgType, setMsgType]               = useState<"message" | "note">("message");

  // Auto-fill agent
  useEffect(() => {
    if (profile && !editingCall) {
      setF((p) => ({
        ...p,
        agent_id:   profile.id || "",
        agent_name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim(),
        branch_id:  profile.branch_id || p.branch_id,
      }));
    }
  }, [profile]);

  // Auto follow-up dates
  useEffect(() => {
    if (f.follow_up_date) {
      setF((p) => ({
        ...p,
        follow_up_date_2: addDays(f.follow_up_date, 1),
        follow_up_date_3: addDays(f.follow_up_date, 3),
      }));
    }
  }, [f.follow_up_date]);

  const handleContact = (id: string) => {
    const c = contacts.find((x: any) => x.id === id);
    if (c) setF((p) => ({
      ...p, contact_id: id,
      caller_name:    `${c.first_name} ${c.last_name}`,
      caller_phone:   c.phone   || p.caller_phone,
      contact_mobile: c.mobile  || p.contact_mobile,
      branch_id:      c.branch_id || p.branch_id,
    }));
  };
  const handleVehicle = (id: string) => {
    const v = vehicles.find((x: any) => x.id === id);
    if (v) setF((p) => ({
      ...p, vehicle_id: id,
      chassis_number: v.vin           || p.chassis_number,
      license_plate:  v.license_plate || p.license_plate,
    }));
  };
  const handleAgent = (id: string) => {
    const u = users.find((x: any) => x.id === id);
    if (u) setF((p) => ({
      ...p, agent_id:   id,
      agent_name: `${u.first_name} ${u.last_name}`.trim(),
      branch_id:  u.branch_id || p.branch_id,
    }));
  };

  const mutation = useMutation({
    mutationFn: (data: any) =>
      editingCall ? apiClient.updatePhoneCall(editingCall.id, data) : apiClient.createPhoneCall(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-calls"] });
      toast.success(editingCall ? "Call updated" : "Call created");
      onSuccess?.();
    },
    onError: (e: any) => toast.error(e?.response?.data?.message || "Failed to save"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.caller_phone) { toast.error("Phone is required"); return; }
    if (!f.branch_id)    { toast.error("Branch is required"); return; }
    mutation.mutate({
      ...f,
      follow_up_date:   f.follow_up_required && f.follow_up_date   ? f.follow_up_date   : null,
      follow_up_date_2: f.follow_up_required && f.follow_up_date_2 ? f.follow_up_date_2 : null,
      follow_up_date_3: f.follow_up_required && f.follow_up_date_3 ? f.follow_up_date_3 : null,
      contact_id:  f.contact_id  || null,
      vehicle_id:  f.vehicle_id  || null,
      vehicles_data:    vehicleRows.filter((r) => r.brand || r.chassis_number || r.license_plate),
      sales_information: salesInfo,
      vehicle_questions: vehicleQs,
      sent_messages: messages,
    });
  };

  const addMsg = () => {
    if (!msgInput.trim()) return;
    setMessages([...messages, { text: msgInput, time: new Date().toISOString(), type: msgType }]);
    setMsgInput("");
  };
  const updateRow = (i: number, k: keyof VehicleRow, v: string) =>
    setVehicleRows((rows) => rows.map((r, idx) => idx === i ? { ...r, [k]: v } : r));

  const now = new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* ══════════ SECTION 1 — Basic Info ══════════ */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <SectionTitle>Basic Information</SectionTitle>

        {/* Date display + Direction */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="text-xs font-medium text-muted-foreground block mb-1">Date</Label>
            <p className="text-sm font-semibold tabular-nums text-foreground">{now}</p>
          </div>
          <div>
            <Label className="text-xs font-medium text-muted-foreground block mb-1">Direction</Label>
            <div className="flex rounded-lg overflow-hidden border border-input">
              {[
                { val: "inbound",  label: "In",  bg: "bg-blue-600"  },
                { val: "outbound", label: "Out", bg: "bg-green-600" },
              ].map(({ val, label, bg }) => (
                <button
                  key={val} type="button"
                  onClick={() => setF({ ...f, direction: val })}
                  className={cn(
                    "px-5 py-1.5 text-sm font-semibold transition-colors",
                    f.direction === val ? `${bg} text-white` : "bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4-col grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Phone Call Type">
            <Input value={f.call_type} onChange={(e) => setF({ ...f, call_type: e.target.value })}
              placeholder="Sales, Service…" className="h-9" />
          </Field>
          <Field label="Sub Phone Call Type">
            <Input value={f.call_sub_type} onChange={(e) => setF({ ...f, call_sub_type: e.target.value })}
              placeholder="Sub-category" className="h-9" />
          </Field>
          <Field label="Status">
            <Select value={f.status} onValueChange={(v) => setF({ ...f, status: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="missed">Missed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
                <SelectItem value="voicemail">Voicemail</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Purpose">
            <Select value={f.purpose} onValueChange={(v) => setF({ ...f, purpose: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="inquiry">Inquiry</SelectItem>
                <SelectItem value="appointment">Appointment</SelectItem>
                <SelectItem value="complaint">Complaint</SelectItem>
                <SelectItem value="support">Support</SelectItem>
                <SelectItem value="sales">Sales</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Agent">
            <Select value={f.agent_id} onValueChange={handleAgent}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select agent" /></SelectTrigger>
              <SelectContent>
                {profile && (
                  <SelectItem value={profile.id}>★ {profile.first_name} {profile.last_name} (You)</SelectItem>
                )}
                {users.filter((u: any) => u.id !== profile?.id).map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>{u.first_name} {u.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Branch" required>
            <Select value={f.branch_id} onValueChange={(v) => setF({ ...f, branch_id: v })}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Select branch" /></SelectTrigger>
              <SelectContent>
                {branches.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Priority">
            <Select value={f.priority} onValueChange={(v) => setF({ ...f, priority: v })}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Duration">
            <DurationPicker value={f.call_duration} onChange={(s) => setF({ ...f, call_duration: s })} />
          </Field>
        </div>
      </div>

      {/* ══════════ SECTION 2 — Contact & Vehicle ══════════ */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <SectionTitle>Contact & Vehicle</SectionTitle>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Contact">
            <ContactSearchSelect
              contacts={contacts}
              value={f.contact_id}
              onChange={handleContact}
            />
          </Field>
          <Field label="Phone" required>
            <Input value={f.caller_phone} onChange={(e) => setF({ ...f, caller_phone: e.target.value })}
              placeholder="+20 xxx xxx xxxx" className="h-9" />
          </Field>
          <Field label="Mobile">
            <Input value={f.contact_mobile} onChange={(e) => setF({ ...f, contact_mobile: e.target.value })}
              placeholder="+20 1xx xxx xxxx" className="h-9" />
          </Field>
          <Field label="Selected Vehicle">
            <Select value={f.vehicle_id} onValueChange={handleVehicle}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Optional" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">— None —</SelectItem>
                {vehicles.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.year} {v.make} {v.model} — {v.license_plate}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Field label="Chassis Number">
            <Input value={f.chassis_number} onChange={(e) => setF({ ...f, chassis_number: e.target.value })}
              placeholder="VIN / Chassis" className="h-9" />
          </Field>
          <Field label="License Plate">
            <Input value={f.license_plate} onChange={(e) => setF({ ...f, license_plate: e.target.value })}
              placeholder="Plate" className="h-9" />
          </Field>
          <Field label="In Regard To">
            <Input value={f.in_regard_to} onChange={(e) => setF({ ...f, in_regard_to: e.target.value })}
              placeholder="What is this call about?" className="h-9" />
          </Field>
          <Field label="Regard To (detail)">
            <Input value={f.regard_to_detail} onChange={(e) => setF({ ...f, regard_to_detail: e.target.value })}
              placeholder="Additional detail" className="h-9" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Campaign">
            <Input value={f.campaign} onChange={(e) => setF({ ...f, campaign: e.target.value })}
              placeholder="Campaign name" className="h-9" />
          </Field>
          <Field label="How did you find campaign?">
            <Input value={f.how_found_campaign} onChange={(e) => setF({ ...f, how_found_campaign: e.target.value })}
              placeholder="Social media, referral…" className="h-9" />
          </Field>
        </div>
      </div>

      {/* ══════════ SECTION 3 — Follow-up ══════════ */}
      <div className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="fu"
            checked={f.follow_up_required}
            onCheckedChange={(v) => setF({ ...f, follow_up_required: v as boolean })}
          />
          <Label htmlFor="fu" className="cursor-pointer font-medium text-sm">
            Follow-up Required
          </Label>
        </div>

        {f.follow_up_required && (
          <div className="grid grid-cols-3 gap-4 pt-1">
            {/* FU1 */}
            <div className="rounded-lg border border-blue-200 bg-blue-50/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Follow-up Date 1
              </p>
              <Input type="date" value={f.follow_up_date}
                onChange={(e) => setF({ ...f, follow_up_date: e.target.value })}
                className="h-8 text-xs bg-white" />
              <p className="text-[10px] text-blue-600">Set manually</p>
            </div>
            {/* FU2 */}
            <div className="rounded-lg border border-orange-200 bg-orange-50/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-orange-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Follow-up Date 2
                <Badge variant="outline" className="text-[9px] py-0 border-orange-300">Auto</Badge>
              </p>
              <Input type="date" value={f.follow_up_date_2} readOnly
                className="h-8 text-xs bg-white/50 cursor-not-allowed opacity-70" />
              <p className="text-[10px] text-orange-600">+1 day from Date 1</p>
            </div>
            {/* FU3 */}
            <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-3 space-y-2">
              <p className="text-xs font-semibold text-rose-700 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" /> Follow-up Date 3
                <Badge variant="outline" className="text-[9px] py-0 border-rose-300">Auto</Badge>
              </p>
              <Input type="date" value={f.follow_up_date_3} readOnly
                className="h-8 text-xs bg-white/50 cursor-not-allowed opacity-70" />
              <p className="text-[10px] text-rose-600">+3 days from Date 1</p>
            </div>
          </div>
        )}
      </div>

      {/* ══════════ SECTION 4 — Tabs ══════════ */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Tabs defaultValue="vehicles">
          <TabsList className="w-full rounded-none border-b border-border bg-muted/40 h-11 px-2 gap-1 justify-start">
            <TabsTrigger value="vehicles" className="text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Car className="h-3.5 w-3.5" /> Vehicles Data
            </TabsTrigger>
            <TabsTrigger value="sales" className="text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <BarChart3 className="h-3.5 w-3.5" /> Sales Information
            </TabsTrigger>
            <TabsTrigger value="questions" className="text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <HelpCircle className="h-3.5 w-3.5" /> Vehicle Questions
            </TabsTrigger>
            <TabsTrigger value="summary" className="text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <FileText className="h-3.5 w-3.5" /> Call Summary
            </TabsTrigger>
          </TabsList>

          {/* ── Vehicles Data ── */}
          <TabsContent value="vehicles" className="p-4 space-y-3">
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    {["Brand","Model","Model Year","Chassis Number","License Plate","Color In","Color Out","Transmission","Fuel Type",""].map((h, i) => (
                      <th key={i} className="px-3 py-2.5 text-left font-semibold text-muted-foreground whitespace-nowrap border-b border-border">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicleRows.map((row, i) => (
                    <tr key={i} className="border-b border-border/40 last:border-0 hover:bg-muted/20 transition-colors">

                      {/* Brand — Select from companies */}
                      <td className="p-1 min-w-[130px]">
                        <Select
                          value={row.brand}
                          onValueChange={(v) => {
                            updateRow(i, "brand", v);
                            updateRow(i, "model", ""); // reset model when brand changes
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs border-0 bg-transparent focus:bg-primary/5 shadow-none px-2">
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                          <SelectContent>
                            {companies.map((c: any) => (
                              <SelectItem key={c.id} value={c.name} className="text-xs">
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Model — filtered by brand */}
                      <td className="p-1 min-w-[130px]">
                        {row.brand && modelsByBrand[row.brand]?.length > 0 ? (
                          <Select
                            value={row.model}
                            onValueChange={(v) => updateRow(i, "model", v)}
                          >
                            <SelectTrigger className="h-7 text-xs border-0 bg-transparent focus:bg-primary/5 shadow-none px-2">
                              <SelectValue placeholder="Select model" />
                            </SelectTrigger>
                            <SelectContent>
                              {modelsByBrand[row.brand].map((m) => (
                                <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <input
                            value={row.model}
                            onChange={(e) => updateRow(i, "model", e.target.value)}
                            placeholder={row.brand ? "Type model" : "Select brand first"}
                            className="w-full px-2 py-1.5 bg-transparent outline-none focus:bg-primary/5 transition-colors text-xs min-w-[100px]"
                          />
                        )}
                      </td>

                      {/* Model Year — Select */}
                      <td className="p-1 min-w-[100px]">
                        <Select
                          value={row.model_year}
                          onValueChange={(v) => updateRow(i, "model_year", v)}
                        >
                          <SelectTrigger className="h-7 text-xs border-0 bg-transparent focus:bg-primary/5 shadow-none px-2">
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent className="max-h-52">
                            {yearList.map((y) => (
                              <SelectItem key={y} value={y} className="text-xs">{y}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Remaining free-text fields */}
                      {(["chassis_number","license_plate","color_in","color_out","transmission","fuel_type"] as (keyof VehicleRow)[]).map((k) => (
                        <td key={k} className="p-0">
                          <input
                            value={row[k]}
                            onChange={(e) => updateRow(i, k, e.target.value)}
                            placeholder="—"
                            className="w-full px-3 py-2 bg-transparent outline-none focus:bg-primary/5 transition-colors text-xs min-w-[80px]"
                          />
                        </td>
                      ))}

                      <td className="px-2">
                        <button type="button" onClick={() => setVehicleRows(vehicleRows.filter((_, x) => x !== i))}
                          className="p-1 text-muted-foreground hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {vehicleRows.length === 0 && (
                    <tr><td colSpan={10} className="py-8 text-center text-muted-foreground text-xs">No vehicles added</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={() => setVehicleRows([...vehicleRows, emptyRow()])}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium">
              <Plus className="h-3 w-3" /> Add a line
            </button>
          </TabsContent>

          {/* ── Sales Information ── */}
          <TabsContent value="sales" className="p-4 space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                ["interested_model","Interested Model"],["budget","Budget (EGP)"],
                ["financing","Financing?"],["trade_in","Trade-in?"],
                ["expected_purchase","Expected Purchase"],["competitor","Competitor"],
                ["source","Lead Source"],["offer_given","Offer Given"],
              ].map(([k, l]) => (
                <div key={k}>
                  <Label className="text-xs text-muted-foreground mb-1 block">{l}</Label>
                  <Input value={salesInfo[k] || ""} onChange={(e) => setSalesInfo({ ...salesInfo, [k]: e.target.value })}
                    placeholder={l} className="h-8 text-xs" />
                </div>
              ))}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1 block">Additional Notes</Label>
              <Textarea rows={3} value={salesInfo.notes || ""}
                onChange={(e) => setSalesInfo({ ...salesInfo, notes: e.target.value })}
                placeholder="Additional sales notes…" className="text-sm resize-none" />
            </div>
          </TabsContent>

          {/* ── Vehicle Questions ── */}
          <TabsContent value="questions" className="p-4 space-y-3">
            {/* Questions list */}
            {vehicleQs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground border border-dashed border-border rounded-lg">
                <HelpCircle className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm font-medium">No questions yet</p>
                <p className="text-xs mt-1">Click "Add Question" to get started</p>
              </div>
            ) : (
              <div className="space-y-2">
                {vehicleQs.map((row, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start bg-muted/30 rounded-lg px-3 py-2.5 border border-border/60">
                    <div>
                      <Label className="text-[10px] text-muted-foreground mb-1 block">Question</Label>
                      <Input
                        value={row.question}
                        onChange={(e) =>
                          setVehicleQs(vehicleQs.map((q, x) => x === i ? { ...q, question: e.target.value } : q))
                        }
                        placeholder="e.g. Current vehicle?"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground mb-1 block">Answer</Label>
                      <Input
                        value={row.answer}
                        onChange={(e) =>
                          setVehicleQs(vehicleQs.map((q, x) => x === i ? { ...q, answer: e.target.value } : q))
                        }
                        placeholder="Customer's answer"
                        className="h-8 text-xs"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setVehicleQs(vehicleQs.filter((_, x) => x !== i))}
                      className="mt-5 p-1.5 text-muted-foreground hover:text-red-500 transition-colors rounded"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add button */}
            <button
              type="button"
              onClick={() => setVehicleQs([...vehicleQs, { question: "", answer: "" }])}
              className="flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
            >
              <Plus className="h-3.5 w-3.5" /> Add Question
            </button>
          </TabsContent>

          {/* ── Call Summary ── */}
          <TabsContent value="summary" className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block font-semibold">Notes</Label>
                <Textarea rows={5} value={f.notes}
                  onChange={(e) => setF({ ...f, notes: e.target.value })}
                  placeholder="General call notes…" className="text-sm resize-none" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block font-semibold">Call Summary</Label>
                <Textarea rows={5} value={f.call_summary}
                  onChange={(e) => setF({ ...f, call_summary: e.target.value })}
                  placeholder="Outcome and next steps…" className="text-sm resize-none" />
              </div>
            </div>

            <Separator />

            {/* Messages */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">
                Messages &amp; Log Notes
              </Label>
              <div className="flex gap-1.5">
                {[
                  { val: "message", label: "Send message", icon: <MessageSquare className="h-3.5 w-3.5" /> },
                  { val: "note",    label: "Log note",     icon: <FileText className="h-3.5 w-3.5" /> },
                ].map(({ val, label, icon }) => (
                  <button key={val} type="button"
                    onClick={() => setMsgType(val as any)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border transition-all",
                      msgType === val
                        ? "bg-primary text-white border-primary"
                        : "border-input text-muted-foreground hover:border-primary hover:text-foreground"
                    )}
                  >
                    {icon} {label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={msgInput} onChange={(e) => setMsgInput(e.target.value)}
                  placeholder={msgType === "message" ? "Type your message…" : "Type your note…"}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), addMsg())}
                  className="h-9 text-sm flex-1" />
                <Button type="button" size="sm" variant="secondary" onClick={addMsg}>Add</Button>
              </div>
              {messages.length > 0 && (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {messages.map((m, i) => (
                    <div key={i} className={cn(
                      "flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-xs border",
                      m.type === "note"
                        ? "bg-amber-50 border-amber-200"
                        : "bg-blue-50 border-blue-200"
                    )}>
                      {m.type === "note"
                        ? <FileText className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                        : <MessageSquare className="h-3.5 w-3.5 text-blue-600 shrink-0 mt-0.5" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-foreground leading-relaxed">{m.text}</p>
                        <p className="text-muted-foreground text-[10px] mt-0.5">
                          {new Date(m.time).toLocaleString("en-GB", { dateStyle: "short", timeStyle: "short" })}
                        </p>
                      </div>
                      <button type="button" onClick={() => setMessages(messages.filter((_, x) => x !== i))}
                        className="text-muted-foreground hover:text-red-500 shrink-0">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ══════════ Footer ══════════ */}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onSuccess}>Cancel</Button>
        <Button type="submit" disabled={mutation.isPending} className="min-w-[120px]">
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editingCall ? "Update Call" : "Create Call"}
        </Button>
      </div>
    </form>
  );
}
