import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/AppTopbar";
import { AppSidebar } from "@/components/AppSidebar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Plus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Calendar,
  X,
  FilterX,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";

export const Route = createFileRoute("/appointments/")({
  head: () => ({
    meta: [
      { title: "Appointments — SIG" },
      {
        name: "description",
        content:
          "Schedule and track test drives, services, repairs and deliveries across every branch and vehicle model.",
      },
      { property: "og:title", content: "Appointments — SIG" },
      {
        property: "og:description",
        content: "Branch-wide appointment board for test drives, services, repairs and deliveries.",
      },
    ],
  }),
  component: AppointmentsPage,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus =
  | "scheduled" | "confirmed" | "in_progress"
  | "completed" | "cancelled" | "no_show";
type AppointmentType =
  | "test_drive" | "service" | "consultation"
  | "delivery"  | "pickup"  | "other";

interface ApiAppointment {
  id: string;
  branch_id: string;
  vehicle_id?: string;
  contact_id?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone: string;
  appointment_date: string;
  appointment_time: string;
  duration?: number;
  type: AppointmentType;
  status: AppointmentStatus;
  notes?: string;
  advisor?: string;
  branch?: { id: string; name: string; code: string };
  vehicle?: { id: string; make: string; model: string; year: number; license_plate: string };
  contact?: { id: string; first_name: string; last_name: string; email?: string; phone?: string };
  created_at?: string;
}

// ─── Style maps ───────────────────────────────────────────────────────────────

const statusVariant: Record<AppointmentStatus, string> = {
  scheduled:   "bg-blue-100 text-blue-700 border-blue-200",
  confirmed:   "bg-primary/10 text-primary border-primary/20",
  in_progress: "bg-yellow-100 text-yellow-700 border-yellow-200",
  completed:   "bg-green-100 text-green-700 border-green-200",
  cancelled:   "bg-destructive/10 text-destructive border-destructive/20",
  no_show:     "bg-gray-100 text-gray-700 border-gray-200",
};

const statusLabel: Record<AppointmentStatus, string> = {
  scheduled:   "Scheduled",
  confirmed:   "Confirmed",
  in_progress: "In Progress",
  completed:   "Completed",
  cancelled:   "Cancelled",
  no_show:     "No Show",
};

const typeLabel: Record<AppointmentType, string> = {
  test_drive:   "Test Drive",
  service:      "Service",
  consultation: "Consultation",
  delivery:     "Delivery",
  pickup:       "Pickup",
  other:        "Other",
};

// ─── Column filter state ──────────────────────────────────────────────────────

interface ColFilters {
  date: string; time: string; customer: string;
  phone: string; vehicle: string; type: string;
  branch: string; advisor: string; status: string;
}

const emptyFilters: ColFilters = {
  date: "", time: "", customer: "", phone: "",
  vehicle: "", type: "", branch: "", advisor: "", status: "",
};

// ─── Inline filter components ─────────────────────────────────────────────────

function ColInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div className="relative mt-1">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-7 pl-6 pr-6 text-xs rounded border-border/60 bg-background"
        onClick={(e) => e.stopPropagation()}
      />
      {value && (
        <button
          className="absolute right-1.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          onClick={(e) => { e.stopPropagation(); onChange(""); }}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function ColSelect({ value, onChange, options, placeholder }: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; placeholder: string;
}) {
  return (
    <div className="mt-1" onClick={(e) => e.stopPropagation()}>
      <Select
        value={value || "__all__"}
        onValueChange={(v) => onChange(v === "__all__" ? "" : v)}
      >
        <SelectTrigger className="h-7 text-xs rounded border-border/60 bg-background px-2">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">{placeholder}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function AppointmentsPage() {
  const queryClient = useQueryClient();

  // API-level filters (sent to server)
  const [q, setQ] = useState("");
  const [apiStatus, setApiStatus] = useState("all");
  const [apiKind, setApiKind] = useState("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Per-column client-side filters
  const [col, setCol] = useState<ColFilters>(emptyFilters);
  const setColField = (field: keyof ColFilters) => (v: string) =>
    setCol((prev) => ({ ...prev, [field]: v }));
  const anyColActive = Object.values(col).some(Boolean);
  const activeColCount = Object.values(col).filter(Boolean).length;

  // Reschedule dialog
  const [rescheduleDialog, setRescheduleDialog] = useState<{
    open: boolean; appointment: ApiAppointment | null;
  }>({ open: false, appointment: null });
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: appointmentsData, isLoading, error, refetch } = useQuery({
    queryKey: ["appointments", { status: apiStatus, kind: apiKind, search: q }],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (apiStatus !== "all") params.status = apiStatus;
      if (apiKind  !== "all") params.type   = apiKind;
      if (q.trim())           params.search = q.trim();
      return apiClient.getAppointments(params);
    },
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiClient.getBranches(),
  });

  const appointments: ApiAppointment[] = appointmentsData?.data || [];
  const branches = branchesData?.data || [];

  // ── Reschedule mutation ────────────────────────────────────────────────────
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, appointment_date, appointment_time }: {
      id: string; appointment_date: string; appointment_time: string;
    }) => apiClient.updateAppointment(id, { appointment_date, appointment_time }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast.success("Appointment rescheduled successfully");
      setRescheduleDialog({ open: false, appointment: null });
      setNewDate(""); setNewTime("");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to reschedule"),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function getCustomerName(a: ApiAppointment) {
    return a.contact
      ? `${a.contact.first_name} ${a.contact.last_name}`
      : a.customer_name;
  }
  function getVehicleName(a: ApiAppointment) {
    return a.vehicle
      ? `${a.vehicle.make} ${a.vehicle.model} (${a.vehicle.year})`
      : "—";
  }
  function formatDate(d: string) {
    try { return new Date(d).toLocaleDateString("en-GB"); } catch { return d; }
  }

  const handleReschedule = (a: ApiAppointment) => {
    setRescheduleDialog({ open: true, appointment: a });
    setNewDate(a.appointment_date.split("T")[0]);
    setNewTime(a.appointment_time);
  };

  const handleConfirmReschedule = () => {
    if (!rescheduleDialog.appointment || !newDate || !newTime) {
      toast.error("Please select both date and time"); return;
    }
    rescheduleMutation.mutate({
      id: rescheduleDialog.appointment.id,
      appointment_date: newDate,
      appointment_time: newTime,
    });
  };

  // ── Client-side column filtering ──────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!anyColActive) return appointments;
    const lc = (s?: string) => (s || "").toLowerCase();
    return appointments.filter((a) => {
      if (col.date     && !formatDate(a.appointment_date).includes(col.date))    return false;
      if (col.time     && !a.appointment_time.includes(col.time))                return false;
      if (col.customer && !lc(getCustomerName(a)).includes(lc(col.customer)))    return false;
      if (col.phone    && !lc(a.customer_phone || "").includes(lc(col.phone)))   return false;
      if (col.vehicle  && !lc(getVehicleName(a)).includes(lc(col.vehicle)))      return false;
      if (col.type     && a.type !== col.type)                                   return false;
      if (col.branch   && !lc(a.branch?.name).includes(lc(col.branch)))          return false;
      if (col.advisor  && !lc(a.advisor || "").includes(lc(col.advisor)))        return false;
      if (col.status   && a.status !== col.status)                               return false;
      return true;
    });
  }, [appointments, col, anyColActive]);

  // Unique values for dynamic dropdowns
  const uniqueBranches = useMemo(() =>
    [...new Set(appointments.map((a) => a.branch?.name).filter(Boolean))] as string[],
    [appointments]);
  const uniqueAdvisors = useMemo(() =>
    [...new Set(appointments.map((a) => a.advisor).filter(Boolean))] as string[],
    [appointments]);

  // Stats
  const stats = useMemo(() => [
    { label: "Total",            value: appointments.length },
    { label: "Confirmed",        value: appointments.filter((a) => a.status === "confirmed").length },
    { label: "Pending",          value: appointments.filter((a) => a.status === "scheduled").length },
    { label: "Branches covered", value: branches.length },
  ], [appointments, branches]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentTitle="Appointments"
      />
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
        <PageShell
          title="Appointments"
          subtitle="Test drives, periodic services, repairs, inspections and deliveries across all branches."
          showTopbar={false}
        >
          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {stats.map((s) => (
              <Card key={s.label} className="glass-card hover-lift transition-all">
                <CardContent className="p-4">
                  <p className="text-xs tracking-wide text-muted-foreground uppercase">{s.label}</p>
                  <p className="mt-1 text-2xl font-bold text-foreground stat-counter">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-3">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search customer or advisor..."
                  className="pl-9 w-[250px]"
                />
              </div>
              <Select value={apiStatus} onValueChange={setApiStatus}>
                <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
              <Select value={apiKind} onValueChange={setApiKind}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Service Kind" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Services</SelectItem>
                  <SelectItem value="test_drive">Test Drive</SelectItem>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="pickup">Pickup</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {anyColActive && (
                <Button
                  variant="outline" size="sm"
                  onClick={() => setCol(emptyFilters)}
                  className="gap-1.5 text-primary border-primary/40 hover:bg-primary/5"
                >
                  <FilterX className="h-3.5 w-3.5" />
                  Clear column filters ({activeColCount})
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading} className="hover-lift">
                <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              </Button>
              <Button asChild className="hover-lift button-press">
                <Link to="/appointments/create">
                  <Plus className="mr-2 h-4 w-4" /> New Appointment
                </Link>
              </Button>
            </div>
          </div>

          {/* Loading */}
          {isLoading && (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading appointments…</span>
            </div>
          )}

          {/* Error */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-muted-foreground">
                {(error as any)?.response?.data?.message ||
                  (error as any)?.message || "Failed to load appointments"}
              </p>
              <Button onClick={() => refetch()} variant="outline" className="hover-lift">
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          )}

          {/* Table */}
          {!isLoading && !error && (
            <>
              {anyColActive && (
                <p className="mb-2 text-xs text-muted-foreground">
                  Showing{" "}
                  <span className="font-semibold text-foreground">{filtered.length}</span>{" "}
                  of {appointments.length} appointments
                </p>
              )}
              <Card className="glass-card shadow-lg border-border/40">
                <CardContent className="p-0 overflow-hidden rounded-xl">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        {/* Row 1 — Labels */}
                        <TableRow className="border-b-0">
                          <TableHead className="pt-3 pb-0 text-xs font-semibold uppercase tracking-wide">Date</TableHead>
                          <TableHead className="pt-3 pb-0 text-xs font-semibold uppercase tracking-wide">Time</TableHead>
                          <TableHead className="pt-3 pb-0 text-xs font-semibold uppercase tracking-wide">Customer</TableHead>
                          <TableHead className="pt-3 pb-0 text-xs font-semibold uppercase tracking-wide">Phone</TableHead>
                          <TableHead className="pt-3 pb-0 text-xs font-semibold uppercase tracking-wide">Vehicle</TableHead>
                          <TableHead className="pt-3 pb-0 text-xs font-semibold uppercase tracking-wide">Type</TableHead>
                          <TableHead className="pt-3 pb-0 text-xs font-semibold uppercase tracking-wide">Branch</TableHead>
                          <TableHead className="pt-3 pb-0 text-xs font-semibold uppercase tracking-wide">Advisor</TableHead>
                          <TableHead className="pt-3 pb-0 text-xs font-semibold uppercase tracking-wide">Status</TableHead>
                          <TableHead className="pt-3 pb-0 text-xs font-semibold uppercase tracking-wide">Actions</TableHead>
                        </TableRow>

                        {/* Row 2 — Per-column filter inputs */}
                        <TableRow className="bg-muted/30 hover:bg-muted/30 border-b border-border/40">
                          <TableHead className="py-1.5 px-3">
                            <ColInput value={col.date} onChange={setColField("date")} placeholder="dd/mm/yyyy" />
                          </TableHead>
                          <TableHead className="py-1.5 px-3">
                            <ColInput value={col.time} onChange={setColField("time")} placeholder="HH:MM" />
                          </TableHead>
                          <TableHead className="py-1.5 px-3">
                            <ColInput value={col.customer} onChange={setColField("customer")} placeholder="Filter…" />
                          </TableHead>
                          <TableHead className="py-1.5 px-3">
                            <ColInput value={col.phone} onChange={setColField("phone")} placeholder="+20…" />
                          </TableHead>
                          <TableHead className="py-1.5 px-3">
                            <ColInput value={col.vehicle} onChange={setColField("vehicle")} placeholder="Filter…" />
                          </TableHead>
                          <TableHead className="py-1.5 px-3">
                            <ColSelect
                              value={col.type} onChange={setColField("type")} placeholder="All"
                              options={[
                                { value: "test_drive",   label: "Test Drive"   },
                                { value: "service",      label: "Service"      },
                                { value: "consultation", label: "Consultation" },
                                { value: "delivery",     label: "Delivery"     },
                                { value: "pickup",       label: "Pickup"       },
                                { value: "other",        label: "Other"        },
                              ]}
                            />
                          </TableHead>
                          <TableHead className="py-1.5 px-3">
                            {uniqueBranches.length <= 10 ? (
                              <ColSelect
                                value={col.branch} onChange={setColField("branch")} placeholder="All"
                                options={uniqueBranches.map((b) => ({ value: b, label: b }))}
                              />
                            ) : (
                              <ColInput value={col.branch} onChange={setColField("branch")} placeholder="Filter…" />
                            )}
                          </TableHead>
                          <TableHead className="py-1.5 px-3">
                            {uniqueAdvisors.length <= 15 ? (
                              <ColSelect
                                value={col.advisor} onChange={setColField("advisor")} placeholder="All"
                                options={uniqueAdvisors.map((a) => ({ value: a, label: a }))}
                              />
                            ) : (
                              <ColInput value={col.advisor} onChange={setColField("advisor")} placeholder="Filter…" />
                            )}
                          </TableHead>
                          <TableHead className="py-1.5 px-3">
                            <ColSelect
                              value={col.status} onChange={setColField("status")} placeholder="All"
                              options={[
                                { value: "scheduled",   label: "Scheduled"   },
                                { value: "confirmed",   label: "Confirmed"   },
                                { value: "in_progress", label: "In Progress" },
                                { value: "completed",   label: "Completed"   },
                                { value: "cancelled",   label: "Cancelled"   },
                                { value: "no_show",     label: "No Show"     },
                              ]}
                            />
                          </TableHead>
                          <TableHead className="py-1.5 px-3">
                            {anyColActive && (
                              <Button
                                variant="ghost" size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                title="Clear all column filters"
                                onClick={() => setCol(emptyFilters)}
                              >
                                <FilterX className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {filtered.map((a) => (
                          <TableRow
                            key={a.id}
                            className="cursor-pointer hover:bg-muted/50 transition-colors group"
                            onClick={() => (window.location.href = `/appointments/${a.id}`)}
                          >
                            <TableCell className="font-medium group-hover:text-primary transition-colors">
                              {formatDate(a.appointment_date)}
                            </TableCell>
                            <TableCell>{a.appointment_time}</TableCell>
                            <TableCell>{getCustomerName(a)}</TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {a.customer_phone || a.contact?.phone || "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-background/50">
                                {getVehicleName(a)}
                              </Badge>
                            </TableCell>
                            <TableCell>{typeLabel[a.type]}</TableCell>
                            <TableCell className="text-muted-foreground">{a.branch?.name || "—"}</TableCell>
                            <TableCell className="text-muted-foreground">{a.advisor || "—"}</TableCell>
                            <TableCell>
                              <Badge
                                className={cn(statusVariant[a.status], "border-transparent")}
                                variant="secondary"
                              >
                                {statusLabel[a.status]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="outline" size="sm"
                                onClick={(e) => { e.stopPropagation(); handleReschedule(a); }}
                                className="hover-lift"
                              >
                                <Calendar className="w-3 h-3 mr-1" />
                                Reschedule
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                        {filtered.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={10} className="py-12 text-center text-muted-foreground">
                              {anyColActive
                                ? "No appointments match the column filters."
                                : "No appointments match these filters."}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Reschedule Dialog */}
          <Dialog
            open={rescheduleDialog.open}
            onOpenChange={(open) =>
              setRescheduleDialog({ open, appointment: rescheduleDialog.appointment })
            }
          >
            <DialogContent className="sm:max-w-[400px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  Reschedule Appointment
                </DialogTitle>
                <DialogDescription>
                  Change the date and time for{" "}
                  <strong>
                    {rescheduleDialog.appointment
                      ? getCustomerName(rescheduleDialog.appointment)
                      : ""}
                  </strong>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Date</label>
                  <Input
                    type="date" value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">New Time</label>
                  <Select value={newTime} onValueChange={setNewTime}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 * 4 }, (_, i) => {
                        const h = Math.floor(i / 4);
                        const m = (i % 4) * 15;
                        const t = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
                        return <SelectItem key={t} value={t}>{t}</SelectItem>;
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setRescheduleDialog({ open: false, appointment: null })}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmReschedule}
                    disabled={rescheduleMutation.isPending}
                    className="flex-1"
                  >
                    {rescheduleMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Confirm
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </PageShell>
      </div>
    </div>
  );
}
