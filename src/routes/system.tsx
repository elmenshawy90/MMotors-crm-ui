import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppSidebar } from "@/components/AppSidebar";
import { PageShell } from "@/components/AppTopbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import apiClient from "@/lib/api-client";
import {
  Database,
  Server,
  Cpu,
  MemoryStick,
  Activity,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Zap,
  Globe,
  Shield,
  Users,
  Car,
  Phone,
  CalendarCheck,
  LifeBuoy,
  TrendingUp,
  Building2,
  Contact,
  Wifi,
  HardDrive,
  Box,
  Terminal,
  Timer,
  ArrowUpRight,
  Loader2,
} from "lucide-react";

export const Route = createFileRoute("/system")({
  head: () => ({
    meta: [{ title: "System Status — SIG" }],
  }),
  component: SystemStatusPage,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatBytes(mb: number) {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-block h-2.5 w-2.5 rounded-full animate-pulse",
        status === "operational" ? "bg-green-500" :
        status === "degraded"    ? "bg-yellow-400" :
                                   "bg-red-500"
      )}
    />
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    operational: "bg-green-100 text-green-700 border-green-200",
    degraded:    "bg-yellow-100 text-yellow-700 border-yellow-200",
    error:       "bg-red-100 text-red-700 border-red-200",
    healthy:     "bg-green-100 text-green-700 border-green-200",
  };
  const label: Record<string, string> = {
    operational: "Operational",
    degraded:    "Degraded",
    error:       "Error",
    healthy:     "Healthy",
  };
  return (
    <Badge className={cn("border text-xs font-semibold", map[status] || map.error)}>
      {label[status] || status}
    </Badge>
  );
}

// Animated counter
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / 40);
    const t = setInterval(() => {
      start += step;
      if (start >= target) { setVal(target); clearInterval(t); }
      else setVal(start);
    }, 20);
    return () => clearInterval(t);
  }, [target]);
  return <>{val.toLocaleString()}{suffix}</>;
}

