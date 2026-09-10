import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Phone, PhoneIncoming, PhoneOutgoing, PhoneMissed, PhoneOff,
  Clock, Search, MoreVertical, AlertCircle, CheckCircle,
  Trash2, RefreshCw, Plus, Calendar,
  User, Building, X, Edit, ArrowUpRight,
  Loader2, Filter, Activity, CalendarPlus, LifeBuoy,
} from "lucide-react";
import { PageShell } from "@/components/AppTopbar";
import { AppSidebar } from "@/components/AppSidebar";
import { PhoneCallForm } from "@/components/forms/PhoneCallForm";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { TicketForm } from "@/components/forms/TicketForm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/phonecalls")({
  head: () => ({
    meta: [
      { title: "Phone Calls — SIG" },
      { name: "description", content: "Phone call management with follow-up tracking." },
    ],
  }),
  component: PhoneCallsPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return (name || "?")
    .split(" ").map((n) => n[0] || "").join("").toUpperCase().slice(0, 2);
}

function formatDuration(s: number) {
  if (!s) return "—";
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function formatDate(d?: string | null) {
  if (!d) return "—";
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}

function formatDateTime(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("en-GB", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
  } catch { return d; }
}

function isToday(d?: string | null) {
  if (!d) return false;
  const today = new Date().toISOString().split("T")[0];
  return d.startsWith(today);
}

function isPast(d?: string | null) {
  if (!d) return false;
  return new Date(d) < new Date();
}

function isSoon(d?: string | null) {
  if (!d) return false;
  const diff = new Date(d).getTime() - Date.now();
  return diff > 0 && diff < 86_400_000 * 3; // within 3 days
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  completed:  "bg-green-100 text-green-700 border-green-200",
  missed:     "bg-red-100 text-red-700 border-red-200",
  cancelled:  "bg-gray-100 text-gray-600 border-gray-200",
  voicemail:  "bg-purple-100 text-purple-700 border-purple-200",
};

const DIR_COLOR: Record<string, string> = {
  inbound:  "bg-blue-100 text-blue-700 border-blue-200",
  outbound: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const PURPOSE_COLOR: Record<string, string> = {
  inquiry:     "bg-blue-100 text-blue-700",
  appointment: "bg-violet-100 text-violet-700",
  complaint:   "bg-red-100 text-red-700",
  support:     "bg-cyan-100 text-cyan-700",
  sales:       "bg-orange-100 text-orange-700",
  follow_up:   "bg-green-100 text-green-700",
  other:       "bg-gray-100 text-gray-600",
};

function DirIcon({ dir }: { dir: string }) {
  if (dir === "inbound")  return <PhoneIncoming  className="h-3.5 w-3.5" />;
  if (dir === "outbound") return <PhoneOutgoing   className="h-3.5 w-3.5" />;
  return <Phone className="h-3.5 w-3.5" />;
}

function StatusIcon({ status }: { status: string }) {
  if (status === "completed") return <CheckCircle className="h-3.5 w-3.5" />;
  if (status === "missed")    return <PhoneMissed  className="h-3.5 w-3.5" />;
  if (status === "cancelled") return <PhoneOff     className="h-3.5 w-3.5" />;
  return <Phone className="h-3.5 w-3.5" />;
}

// ─── Follow-up date chip ──────────────────────────────────────────────────────

function FollowUpChip({ label, date, color }: { label: string; date?: string | null; color: string }) {
  if (!date) return null;
  const past = isPast(date);
  const soon = isSoon(date);
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs border",
      past  ? "bg-red-50 text-red-700 border-red-200" :
      soon  ? "bg-amber-50 text-amber-700 border-amber-200" :
              `${color}`
    )}>
      <Calendar className="h-3 w-3 shrink-0" />
      <span className="font-medium">{label}</span>
      <span className="opacity-70">{formatDate(date)}</span>
      {past && <span className="font-semibold">• Overdue</span>}
      {!past && soon && <span className="font-semibold">• Soon</span>}
    </div>
  );
}

