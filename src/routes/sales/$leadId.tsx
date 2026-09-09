import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/AppTopbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Building,
  Car,
  DollarSign,
  Calendar,
  Clock,
  Tag,
  TrendingUp,
  Trophy,
  XCircle,
  Edit,
  Trash2,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Activity,
  Target,
  Flame,
  ChevronUp,
  ChevronDown,
  RefreshCw,
  CreditCard,
  ArrowRightLeft,
  ExternalLink,
  Hash,
  Star,
} from "lucide-react";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import {
  SOURCE_LABELS,
  STATUS_LABELS,
  STAGE_LABELS,
  PRIORITY_LABELS,
} from "@/components/forms/LeadForm";
import { LeadForm } from "@/components/forms/LeadForm";

export const Route = createFileRoute("/sales/$leadId")({
  component: LeadDetailPage,
});

// ─── Style helpers ─────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  new:         "bg-sky-100 text-sky-700 border-sky-200",
  contacted:   "bg-blue-100 text-blue-700 border-blue-200",
  qualified:   "bg-violet-100 text-violet-700 border-violet-200",
  proposal:    "bg-amber-100 text-amber-700 border-amber-200",
  negotiation: "bg-orange-100 text-orange-700 border-orange-200",
  won:         "bg-green-100 text-green-700 border-green-200",
  lost:        "bg-red-100 text-red-700 border-red-200",
};

const PRIORITY_STYLE: Record<string, string> = {
  low:    "bg-gray-100 text-gray-600 border-gray-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  high:   "bg-orange-100 text-orange-700 border-orange-200",
  urgent: "bg-red-100 text-red-700 border-red-200",
};

const INTEREST_STARS: Record<string, number> = {
  very_low: 1, low: 2, medium: 3, high: 4, very_high: 5,
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call:    <Phone className="h-3.5 w-3.5 text-blue-500" />,
  email:   <Mail className="h-3.5 w-3.5 text-violet-500" />,
  meeting: <Calendar className="h-3.5 w-3.5 text-green-500" />,
  note:    <MessageSquare className="h-3.5 w-3.5 text-amber-500" />,
  demo:    <Car className="h-3.5 w-3.5 text-primary" />,
  other:   <Activity className="h-3.5 w-3.5 text-muted-foreground" />,
};

// ─── Pipeline stages indicator ────────────────────────────────────────────────
const PIPELINE_STAGES = [
  "initial_contact",
  "needs_analysis",
  "test_drive_scheduled",
  "proposal_sent",
  "negotiation",
];