// Pulse ring for overall status
function PulseRing({ status }: { status: string }) {
  const color =
    status === "operational" ? "bg-green-500" :
    status === "degraded"    ? "bg-yellow-400" :
                               "bg-red-500";
  return (
    <div className="relative flex h-20 w-20 items-center justify-center mx-auto">
      <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-25 animate-ping", color)} />
      <span className={cn("relative inline-flex h-14 w-14 rounded-full items-center justify-center", color)}>
        {status === "operational" ? (
          <CheckCircle2 className="h-7 w-7 text-white" />
        ) : status === "degraded" ? (
          <AlertTriangle className="h-7 w-7 text-white" />
        ) : (
          <XCircle className="h-7 w-7 text-white" />
        )}
      </span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

function SystemStatusPage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const {
    data: status,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["system-status"],
    queryFn: () => apiClient.getSystemStatus(),
    refetchInterval: autoRefresh ? 15_000 : false,
    staleTime: 5_000,
  });

  // Track last refresh time
  useEffect(() => {
    if (status) setLastRefresh(new Date());
  }, [status]);

  const handleRefresh = () => {
    refetch();
    setLastRefresh(new Date());
  };

  const overall = status?.overall || "unknown";

  const overallLabel: Record<string, string> = {
    operational: "All Systems Operational",
    degraded: "System Degraded",
    error: "System Error",
    unknown: "Checking…",
  };

  const overallDesc: Record<string, string> = {
    operational: "All services are running normally. No incidents detected.",
    degraded: "Some services may be experiencing issues.",
    error: "Critical system error detected. Immediate attention required.",
    unknown: "Fetching system status…",
  };

  const statCards = status ? [
    { label: "Users",          value: status.stats.users,              icon: <Users className="h-5 w-5" />,        color: "text-blue-500",   bg: "bg-blue-500/10"   },
    { label: "Branches",       value: status.stats.branches,           icon: <Building2 className="h-5 w-5" />,    color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Contacts",       value: status.stats.contacts,           icon: <Contact className="h-5 w-5" />,      color: "text-green-500",  bg: "bg-green-500/10"  },
    { label: "Vehicles",       value: status.stats.vehicles,           icon: <Car className="h-5 w-5" />,          color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Appointments",   value: status.stats.appointments,       icon: <CalendarCheck className="h-5 w-5" />,color: "text-cyan-500",   bg: "bg-cyan-500/10"   },
    { label: "Tickets",        value: status.stats.tickets,            icon: <LifeBuoy className="h-5 w-5" />,     color: "text-red-500",    bg: "bg-red-500/10"    },
    { label: "Leads",          value: status.stats.leads,              icon: <TrendingUp className="h-5 w-5" />,   color: "text-emerald-500",bg: "bg-emerald-500/10"},
    { label: "Phone Calls",    value: status.stats.phone_calls,        icon: <Phone className="h-5 w-5" />,        color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { label: "Today's Appts",  value: status.stats.today_appointments, icon: <Clock className="h-5 w-5" />,        color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Open Tickets",   value: status.stats.open_tickets,       icon: <AlertTriangle className="h-5 w-5" />,color: "text-rose-500",   bg: "bg-rose-500/10"   },
    { label: "Active Vehicles",value: status.stats.active_vehicles,    icon: <Zap className="h-5 w-5" />,          color: "text-amber-500",  bg: "bg-amber-500/10"  },
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentTitle="System Status"
      />

      <div className={cn("transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
        <PageShell
          title="System Status"
          subtitle="Real-time health monitoring for database, server, and all services."
          showTopbar={false}
        >
          {/* ── Toolbar ── */}
          <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last updated: {lastRefresh.toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={autoRefresh ? "default" : "outline"}
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="hover-lift"
              >
                <Timer className="mr-2 h-4 w-4" />
                Auto-refresh {autoRefresh ? "ON" : "OFF"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isFetching}
                className="hover-lift"
              >
                <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
              </Button>
            </div>
          </div>

          {/* ── Loading ── */}
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-32 gap-4 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <p className="text-lg font-medium">Connecting to server…</p>
            </div>
          )}

          {/* ── Error (can't reach server at all) ── */}
          {!isLoading && error && (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center mx-auto">
                <span className="absolute inline-flex h-full w-full rounded-full opacity-25 animate-ping bg-red-500" />
                <span className="relative inline-flex h-16 w-16 rounded-full items-center justify-center bg-red-500">
                  <XCircle className="h-8 w-8 text-white" />
                </span>
              </div>
              <h2 className="text-xl font-bold text-destructive">Cannot Reach Server</h2>
              <p className="text-muted-foreground text-center max-w-md">
                {(error as any)?.message || "Unable to connect to the API server."}
              </p>
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          )}

          {status && (
            <div className="space-y-6">
              {/* ── Overall Status Hero ── */}
              <Card className={cn(
                "border-2 transition-all",
                overall === "operational" && "border-green-300 bg-green-50/40",
                overall === "degraded"    && "border-yellow-300 bg-yellow-50/40",
                overall === "error"       && "border-red-300 bg-red-50/40",
              )}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <PulseRing status={overall} />
                    <div className="text-center sm:text-left">
                      <h2 className="text-2xl font-bold">{overallLabel[overall]}</h2>
                      <p className="text-muted-foreground mt-1">{overallDesc[overall]}</p>
                      <div className="flex items-center gap-3 mt-3 flex-wrap justify-center sm:justify-start">
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {new Date(status.timestamp).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Zap className="h-4 w-4" />
                          API {status.api_latency_ms}ms
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Services Grid ── */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {status.services.map((svc: any) => (
                  <Card key={svc.name} className="glass-card hover-lift transition-all">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold">{svc.name}</p>
                        <StatusDot status={svc.status} />
                      </div>
                      <StatusBadge status={svc.status} />
                      {svc.latency_ms !== null && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          {svc.latency_ms}ms latency
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* ── Database Card ── */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Database className="h-5 w-5 text-primary" /> Database
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Status</span>
                      <div className="flex items-center gap-2">
                        <StatusDot status={status.database.status} />
                        <StatusBadge status={status.database.status} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Engine</span>
                      <span className="font-semibold text-sm">{status.database.dialect}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground text-sm">Ping Latency</span>
                      <span className={cn(
                        "font-bold text-sm",
                        (status.database.latency_ms || 0) < 50  ? "text-green-600" :
                        (status.database.latency_ms || 0) < 200 ? "text-yellow-600" :
                                                                    "text-red-600"
                      )}>
                        {status.database.latency_ms !== null
                          ? `${status.database.latency_ms} ms`
                          : "—"}
                      </span>
                    </div>
                    {status.database.error && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                        {status.database.error}
                      </div>
                    )}

                    {/* Connection quality bar */}
                    <div className="space-y-1.5 pt-2 border-t border-border/50">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Connection Quality</span>
                        <span>{status.database.status === "healthy" ? "Excellent" : "Poor"}</span>
                      </div>
                      <Progress
                        value={status.database.status === "healthy"
                          ? Math.max(0, 100 - (status.database.latency_ms || 0) / 3)
                          : 0}
                        className={cn("h-2",
                          status.database.status === "healthy"
                            ? "[&>div]:bg-green-500"
                            : "[&>div]:bg-red-500"
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* ── Server Info ── */}
                <Card className="glass-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Server className="h-5 w-5 text-primary" /> Server
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { label: "Uptime",       value: formatUptime(status.server.uptime_seconds), icon: <Timer className="h-3.5 w-3.5" /> },
                      { label: "Node.js",      value: status.server.node_version,                 icon: <Terminal className="h-3.5 w-3.5" /> },
                      { label: "Platform",     value: `${status.server.platform} (${status.server.arch})`, icon: <Box className="h-3.5 w-3.5" /> },
                      { label: "Hostname",     value: status.server.hostname,                     icon: <Globe className="h-3.5 w-3.5" /> },
                      { label: "CPU",          value: `${status.server.cpu_count}x ${status.server.cpu_model?.slice(0, 25)}…`, icon: <Cpu className="h-3.5 w-3.5" /> },
                      { label: "Load (1m/5m)", value: `${status.server.load_avg_1m} / ${status.server.load_avg_5m}`, icon: <Activity className="h-3.5 w-3.5" /> },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          {row.icon} {row.label}
                        </span>
                        <span className="font-medium text-right max-w-[55%] truncate" title={row.value}>
                          {row.value}
                        </span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* ── Memory ── */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <HardDrive className="h-5 w-5 text-primary" /> Memory
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* System Memory */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">System RAM</span>
                        <span className="font-semibold">
                          {formatBytes(status.memory.used_mb)} / {formatBytes(status.memory.total_mb)}
                        </span>
                      </div>
                      <Progress
                        value={status.memory.usage_pct}
                        className={cn(
                          "h-3",
                          status.memory.usage_pct < 60  ? "[&>div]:bg-green-500" :
                          status.memory.usage_pct < 80  ? "[&>div]:bg-yellow-400" :
                                                           "[&>div]:bg-red-500"
                        )}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{status.memory.usage_pct}% used</span>
                        <span>{formatBytes(status.memory.free_mb)} free</span>
                      </div>

                      {/* Memory breakdown bars */}
                      <div className="space-y-2 pt-2">
                        {[
                          { label: "Used",  pct: status.memory.usage_pct,  color: "bg-blue-500" },
                          { label: "Free",  pct: 100 - status.memory.usage_pct, color: "bg-green-500" },
                        ].map((bar) => (
                          <div key={bar.label} className="flex items-center gap-3 text-xs">
                            <span className={cn("h-2.5 w-2.5 rounded-full shrink-0", bar.color)} />
                            <span className="text-muted-foreground w-10">{bar.label}</span>
                            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full", bar.color)} style={{ width: `${bar.pct}%` }} />
                            </div>
                            <span className="w-10 text-right font-medium">{bar.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Heap / Process */}
                    <div className="space-y-3">
                      <p className="text-sm font-semibold text-muted-foreground">Node.js Process</p>
                      {[
                        { label: "Heap Used",  value: formatBytes(status.memory.heap_used_mb),  pct: Math.round((status.memory.heap_used_mb / status.memory.heap_total_mb) * 100) },
                        { label: "Heap Total", value: formatBytes(status.memory.heap_total_mb), pct: 100 },
                        { label: "RSS",        value: formatBytes(status.memory.rss_mb),         pct: Math.round((status.memory.rss_mb / status.memory.total_mb) * 100) },
                      ].map((row) => (
                        <div key={row.label} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className="font-medium">{row.value}</span>
                          </div>
                          <Progress value={row.pct} className="h-1.5 [&>div]:bg-primary" />
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── Data Stats ── */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-5 w-5 text-primary" /> Database Records
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
                    {statCards.map((s) => (
                      <div
                        key={s.label}
                        className="rounded-xl border border-border/50 bg-background p-4 text-center space-y-2 hover:shadow-md transition-all hover:-translate-y-0.5"
                      >
                        <div className={cn("mx-auto w-10 h-10 rounded-xl flex items-center justify-center", s.bg)}>
                          <span className={s.color}>{s.icon}</span>
                        </div>
                        <p className={cn("text-2xl font-bold tabular-nums", s.color)}>
                          <Counter target={s.value} />
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">{s.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* ── API Latency ── */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  {
                    label: "API Response Time",
                    value: `${status.api_latency_ms} ms`,
                    icon: <Zap className="h-5 w-5" />,
                    color: status.api_latency_ms < 100 ? "text-green-600" : status.api_latency_ms < 300 ? "text-yellow-600" : "text-red-600",
                    bg: status.api_latency_ms < 100 ? "bg-green-100" : status.api_latency_ms < 300 ? "bg-yellow-100" : "bg-red-100",
                    note: status.api_latency_ms < 100 ? "Excellent" : status.api_latency_ms < 300 ? "Acceptable" : "Slow",
                  },
                  {
                    label: "DB Ping Latency",
                    value: status.database.latency_ms !== null ? `${status.database.latency_ms} ms` : "N/A",
                    icon: <Database className="h-5 w-5" />,
                    color: (status.database.latency_ms || 0) < 50 ? "text-green-600" : "text-yellow-600",
                    bg: (status.database.latency_ms || 0) < 50 ? "bg-green-100" : "bg-yellow-100",
                    note: (status.database.latency_ms || 0) < 50 ? "Excellent" : "Acceptable",
                  },
                  {
                    label: "Server Uptime",
                    value: formatUptime(status.server.uptime_seconds),
                    icon: <Timer className="h-5 w-5" />,
                    color: "text-blue-600",
                    bg: "bg-blue-100",
                    note: "Running",
                  },
                ].map((card) => (
                  <Card key={card.label} className="glass-card hover-lift">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className={cn("p-3 rounded-xl", card.bg)}>
                        <span className={card.color}>{card.icon}</span>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{card.label}</p>
                        <p className={cn("text-2xl font-bold", card.color)}>{card.value}</p>
                        <p className="text-xs text-muted-foreground">{card.note}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* ── Security & Environment ── */}
              <Card className="glass-card">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Shield className="h-5 w-5 text-primary" /> Environment & Security
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: "Authentication",  value: "JWT Bearer",    icon: <Shield className="h-4 w-4" />,   status: "operational" },
                      { label: "Encryption",      value: "TLS / HTTPS",   icon: <Wifi className="h-4 w-4" />,     status: "operational" },
                      { label: "Rate Limiting",   value: "Active",        icon: <Zap className="h-4 w-4" />,      status: "operational" },
                      { label: "DB Encryption",   value: "SSL Required",  icon: <Database className="h-4 w-4" />, status: "operational" },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-border/50 bg-background p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">{item.icon}</span>
                          <StatusDot status={item.status} />
                        </div>
                        <p className="font-semibold text-sm">{item.value}</p>
                        <p className="text-xs text-muted-foreground">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </PageShell>
      </div>
    </div>
  );
}