// ─── Call Card ────────────────────────────────────────────────────────────────

function CallCard({
  call, onOpen, onDelete, onEdit, selected, bulkMode, onSelect,
}: {
  call: any; onOpen: (c: any) => void; onDelete: (id: string) => void;
  onEdit: (c: any) => void; selected: boolean; bulkMode: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <Card
      className={cn(
        "glass-card hover-lift transition-all group cursor-pointer relative",
        selected && "ring-2 ring-primary ring-offset-2"
      )}
      onClick={() => bulkMode ? onSelect(call.id) : onOpen(call)}
    >
      {bulkMode && (
        <div className="absolute top-3 left-3 z-10">
          <Checkbox checked={selected} onCheckedChange={() => onSelect(call.id)} />
        </div>
      )}
      <CardContent className={cn("p-4 space-y-3", bulkMode && "pl-10")}>
        {/* Row 1 — avatar + name + badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className="h-10 w-10 border-2 border-primary/20 shrink-0">
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                {initials(call.caller_name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-sm group-hover:text-primary transition-colors truncate">
                {call.caller_name || "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground">{call.caller_phone}</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Badge className={cn("text-[10px] border gap-1", DIR_COLOR[call.direction] || "bg-gray-100")}>
              <DirIcon dir={call.direction} />
              {call.direction}
            </Badge>
            <Badge className={cn("text-[10px] border gap-1", STATUS_COLOR[call.status] || "bg-gray-100")}>
              <StatusIcon status={call.status} />
              {call.status}
            </Badge>
          </div>
        </div>

        {/* Row 2 — purpose + branch + duration */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Badge className={cn("text-[10px]", PURPOSE_COLOR[call.purpose] || "bg-gray-100")}>
              {(call.purpose || "other").replace("_", " ")}
            </Badge>
            {call.branch?.name && (
              <span className="flex items-center gap-1">
                <Building className="h-3 w-3" />
                {call.branch.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(call.call_duration)}
          </div>
        </div>

        {/* Row 3 — notes preview */}
        {call.notes && (
          <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/40 rounded px-2 py-1">
            {call.notes}
          </p>
        )}

        {/* Row 4 — follow-up dates */}
        {call.follow_up_required && (
          <div className="flex flex-wrap gap-1.5">
            <FollowUpChip
              label="FU 1" date={call.follow_up_date}
              color="bg-blue-50 text-blue-700 border-blue-200"
            />
            <FollowUpChip
              label="FU 2" date={call.follow_up_date_2}
              color="bg-orange-50 text-orange-700 border-orange-200"
            />
            <FollowUpChip
              label="FU 3" date={call.follow_up_date_3}
              color="bg-red-50 text-red-700 border-red-200"
            />
          </div>
        )}

        {/* Row 5 — date + actions */}
        <div className="flex items-center justify-between pt-1 border-t border-border/50">
          <span className="text-[10px] text-muted-foreground">
            {formatDateTime(call.call_date)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost" size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(call); }}>
                <ArrowUpRight className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(call); }}>
                <Edit className="mr-2 h-4 w-4" /> Edit Call
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => { e.stopPropagation(); onDelete(call.id); }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Detail Sheet ─────────────────────────────────────────────────────────────

function CallDetailSheet({
  call, open, onClose, onEdit, onDelete, onConvertToAppointment, onConvertToTicket,
}: {
  call: any | null; open: boolean; onClose: () => void;
  onEdit: (c: any) => void; onDelete: (id: string) => void;
  onConvertToAppointment: (c: any) => void;
  onConvertToTicket: (c: any) => void;
}) {
  if (!call) return null;
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="mb-4">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-lg">{call.caller_name}</SheetTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => onEdit(call)}>
                <Edit className="h-3.5 w-3.5 mr-1" /> Edit
              </Button>
              <Button
                size="sm" variant="destructive"
                onClick={() => { onDelete(call.id); onClose(); }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <SheetDescription>{call.caller_phone}</SheetDescription>
        </SheetHeader>

        <div className="space-y-5">
          {/* Status row */}
          <div className="flex flex-wrap gap-2">
            <Badge className={cn("border", DIR_COLOR[call.direction] || "bg-gray-100")}>
              <DirIcon dir={call.direction} />
              <span className="ml-1 capitalize">{call.direction}</span>
            </Badge>
            <Badge className={cn("border", STATUS_COLOR[call.status] || "bg-gray-100")}>
              <StatusIcon status={call.status} />
              <span className="ml-1 capitalize">{call.status}</span>
            </Badge>
            <Badge className={cn(PURPOSE_COLOR[call.purpose] || "bg-gray-100")}>
              {(call.purpose || "other").replace("_", " ")}
            </Badge>
          </div>

          {/* Convert actions */}
          <div className="flex gap-2">
            <Button
              size="sm"
              className="flex-1 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30"
              variant="ghost"
              onClick={() => { onConvertToAppointment(call); onClose(); }}
            >
              <CalendarPlus className="mr-2 h-4 w-4" />
              Convert to Appointment
            </Button>
            <Button
              size="sm"
              className="flex-1 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200"
              variant="ghost"
              onClick={() => { onConvertToTicket(call); onClose(); }}
            >
              <LifeBuoy className="mr-2 h-4 w-4" />
              Convert to Ticket
            </Button>
          </div>

          {/* Key info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: <Clock className="h-4 w-4 text-muted-foreground" />,    label: "Date",     value: formatDateTime(call.call_date)            },
              { icon: <Activity className="h-4 w-4 text-muted-foreground" />, label: "Duration", value: formatDuration(call.call_duration)         },
              { icon: <Building className="h-4 w-4 text-muted-foreground" />, label: "Branch",   value: call.branch?.name || "—"                   },
              { icon: <User className="h-4 w-4 text-muted-foreground" />,     label: "Agent",    value: call.agent_name || call.creator?.first_name
                  ? `${call.creator?.first_name} ${call.creator?.last_name}`.trim() : "—"       },
            ].map((row) => (
              <div key={row.label} className="rounded-lg bg-muted/40 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {row.icon} {row.label}
                </div>
                <p className="text-sm font-semibold">{row.value}</p>
              </div>
            ))}
          </div>

          {/* Notes */}
          {call.notes && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Notes
                </p>
                <p className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 rounded-lg p-3">
                  {call.notes}
                </p>
              </div>
            </>
          )}

          {/* Follow-up section */}
          {call.follow_up_required && (
            <>
              <Separator />
              <div className="space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5" /> Follow-up Schedule
                </p>
                <div className="space-y-2">
                  {/* FU 1 */}
                  <div className={cn(
                    "flex items-center justify-between rounded-lg border p-3",
                    isPast(call.follow_up_date)
                      ? "bg-red-50 border-red-200"
                      : "bg-blue-50 border-blue-200"
                  )}>
                    <div>
                      <p className="text-xs font-semibold text-blue-700">Follow-up 1</p>
                      <p className="text-sm font-bold">{formatDate(call.follow_up_date)}</p>
                      <p className="text-[10px] text-muted-foreground">Set manually</p>
                    </div>
                    {isPast(call.follow_up_date)
                      ? <Badge className="bg-red-100 text-red-700 border-red-200 border">Overdue</Badge>
                      : isSoon(call.follow_up_date)
                      ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">Soon</Badge>
                      : <Badge className="bg-blue-100 text-blue-700 border-blue-200 border">Upcoming</Badge>
                    }
                  </div>

                  {/* FU 2 */}
                  {call.follow_up_date_2 && (
                    <div className={cn(
                      "flex items-center justify-between rounded-lg border p-3",
                      isPast(call.follow_up_date_2)
                        ? "bg-red-50 border-red-200"
                        : "bg-orange-50 border-orange-200"
                    )}>
                      <div>
                        <p className="text-xs font-semibold text-orange-700">Follow-up 2</p>
                        <p className="text-sm font-bold">{formatDate(call.follow_up_date_2)}</p>
                        <p className="text-[10px] text-muted-foreground">+1 day from FU1</p>
                      </div>
                      {isPast(call.follow_up_date_2)
                        ? <Badge className="bg-red-100 text-red-700 border-red-200 border">Overdue</Badge>
                        : isSoon(call.follow_up_date_2)
                        ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">Soon</Badge>
                        : <Badge className="bg-orange-100 text-orange-700 border-orange-200 border">Upcoming</Badge>
                      }
                    </div>
                  )}

                  {/* FU 3 */}
                  {call.follow_up_date_3 && (
                    <div className={cn(
                      "flex items-center justify-between rounded-lg border p-3",
                      isPast(call.follow_up_date_3)
                        ? "bg-red-50 border-red-200"
                        : "bg-rose-50 border-rose-200"
                    )}>
                      <div>
                        <p className="text-xs font-semibold text-rose-700">Follow-up 3</p>
                        <p className="text-sm font-bold">{formatDate(call.follow_up_date_3)}</p>
                        <p className="text-[10px] text-muted-foreground">+3 days from FU1</p>
                      </div>
                      {isPast(call.follow_up_date_3)
                        ? <Badge className="bg-red-100 text-red-700 border-red-200 border">Overdue</Badge>
                        : isSoon(call.follow_up_date_3)
                        ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 border">Soon</Badge>
                        : <Badge className="bg-rose-100 text-rose-700 border-rose-200 border">Upcoming</Badge>
                      }
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Contact info */}
          {call.contact && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Linked Contact
                </p>
                <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <Avatar className="h-9 w-9 border border-primary/20">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {initials(`${call.contact.first_name} ${call.contact.last_name}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-semibold">
                      {call.contact.first_name} {call.contact.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{call.contact.phone}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Call Grid ────────────────────────────────────────────────────────────────

function CallGrid({
  calls, onOpen, onDelete, onEdit, selectedCalls, bulkMode, onSelect, emptyMessage,
}: {
  calls: any[]; onOpen: (c: any) => void; onDelete: (id: string) => void;
  onEdit: (c: any) => void; selectedCalls: Set<string>; bulkMode: boolean;
  onSelect: (id: string) => void; emptyMessage: string;
}) {
  if (calls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
        <Phone className="h-12 w-12 opacity-20" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {calls.map((call) => (
        <CallCard
          key={call.id}
          call={call}
          onOpen={onOpen}
          onDelete={onDelete}
          onEdit={onEdit}
          selected={selectedCalls.has(call.id)}
          bulkMode={bulkMode}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

// ─── Purpose → ticket category mapping ───────────────────────────────────────
function purposeToTicketCategory(purpose?: string): string {
  const map: Record<string, string> = {
    inquiry:     "general",
    appointment: "general",
    complaint:   "other",
    support:     "technical",
    sales:       "general",
    follow_up:   "general",
    other:       "other",
  };
  return map[purpose || "other"] || "general";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function PhoneCallsPage() {
  const queryClient = useQueryClient();

  // ── Filters ────────────────────────────────────────────────────────────────
  const [q, setQ]             = useState("");
  const [branch, setBranch]   = useState("all");
  const [status, setStatus]   = useState("all");
  const [purpose, setPurpose] = useState("all");
  const [dir, setDir]         = useState("all");

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [activeTab, setActiveTab]               = useState("all");
  const [isFormOpen, setIsFormOpen]             = useState(false);
  const [editingCall, setEditingCall]           = useState<any | null>(null);
  const [detailCall, setDetailCall]             = useState<any | null>(null);
  const [detailOpen, setDetailOpen]             = useState(false);
  const [deleteTarget, setDeleteTarget]         = useState<string | null>(null);
  const [bulkMode, setBulkMode]                 = useState(false);
  const [selectedCalls, setSelectedCalls]       = useState<Set<string>>(new Set());
  // ── Convert state ──────────────────────────────────────────────────────────
  const [convertApptCall, setConvertApptCall]   = useState<any | null>(null);
  const [convertTicketCall, setConvertTicketCall] = useState<any | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: phoneCallsRes, isLoading, refetch } = useQuery({
    queryKey: ["phone-calls"],
    queryFn:  () => apiClient.getPhoneCalls(),
    staleTime: 30_000,
  });

  const { data: branchesRes } = useQuery({
    queryKey: ["branches"],
    queryFn:  () => apiClient.getBranches(),
  });

  const phoneCalls: any[] = phoneCallsRes?.data || [];
  const branches:   any[] = branchesRes?.data    || [];

  // ── Delete mutation ────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deletePhoneCall(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-calls"] });
      toast.success("Call deleted");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete call"),
  });

  // ── Filtering ──────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return phoneCalls
      .filter((c) => branch  === "all" || c.branch_id === branch)
      .filter((c) => status  === "all" || c.status    === status)
      .filter((c) => purpose === "all" || c.purpose   === purpose)
      .filter((c) => dir     === "all" || c.direction === dir)
      .filter((c) => {
        if (!q.trim()) return true;
        const s = q.toLowerCase();
        return (
          (c.caller_name  || "").toLowerCase().includes(s) ||
          (c.caller_phone || "").toLowerCase().includes(s) ||
          (c.notes        || "").toLowerCase().includes(s)
        );
      });
  }, [phoneCalls, q, branch, status, purpose, dir]);

  // ── Tab data ───────────────────────────────────────────────────────────────
  const today    = useMemo(() => filtered.filter((c) => isToday(c.call_date)), [filtered]);
  const fuAll    = useMemo(() => filtered.filter((c) => c.follow_up_required && c.follow_up_date), [filtered]);
  const fu2All   = useMemo(() => filtered.filter((c) => c.follow_up_required && c.follow_up_date_2), [filtered]);
  const fu3All   = useMemo(() => filtered.filter((c) => c.follow_up_required && c.follow_up_date_3), [filtered]);

  // Overdue counts for badge
  const fuOverdue  = fuAll.filter((c)  => isPast(c.follow_up_date)).length;
  const fu2Overdue = fu2All.filter((c) => isPast(c.follow_up_date_2)).length;
  const fu3Overdue = fu3All.filter((c) => isPast(c.follow_up_date_3)).length;

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     phoneCalls.length,
    completed: phoneCalls.filter((c) => c.status    === "completed").length,
    missed:    phoneCalls.filter((c) => c.status    === "missed").length,
    inbound:   phoneCalls.filter((c) => c.direction === "inbound").length,
    outbound:  phoneCalls.filter((c) => c.direction === "outbound").length,
    followUp:  phoneCalls.filter((c) => c.follow_up_required).length,
    avgDur:    (() => {
      const withDur = phoneCalls.filter((c) => c.call_duration);
      if (!withDur.length) return 0;
      return Math.round(withDur.reduce((s, c) => s + c.call_duration, 0) / withDur.length);
    })(),
  }), [phoneCalls]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openDetail = (call: any) => { setDetailCall(call); setDetailOpen(true); };
  const openEdit   = (call: any) => { setEditingCall(call); setIsFormOpen(true); };
  const confirmDel = (id: string)  => setDeleteTarget(id);

  const toggleOne = (id: string) => {
    const s = new Set(selectedCalls);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedCalls(s);
  };

  const toggleAll = () => {
    if (selectedCalls.size === filtered.length) setSelectedCalls(new Set());
    else setSelectedCalls(new Set(filtered.map((c) => c.id)));
  };

  const bulkDelete = () => {
    if (!selectedCalls.size) return;
    if (!confirm(`Delete ${selectedCalls.size} calls?`)) return;
    selectedCalls.forEach((id) => deleteMutation.mutate(id));
    setSelectedCalls(new Set());
    setBulkMode(false);
  };

  // ── Tab badge helper ───────────────────────────────────────────────────────
  const TabBadge = ({ count, overdue = 0 }: { count: number; overdue?: number }) => (
    <span className={cn(
      "ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold",
      overdue > 0 ? "bg-red-500 text-white" : "bg-muted text-muted-foreground"
    )}>
      {count}
    </span>
  );

  const cardProps = {
    onOpen: openDetail, onDelete: confirmDel, onEdit: openEdit,
    selectedCalls, bulkMode, onSelect: toggleOne,
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentTitle="Phone Calls"
      />

      <div className={cn("transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
        <PageShell
          title="Phone Calls"
          subtitle="Manage call logs, track follow-ups, and monitor agent performance."
          showTopbar={false}
        >
          {/* ── Stats ── */}
          <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
            {[
              { label: "Total",     value: stats.total,     color: "text-foreground",  bg: "bg-primary/10",    icon: <Phone className="h-4 w-4 text-primary" />            },
              { label: "Completed", value: stats.completed, color: "text-green-600",   bg: "bg-green-100",     icon: <CheckCircle className="h-4 w-4 text-green-500" />    },
              { label: "Missed",    value: stats.missed,    color: "text-red-600",     bg: "bg-red-100",       icon: <PhoneMissed className="h-4 w-4 text-red-500" />      },
              { label: "Inbound",   value: stats.inbound,   color: "text-blue-600",    bg: "bg-blue-100",      icon: <PhoneIncoming className="h-4 w-4 text-blue-500" />   },
              { label: "Outbound",  value: stats.outbound,  color: "text-emerald-600", bg: "bg-emerald-100",   icon: <PhoneOutgoing className="h-4 w-4 text-emerald-500" />},
              { label: "Follow-ups",value: stats.followUp,  color: "text-orange-600",  bg: "bg-orange-100",    icon: <AlertCircle className="h-4 w-4 text-orange-500" />   },
              { label: "Avg Dur.",  value: formatDuration(stats.avgDur), color: "text-violet-600", bg: "bg-violet-100", icon: <Clock className="h-4 w-4 text-violet-500" /> },
            ].map((s) => (
              <Card key={s.label} className="glass-card hover-lift transition-all">
                <CardContent className="p-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", s.bg)}>
                    {s.icon}
                  </div>
                  <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Toolbar ── */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q} onChange={(e) => setQ(e.target.value)}
                  placeholder="Name, phone, notes…"
                  className="pl-9 w-[220px]"
                />
              </div>
              <Select value={dir} onValueChange={setDir}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Direction" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="inbound">Inbound</SelectItem>
                  <SelectItem value="outbound">Outbound</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-[130px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="missed">Missed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="voicemail">Voicemail</SelectItem>
                </SelectContent>
              </Select>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="Purpose" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Purposes</SelectItem>
                  <SelectItem value="inquiry">Inquiry</SelectItem>
                  <SelectItem value="appointment">Appointment</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="support">Support</SelectItem>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="follow_up">Follow-up</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Branch" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant={bulkMode ? "default" : "outline"} size="sm"
                onClick={() => { setBulkMode(!bulkMode); setSelectedCalls(new Set()); }}
              >
                <Filter className="mr-2 h-4 w-4" />
                {bulkMode ? "Exit Bulk" : "Bulk"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button onClick={() => { setEditingCall(null); setIsFormOpen(true); }} className="hover-lift">
                <Plus className="mr-2 h-4 w-4" /> New Call
              </Button>
            </div>
          </div>

          {/* ── Bulk bar ── */}
          {bulkMode && (
            <div className="mb-4 flex items-center justify-between rounded-xl bg-primary/10 border border-primary/20 px-4 py-3">
              <div className="flex items-center gap-3">
                <Checkbox checked={selectedCalls.size === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                <span className="text-sm font-medium">{selectedCalls.size} selected</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="destructive" disabled={!selectedCalls.size} onClick={bulkDelete}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Selected
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { setBulkMode(false); setSelectedCalls(new Set()); }}>
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </div>
            </div>
          )}

          {/* ── Loading ── */}
          {isLoading && (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading calls…</span>
            </div>
          )}

          {/* ── Tabs ── */}
          {!isLoading && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 flex-wrap h-auto gap-1 p-1">
                <TabsTrigger value="all" className="text-xs">
                  All Calls <TabBadge count={filtered.length} />
                </TabsTrigger>
                <TabsTrigger value="today" className="text-xs">
                  Today <TabBadge count={today.length} />
                </TabsTrigger>
                <TabsTrigger value="missed" className="text-xs">
                  Missed <TabBadge count={filtered.filter(c => c.status === "missed").length} />
                </TabsTrigger>
                <TabsTrigger value="fu1" className="text-xs">
                  Follow-up 1
                  <TabBadge count={fuAll.length} overdue={fuOverdue} />
                </TabsTrigger>
                <TabsTrigger value="fu2" className="text-xs">
                  Follow-up 2
                  <TabBadge count={fu2All.length} overdue={fu2Overdue} />
                </TabsTrigger>
                <TabsTrigger value="fu3" className="text-xs">
                  Follow-up 3
                  <TabBadge count={fu3All.length} overdue={fu3Overdue} />
                </TabsTrigger>
              </TabsList>

              {/* ALL */}
              <TabsContent value="all">
                <CallGrid calls={filtered} {...cardProps} emptyMessage="No calls match your filters." />
              </TabsContent>

              {/* TODAY */}
              <TabsContent value="today">
                <div className="mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    Calls for {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                  </span>
                </div>
                <CallGrid calls={today} {...cardProps} emptyMessage="No calls recorded today." />
              </TabsContent>

              {/* MISSED */}
              <TabsContent value="missed">
                <div className="mb-3 flex items-center gap-2">
                  <PhoneMissed className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium text-red-600">Missed Calls — require callback</span>
                </div>
                <CallGrid
                  calls={filtered.filter(c => c.status === "missed")}
                  {...cardProps}
                  emptyMessage="No missed calls."
                />
              </TabsContent>

              {/* FOLLOW-UP 1 */}
              <TabsContent value="fu1">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Follow-up 1 — Initial follow-up dates</span>
                  </div>
                  {fuOverdue > 0 && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 border">
                      {fuOverdue} overdue
                    </Badge>
                  )}
                </div>
                {/* Sort: overdue first */}
                <CallGrid
                  calls={[...fuAll].sort((a, b) => {
                    const ao = isPast(a.follow_up_date) ? 0 : 1;
                    const bo = isPast(b.follow_up_date) ? 0 : 1;
                    return ao - bo;
                  })}
                  {...cardProps}
                  emptyMessage="No calls with Follow-up 1 dates."
                />
              </TabsContent>

              {/* FOLLOW-UP 2 */}
              <TabsContent value="fu2">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <span className="text-sm font-medium">Follow-up 2 — +1 day from Follow-up 1</span>
                  </div>
                  {fu2Overdue > 0 && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 border">
                      {fu2Overdue} overdue
                    </Badge>
                  )}
                </div>
                <CallGrid
                  calls={[...fu2All].sort((a, b) => {
                    const ao = isPast(a.follow_up_date_2) ? 0 : 1;
                    const bo = isPast(b.follow_up_date_2) ? 0 : 1;
                    return ao - bo;
                  })}
                  {...cardProps}
                  emptyMessage="No calls with Follow-up 2 dates."
                />
              </TabsContent>

              {/* FOLLOW-UP 3 */}
              <TabsContent value="fu3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-rose-500" />
                    <span className="text-sm font-medium">Follow-up 3 — +3 days from Follow-up 1</span>
                  </div>
                  {fu3Overdue > 0 && (
                    <Badge className="bg-red-100 text-red-700 border-red-200 border">
                      {fu3Overdue} overdue
                    </Badge>
                  )}
                </div>
                <CallGrid
                  calls={[...fu3All].sort((a, b) => {
                    const ao = isPast(a.follow_up_date_3) ? 0 : 1;
                    const bo = isPast(b.follow_up_date_3) ? 0 : 1;
                    return ao - bo;
                  })}
                  {...cardProps}
                  emptyMessage="No calls with Follow-up 3 dates."
                />
              </TabsContent>
            </Tabs>
          )}
        </PageShell>
      </div>

      {/* ── Detail Sheet ── */}
      <CallDetailSheet
        call={detailCall}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onEdit={(c) => { setDetailOpen(false); openEdit(c); }}
        onDelete={(id) => { setDetailOpen(false); confirmDel(id); }}
        onConvertToAppointment={(c) => setConvertApptCall(c)}
        onConvertToTicket={(c) => setConvertTicketCall(c)}
      />

      {/* ── Form Dialog ── */}
      <Dialog open={isFormOpen} onOpenChange={(o) => { setIsFormOpen(o); if (!o) setEditingCall(null); }}>
        <DialogContent className="sm:max-w-[960px] w-[95vw] max-h-[92vh] overflow-y-auto p-0">
          <DialogHeader className="px-6 pt-5 pb-3 border-b border-border sticky top-0 bg-background z-10">
            <DialogTitle>{editingCall ? "Edit Phone Call" : "New Phone Call"}</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-4">
            <PhoneCallForm
              editingCall={editingCall || undefined}
              onSuccess={() => {
                setIsFormOpen(false);
                setEditingCall(null);
                queryClient.invalidateQueries({ queryKey: ["phone-calls"] });
              }}
            />
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Call</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this call record? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Convert to Appointment ── */}
      <Dialog
        open={!!convertApptCall}
        onOpenChange={(o) => !o && setConvertApptCall(null)}
      >
        <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus className="h-5 w-5 text-primary" />
              Convert to Appointment
            </DialogTitle>
            <DialogDescription>
              Creating an appointment from call with{" "}
              <strong>{convertApptCall?.caller_name}</strong>. Fields are pre-filled from the call.
            </DialogDescription>
          </DialogHeader>

          {convertApptCall && (
            <AppointmentForm
              initialData={{
                contactId:   convertApptCall.contact_id || "",
                branchId:    convertApptCall.branch_id  || "",
                date:        new Date().toISOString().split("T")[0],
                time:        "09:00",
                kind:        "Consultation" as any,
                status:      "Pending"      as any,
                advisor:     convertApptCall.agent_name || "",
                bookingInfo: convertApptCall.notes      || "",
                title:       convertApptCall.caller_name,
                duration:    60,
                preBookingTime: 0,
                subServices: [],
                serviceAdvisors: [],
              } as any}
              onSuccess={() => {
                setConvertApptCall(null);
                toast.success("Appointment created from call ✓");
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Convert to Ticket ── */}
      <Dialog
        open={!!convertTicketCall}
        onOpenChange={(o) => !o && setConvertTicketCall(null)}
      >
        <DialogContent className="sm:max-w-[780px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LifeBuoy className="h-5 w-5 text-orange-600" />
              Convert to Support Ticket
            </DialogTitle>
            <DialogDescription>
              Creating a ticket from call with{" "}
              <strong>{convertTicketCall?.caller_name}</strong>. Fields are pre-filled from the call.
            </DialogDescription>
          </DialogHeader>

          {convertTicketCall && (
            <TicketForm
              initialData={{
                title:           convertTicketCall.notes
                  ? convertTicketCall.notes.slice(0, 80)
                  : `Call from ${convertTicketCall.caller_name}`,
                branch_id:       convertTicketCall.branch_id  || "",
                priority:        convertTicketCall.status === "missed" ? "high" : "medium",
                category:        purposeToTicketCategory(convertTicketCall.purpose),
                requester_name:  convertTicketCall.caller_name  || "",
                requester_phone: convertTicketCall.caller_phone || "",
                requester_email: "",
                description: [
                  `Source: Phone Call (${convertTicketCall.direction})`,
                  `Date: ${formatDateTime(convertTicketCall.call_date)}`,
                  `Duration: ${formatDuration(convertTicketCall.call_duration)}`,
                  convertTicketCall.notes ? `\nNotes:\n${convertTicketCall.notes}` : "",
                ].filter(Boolean).join("\n"),
              }}
              onSuccess={() => {
                setConvertTicketCall(null);
                toast.success("Ticket created from call ✓");
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