function PipelineProgress({ stage }: { stage: string }) {
  const isClosed = stage === "closed_won" || stage === "closed_lost";
  const stageIndex = PIPELINE_STAGES.indexOf(stage);
  const progress = isClosed ? 100 : stageIndex === -1 ? 0 : ((stageIndex + 1) / PIPELINE_STAGES.length) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Pipeline Progress</span>
        <span className="font-medium">{STAGE_LABELS[stage] || stage}</span>
      </div>
      <Progress
        value={progress}
        className={cn(
          "h-2",
          stage === "closed_won" && "[&>div]:bg-green-500",
          stage === "closed_lost" && "[&>div]:bg-red-500"
        )}
      />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {PIPELINE_STAGES.map((s, i) => (
          <span
            key={s}
            className={cn(
              "truncate",
              i <= stageIndex && !isClosed && "text-primary font-medium"
            )}
            style={{ maxWidth: `${100 / PIPELINE_STAGES.length}%` }}
          >
            {STAGE_LABELS[s]?.split(" ")[0]}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────
function LeadDetailPage() {
  const { leadId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [showEditSheet, setShowEditSheet] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showWonDialog, setShowWonDialog] = useState(false);
  const [showLostDialog, setShowLostDialog] = useState(false);
  const [lostReason, setLostReason] = useState("");
  const [lostNotes, setLostNotes] = useState("");
  const [activityType, setActivityType] = useState("note");
  const [activityNote, setActivityNote] = useState("");
  const [activityFollowUp, setActivityFollowUp] = useState("");
  const [logginActivity, setLoggingActivity] = useState(false);

  // ── Query ──────────────────────────────────────────────────────────────────
  const {
    data: lead,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["lead", leadId],
    queryFn: () => apiClient.getLead(leadId),
    enabled: !!leadId,
  });

  // ── Mutations ──────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: () => apiClient.deleteLead(leadId),
    onSuccess: () => {
      toast.success("Lead deleted");
      navigate({ to: "/sales" });
    },
    onError: () => toast.error("Failed to delete lead"),
  });

  const statusMutation = useMutation({
    mutationFn: (payload: { status: string; lost_reason?: string; lost_notes?: string }) =>
      apiClient.updateLeadStatus(leadId, payload.status, {
        lost_reason: payload.lost_reason,
        lost_notes: payload.lost_notes,
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["lead-stats"] });
      const label = STATUS_LABELS[vars.status] || vars.status;
      toast.success(`Lead marked as ${label}`);
      setShowWonDialog(false);
      setShowLostDialog(false);
    },
    onError: () => toast.error("Failed to update status"),
  });

  const activityMutation = useMutation({
    mutationFn: (data: { type: string; note: string; next_follow_up?: string }) =>
      apiClient.addLeadActivity(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
      toast.success("Activity logged");
      setActivityNote("");
      setActivityFollowUp("");
      setLoggingActivity(false);
    },
    onError: () => toast.error("Failed to log activity"),
  });

  const handleLogActivity = () => {
    if (!activityNote.trim()) {
      toast.error("Please enter a note");
      return;
    }
    activityMutation.mutate({
      type: activityType,
      note: activityNote,
      next_follow_up: activityFollowUp || undefined,
    });
  };

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatDate = (d?: string) =>
    d ? new Date(d).toLocaleDateString("en-GB") : "—";

  const formatDateTime = (d?: string) =>
    d ? new Date(d).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }) : "—";

  const isOverdue =
    lead?.next_follow_up &&
    new Date(lead.next_follow_up) < new Date() &&
    !["won", "lost"].includes(lead?.status);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageShell title="Lead Details">
        <div className="flex items-center justify-center py-32 gap-3 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading lead…</span>
        </div>
      </PageShell>
    );
  }

  if (error || !lead) {
    return (
      <PageShell title="Lead Not Found">
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <AlertCircle className="h-12 w-12 text-destructive" />
          <p className="text-muted-foreground">Lead not found or failed to load.</p>
          <Button asChild variant="outline">
            <Link to="/sales"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Leads</Link>
          </Button>
        </div>
      </PageShell>
    );
  }

  const activities: any[] = lead.activities || [];

  return (
    <PageShell
      title={lead.title}
      subtitle={`${lead.lead_number ? lead.lead_number + " · " : ""}${lead.customer_name}`}
    >
      {/* ── Topbar ── */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link to="/sales">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Leads
          </Link>
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status badge */}
          <Badge className={cn("border text-sm px-3 py-1", STATUS_STYLE[lead.status])}>
            {STATUS_LABELS[lead.status]}
          </Badge>

          {/* Priority badge */}
          <Badge className={cn("border text-sm px-3 py-1", PRIORITY_STYLE[lead.priority])}>
            {PRIORITY_LABELS[lead.priority]}
          </Badge>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="hover-lift"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Quick actions */}
          {!["won", "lost"].includes(lead.status) && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="border-green-300 text-green-700 hover:bg-green-50"
                onClick={() => setShowWonDialog(true)}
              >
                <Trophy className="mr-2 h-4 w-4" /> Won
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-50"
                onClick={() => setShowLostDialog(true)}
              >
                <XCircle className="mr-2 h-4 w-4" /> Lost
              </Button>
            </>
          )}

          <Button size="sm" onClick={() => setShowEditSheet(true)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </Button>

          <Button
            size="sm"
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── Left: details + tabs ── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Pipeline progress */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <PipelineProgress stage={lead.stage} />
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <Tabs defaultValue="overview">
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="vehicle">Vehicle Interest</TabsTrigger>
                  <TabsTrigger value="activity">
                    Activity
                    {activities.length > 0 && (
                      <span className="ml-1.5 text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                        {activities.length}
                      </span>
                    )}
                  </TabsTrigger>
                  {lead.notes && <TabsTrigger value="notes">Notes</TabsTrigger>}
                </TabsList>

                {/* ── Overview ── */}
                <TabsContent value="overview" className="space-y-4">
                  {/* KPIs row */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: "Expected Value",
                        value: lead.expected_value
                          ? `EGP ${Number(lead.expected_value).toLocaleString()}`
                          : "—",
                        icon: <DollarSign className="h-4 w-4 text-amber-500" />,
                        sub: lead.actual_value
                          ? `Actual: EGP ${Number(lead.actual_value).toLocaleString()}`
                          : null,
                      },
                      {
                        label: "Win Probability",
                        value: `${lead.probability ?? 0}%`,
                        icon: <Target className="h-4 w-4 text-violet-500" />,
                        sub: null,
                      },
                      {
                        label: "Expected Close",
                        value: formatDate(lead.expected_close_date),
                        icon: <Calendar className="h-4 w-4 text-blue-500" />,
                        sub: lead.actual_close_date
                          ? `Closed: ${formatDate(lead.actual_close_date)}`
                          : null,
                      },
                    ].map((k) => (
                      <div
                        key={k.label}
                        className="rounded-lg bg-muted/40 border border-border/50 p-3 space-y-1"
                      >
                        <div className="flex items-center gap-2">
                          {k.icon}
                          <span className="text-xs text-muted-foreground">{k.label}</span>
                        </div>
                        <p className="font-bold text-base">{k.value}</p>
                        {k.sub && <p className="text-[11px] text-muted-foreground">{k.sub}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Win probability bar */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Probability</span>
                      <span className="font-medium">{lead.probability ?? 0}%</span>
                    </div>
                    <Progress value={lead.probability ?? 0} className="h-2" />
                  </div>

                  <Separator />

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {[
                      { label: "Source",        value: SOURCE_LABELS[lead.source] || lead.source,     icon: <Tag className="h-3.5 w-3.5" /> },
                      { label: "Stage",         value: STAGE_LABELS[lead.stage] || lead.stage,         icon: <Activity className="h-3.5 w-3.5" /> },
                      { label: "Interest",      value: lead.interest_level?.replace(/_/g, " ") || "—", icon: <Star className="h-3.5 w-3.5" /> },
                      { label: "Assigned To",   value: lead.assignedUser ? `${lead.assignedUser.first_name} ${lead.assignedUser.last_name}` : "Unassigned", icon: <User className="h-3.5 w-3.5" /> },
                      { label: "Last Contact",  value: formatDate(lead.last_contact_date),             icon: <Clock className="h-3.5 w-3.5" /> },
                      { label: "Next Follow-up",value: formatDate(lead.next_follow_up),                icon: <Calendar className="h-3.5 w-3.5 " + (isOverdue ? "text-red-500" : "") /> },
                      { label: "Created",       value: formatDateTime(lead.created_at),               icon: <Hash className="h-3.5 w-3.5" /> },
                      { label: "Branch",        value: lead.branch?.name || "—",                      icon: <Building className="h-3.5 w-3.5" /> },
                    ].map((row) => (
                      <div key={row.label} className="flex items-start gap-2">
                        <span className="text-muted-foreground mt-0.5 shrink-0">{row.icon}</span>
                        <div>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{row.label}</p>
                          <p className={cn("font-medium", row.label === "Next Follow-up" && isOverdue && "text-red-500")}>
                            {row.value}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Lost info */}
                  {lead.status === "lost" && lead.lost_reason && (
                    <div className="rounded-lg bg-red-50 border border-red-200 p-3 space-y-1">
                      <p className="text-sm font-semibold text-red-700 flex items-center gap-2">
                        <XCircle className="h-4 w-4" /> Lost Reason
                      </p>
                      <p className="text-sm text-red-600">{lead.lost_reason.replace(/_/g, " ")}</p>
                      {lead.lost_notes && (
                        <p className="text-xs text-red-500">{lead.lost_notes}</p>
                      )}
                    </div>
                  )}

                  {/* Won info */}
                  {lead.status === "won" && (
                    <div className="rounded-lg bg-green-50 border border-green-200 p-3 space-y-1">
                      <p className="text-sm font-semibold text-green-700 flex items-center gap-2">
                        <Trophy className="h-4 w-4" /> Deal Won
                      </p>
                      {lead.actual_close_date && (
                        <p className="text-xs text-green-600">
                          Closed on {formatDate(lead.actual_close_date)}
                        </p>
                      )}
                      {lead.actual_value && (
                        <p className="text-xs text-green-600">
                          Actual value: EGP {Number(lead.actual_value).toLocaleString()}
                        </p>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ── Vehicle Interest ── */}
                <TabsContent value="vehicle" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Make",        value: lead.vehicle_make || "—"  },
                      { label: "Model",       value: lead.vehicle_model || "—" },
                      { label: "Year",        value: lead.vehicle_year || "—"  },
                      { label: "Budget Min",  value: lead.budget_min ? `EGP ${Number(lead.budget_min).toLocaleString()}` : "—" },
                      { label: "Budget Max",  value: lead.budget_max ? `EGP ${Number(lead.budget_max).toLocaleString()}` : "—" },
                      { label: "Financing",   value: lead.financing_required ? "Required" : "Not required" },
                      { label: "Trade-in",    value: lead.trade_in ? "Yes" : "No" },
                      { label: "Trade-in Car",value: lead.trade_in_vehicle || "—" },
                    ].map((row) => (
                      <div key={row.label}>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide">{row.label}</p>
                        <p className="font-medium text-sm mt-0.5">{row.value}</p>
                      </div>
                    ))}
                  </div>

                  {lead.vehicle && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">Linked Inventory Vehicle</p>
                        <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Car className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold text-sm">
                              {lead.vehicle.year} {lead.vehicle.make} {lead.vehicle.model}
                            </p>
                            <p className="text-xs text-muted-foreground">{lead.vehicle.license_plate}</p>
                          </div>
                          {lead.vehicle.price && (
                            <div className="ml-auto text-right">
                              <p className="text-xs text-muted-foreground">Price</p>
                              <p className="font-semibold">EGP {Number(lead.vehicle.price).toLocaleString()}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* ── Activity Log ── */}
                <TabsContent value="activity" className="space-y-4">
                  {/* Log new activity */}
                  {!logginActivity ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setLoggingActivity(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" /> Log Activity
                    </Button>
                  ) : (
                    <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 space-y-3">
                      <p className="text-sm font-semibold">Log New Activity</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                          <Select value={activityType} onValueChange={setActivityType}>
                            <SelectTrigger className="bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="call">📞 Call</SelectItem>
                              <SelectItem value="email">✉️ Email</SelectItem>
                              <SelectItem value="meeting">🤝 Meeting</SelectItem>
                              <SelectItem value="note">📝 Note</SelectItem>
                              <SelectItem value="demo">🚗 Test Drive / Demo</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground mb-1 block">Next Follow-up (optional)</label>
                          <Input
                            type="date"
                            value={activityFollowUp}
                            onChange={(e) => setActivityFollowUp(e.target.value)}
                            className="bg-white"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground mb-1 block">Note *</label>
                        <Textarea
                          rows={3}
                          value={activityNote}
                          onChange={(e) => setActivityNote(e.target.value)}
                          placeholder="What happened? What was discussed?"
                          className="bg-white"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleLogActivity}
                          disabled={activityMutation.isPending}
                        >
                          {activityMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Save Activity
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setLoggingActivity(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Activities list */}
                  {activities.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No activities logged yet.</p>
                      <p className="text-xs">Log a call, email, or meeting to track progress.</p>
                    </div>
                  ) : (
                    <div className="relative pl-5 space-y-0">
                      {/* Timeline line */}
                      <div className="absolute left-1.5 top-3 bottom-3 w-px bg-border" />

                      {activities.map((act: any, i: number) => (
                        <div key={act.id || i} className="relative pb-4">
                          {/* Dot */}
                          <div className="absolute -left-3.5 top-1 w-6 h-6 rounded-full bg-background border-2 border-border flex items-center justify-center">
                            {ACTIVITY_ICONS[act.type] || <Activity className="h-3 w-3" />}
                          </div>

                          <div className="ml-4 rounded-lg border border-border/60 bg-white p-3 space-y-1 shadow-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold capitalize">
                                {act.type?.replace("_", " ")}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {act.created_at
                                  ? new Date(act.created_at).toLocaleString("en-GB", {
                                      dateStyle: "medium",
                                      timeStyle: "short",
                                    })
                                  : ""}
                              </span>
                            </div>
                            <p className="text-sm text-foreground">{act.note}</p>
                            {act.created_by_name && (
                              <p className="text-[10px] text-muted-foreground">
                                by {act.created_by_name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* ── Notes ── */}
                {lead.notes && (
                  <TabsContent value="notes">
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{lead.notes}</p>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-4">
          {/* Customer card */}
          <Card className="bg-white border-gray-200">
            <CardHeader className="pb-3 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4" /> Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-primary/10 border-2 border-primary/20">
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(lead.customer_name)}&background=random&color=fff&size=80`}
                    alt={lead.customer_name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="font-semibold text-sm">{lead.customer_name}</p>
                  {lead.contact && (
                    <p className="text-[10px] text-muted-foreground">Linked contact</p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 pt-1 border-t border-border/50">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3 w-3 shrink-0" /> {lead.customer_phone}
                </div>
                {lead.customer_email && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3 shrink-0" />
                    <span className="truncate">{lead.customer_email}</span>
                  </div>
                )}
              </div>

              {lead.contact && (
                <Button variant="outline" size="sm" className="w-full mt-1" asChild>
                  <Link to={`/contacts/${lead.contact.id}`}>
                    <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Contact
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Budget / Finance card */}
          {(lead.budget_min || lead.budget_max || lead.financing_required || lead.trade_in) && (
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <CreditCard className="h-4 w-4" /> Budget & Finance
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 space-y-2 text-sm">
                {(lead.budget_min || lead.budget_max) && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Budget Range</span>
                    <span className="font-medium">
                      {lead.budget_min
                        ? `EGP ${Number(lead.budget_min).toLocaleString()}`
                        : "—"}{" "}
                      →{" "}
                      {lead.budget_max
                        ? `EGP ${Number(lead.budget_max).toLocaleString()}`
                        : "—"}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Financing</span>
                  <Badge variant={lead.financing_required ? "default" : "outline"} className="text-[10px]">
                    {lead.financing_required ? "Required" : "Cash"}
                  </Badge>
                </div>
                {lead.trade_in && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Trade-in</span>
                    <div className="text-right">
                      <Badge variant="outline" className="text-[10px]">Yes</Badge>
                      {lead.trade_in_vehicle && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{lead.trade_in_vehicle}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Follow-up alert */}
          {isOverdue && (
            <Card className="border-red-300 bg-red-50">
              <CardContent className="p-4 flex items-start gap-3">
                <Clock className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">Follow-up Overdue</p>
                  <p className="text-xs text-red-600">
                    Was due {formatDate(lead.next_follow_up)}. Log an activity to update.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick status change */}
          {!["won", "lost"].includes(lead.status) && (
            <Card className="bg-white border-gray-200">
              <CardHeader className="pb-3 pt-4 px-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ArrowRightLeft className="h-4 w-4" /> Quick Status
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4 flex flex-col gap-2">
                {(["new","contacted","qualified","proposal","negotiation"] as const)
                  .filter((s) => s !== lead.status)
                  .map((s) => (
                    <Button
                      key={s}
                      variant="outline"
                      size="sm"
                      className="justify-start text-xs"
                      disabled={statusMutation.isPending}
                      onClick={() => statusMutation.mutate({ status: s })}
                    >
                      Move to {STATUS_LABELS[s]}
                    </Button>
                  ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* ── Edit Sheet ── */}
      <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
        <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-4">
            <SheetTitle>Edit Lead</SheetTitle>
            <SheetDescription>Update the lead information below.</SheetDescription>
          </SheetHeader>
          <LeadForm
            initialData={lead}
            onSuccess={() => {
              setShowEditSheet(false);
              queryClient.invalidateQueries({ queryKey: ["lead", leadId] });
              queryClient.invalidateQueries({ queryKey: ["leads"] });
            }}
          />
        </SheetContent>
      </Sheet>

      {/* ── Won Dialog ── */}
      <Dialog open={showWonDialog} onOpenChange={setShowWonDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-green-500" /> Mark as Won
            </DialogTitle>
            <DialogDescription>
              Congratulations! Mark this lead as won and close the deal.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              Expected value:{" "}
              <strong>
                EGP {Number(lead.expected_value || 0).toLocaleString()}
              </strong>
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWonDialog(false)}>
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              disabled={statusMutation.isPending}
              onClick={() => statusMutation.mutate({ status: "won" })}
            >
              {statusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Trophy className="mr-2 h-4 w-4" /> Confirm Won
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Lost Dialog ── */}
      <Dialog open={showLostDialog} onOpenChange={setShowLostDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" /> Mark as Lost
            </DialogTitle>
            <DialogDescription>
              Why was this lead lost? This helps improve future sales.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Reason</label>
              <Select value={lostReason} onValueChange={setLostReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="price_too_high">Price Too High</SelectItem>
                  <SelectItem value="chose_competitor">Chose Competitor</SelectItem>
                  <SelectItem value="not_interested">Not Interested</SelectItem>
                  <SelectItem value="no_budget">No Budget</SelectItem>
                  <SelectItem value="timing">Timing</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Additional Notes</label>
              <Textarea
                rows={3}
                value={lostNotes}
                onChange={(e) => setLostNotes(e.target.value)}
                placeholder="Any additional context…"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLostDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={statusMutation.isPending}
              onClick={() =>
                statusMutation.mutate({
                  status: "lost",
                  lost_reason: lostReason || undefined,
                  lost_notes: lostNotes || undefined,
                })
              }
            >
              {statusMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm Lost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Dialog ── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Lead</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>{lead.title}</strong>? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageShell>
  );
}
