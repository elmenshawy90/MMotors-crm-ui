import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CalendarCheck,
  Users,
  LifeBuoy,
  Car,
  Building2,
  Wrench,
  FileText,
  BarChart3,
  Package,
  Search,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  Star,
  ArrowRight,
  Plus,
  Calendar,
  MessageSquare,
  Phone,
  PhoneCall,
  Activity,
  Shield,
  Award,
  Zap,
  Settings,
  BookOpen,
} from "lucide-react";
import { AppTopbar } from "@/components/AppTopbar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { apiClient } from "@/lib/api-client";
import { usePermissions } from "@/hooks/usePermissions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SIG — Branch & Fleet Operations" },
      {
        name: "description",
        content:
          "Operations hub for a multi-brand car company: appointments, customer contacts and helpdesk across all branches.",
      },
      { property: "og:title", content: "SIG — Branch & Fleet Operations" },
      {
        property: "og:description",
        content: "Manage appointments, contacts and helpdesk tickets across every branch and vehicle line.",
      },
    ],
  }),
  component: Launcher,
});

const apps = [
  { label: "Appointments", to: "/appointments", icon: CalendarCheck, image: "/Appointments.png", live: true },
  { label: "Contacts",     to: "/contacts",     icon: Users,         image: "/Contact.png",      live: true },
  { label: "Helpdesk",     to: "/helpdesk",     icon: LifeBuoy,      image: "/helpDesks.png",    live: true },
  { label: "Vehicles",     to: "/vehicles",     icon: Car,           image: "/cars.png",         live: true },
  { label: "Phone Calls",  to: "/phonecalls",   icon: PhoneCall,   image: "/phone-call.webp",                live: true },
  { label: "Sales & Leads", to: "/sales",       icon: TrendingUp,  image: "/role.png",        live: true },
  { label: "Branches",     to: "/branches",     icon: Building2,   image: "/branches.png",     live: true },
  { label: "Knowledge",    to: "/knowledge",    icon: BookOpen,      image: "/Knowledge.png",    live: true },
  { label: "Settings",     to: "/settings",     icon: Settings,      image: "/setting.png",    live: true },
  { label: "Roles",        to: "/roles",        icon: Shield,        image: "/role.png",         live: true },
  { label: "System Status",to: "/system",       icon: Activity,      image: null,                live: true },
] as const;

function Launcher() {
  const [query, setQuery] = useState("");
  const visible = apps.filter((a) =>
    a.label.toLowerCase().includes(query.trim().toLowerCase())
  );

  // ── API queries ──────────────────────────────────────────────────────────────
  const { data: contactsData }     = useQuery({ queryKey: ["contacts"],     queryFn: () => apiClient.getContacts(),     select: (d) => d.data || [] });
  const { data: appointmentsData } = useQuery({ queryKey: ["appointments"], queryFn: () => apiClient.getAppointments(), select: (d) => d.data || [] });
  const { data: ticketsData }      = useQuery({ queryKey: ["helpdesk"],     queryFn: () => apiClient.getTickets(),      select: (d) => d.data || [] });
  const { data: branchesData }     = useQuery({ queryKey: ["branches"],     queryFn: () => apiClient.getBranches(),     select: (d) => d.data || [] });
  const { data: vehiclesData }     = useQuery({ queryKey: ["vehicles"],     queryFn: () => apiClient.getVehicles(),     select: (d) => d.data || [] });
  const { data: phoneCallsData }   = useQuery({ queryKey: ["phone-calls"],  queryFn: () => apiClient.getPhoneCalls(),  select: (d) => d.data || [] });

  const contacts     = contactsData     || [];
  const appointments = appointmentsData || [];
  const tickets      = ticketsData      || [];
  const branches     = branchesData     || [];
  const vehicles     = vehiclesData     || [];
  const phoneCalls   = phoneCallsData   || [];

  // ── Stats ────────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      totalContacts:        contacts.length,
      totalAppointments:    appointments.length,
      openTickets:          tickets.filter((t: any) => !["solved", "closed"].includes(t.status?.toLowerCase())).length,
      totalBranches:        branches.length,
      totalVehicles:        vehicles.length,
      todayAppointments:    appointments.filter((a: any) => (a.appointment_date || "").startsWith(today)).length,
      upcomingAppointments: appointments.filter((a: any) => new Date(a.appointment_date) >= new Date()).length,
      totalPhoneCalls:      phoneCalls.length,
      missedCalls:          phoneCalls.filter((c: any) => c.status === "missed" || c.status === "Missed").length,
    };
  }, [contacts, appointments, tickets, branches, vehicles, phoneCalls]);

  // ── Recent activity ───────────────────────────────────────────────────────────
  const recentActivities = useMemo(() => {
    const apptActs = appointments.slice(0, 3).map((a: any) => ({
      type: "appointment",
      title: `Appointment: ${a.type || a.kind || "Service"}`,
      subtitle: `${a.appointment_date ? new Date(a.appointment_date).toLocaleDateString() : "—"} at ${a.appointment_time || "—"}`,
      icon: Calendar,
      color: "blue",
    }));
    const ticketActs = tickets.slice(0, 2).map((t: any) => ({
      type: "ticket",
      title: `Ticket: ${t.subject || t.title || "Support"}`,
      subtitle: `${t.ticket_number || t.ref || ""} - ${t.status || t.stage || "Open"}`,
      icon: AlertCircle,
      color: ["solved", "closed"].includes((t.status || "").toLowerCase()) ? "green" : "red",
    }));
    const contactActs = contacts.slice(0, 2).map((c: any) => ({
      type: "contact",
      title: `Contact: ${c.first_name || ""} ${c.last_name || ""}`.trim() || c.name || "New Contact",
      subtitle: c.contact_type || c.type || "Individual",
      icon: Users,
      color: "purple",
    }));
    return [...apptActs, ...ticketActs, ...contactActs].slice(0, 5);
  }, [appointments, tickets, contacts]);

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString("en-GB"); } catch { return dateStr; }
  };

  return (
    <div className="app-gradient min-h-screen">
      <AppTopbar />
      <div className="mx-auto w-full max-w-7xl px-4 pt-8 pb-20">

        {/* Welcome */}
        <div className="mb-6 fade-in">
          <div className="flex items-center gap-4">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <img
                src="/logo.jpeg"
                alt="SIG Modern Motors Logo"
                className="h-12 w-12 object-contain"
              />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1 drop-shadow-lg">Welcome to SIG</h1>
              <p className="text-base text-white/90">Multi-branch operations management system</p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-8 fade-in">
          <div className="relative">
            <Search className="absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search apps, contacts, appointments..."
              aria-label="Search"
              className="h-14 w-full rounded-xl border border-white/30 bg-white/20 backdrop-blur-sm pr-4 pl-14 text-lg text-gray-900 placeholder:text-gray-500 focus:ring-2 focus:ring-white/50 focus:outline-none transition-all shadow-lg"
            />
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
              <kbd className="px-2 py-1 text-xs bg-white/30 rounded text-gray-600 border border-white/40">⌘K</kbd>
            </div>
          </div>
        </div>

        {/* Applications Grid */}
        <div className="mb-10 fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white drop-shadow-lg">Applications</h2>
            <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">
              {visible.filter((a) => a.live).length} Live
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visible.map((app) => (
              <Link key={app.label} to={app.to} className="group flex flex-col items-center gap-3 text-center">
                <div className="relative">
                  {app.image ? (
                    <img
                      src={app.image}
                      alt={app.label}
                      className={cn(
                        "h-24 w-24 object-contain transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-110",
                        !app.live && "opacity-50"
                      )}
                    />
                  ) : (
                    <span className={cn(
                      "tile-shadow grid h-24 w-24 place-items-center rounded-2xl bg-white/95 shadow-lg transition-all duration-300 group-hover:-translate-y-2 group-hover:scale-105",
                      !app.live && "opacity-50"
                    )}>
                      <app.icon
                        className={cn("h-16 w-16 transition-colors", app.live ? "text-primary" : "text-gray-400")}
                        strokeWidth={1.75}
                      />
                    </span>
                  )}
                  {app.live && (
                    <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-green-500 border-2 border-white pulse-glow" />
                  )}
                </div>
                <span className="text-base font-semibold text-gray-900 group-hover:text-gray-700 transition-colors">
                  {app.label}
                </span>
                {!app.live && (
                  <Badge variant="secondary" className="text-xs bg-gray-200 text-gray-600">Coming Soon</Badge>
                )}
              </Link>
            ))}
          </div>
          {visible.length === 0 && (
            <p className="mt-8 text-center text-white/80">No app matches "{query}".</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="mb-10 fade-in">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white drop-shadow-lg">Quick Actions</h2>
            <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">Frequently used</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link to="/contacts">
              <Button className="w-full h-auto p-4 bg-white/95 backdrop-blur-sm hover-lift button-press flex flex-col items-center gap-2 shadow-lg">
                <Plus className="h-6 w-6 text-primary" />
                <span className="font-medium text-gray-900">New Contact</span>
                <span className="text-xs text-gray-500">Add customer</span>
              </Button>
            </Link>
            <Link to="/appointments/create">
              <Button className="w-full h-auto p-4 bg-white/95 backdrop-blur-sm hover-lift button-press flex flex-col items-center gap-2 shadow-lg">
                <Calendar className="h-6 w-6 text-green-600" />
                <span className="font-medium text-gray-900">Schedule Appointment</span>
                <span className="text-xs text-gray-500">Book service</span>
              </Button>
            </Link>
            <Link to="/helpdesk">
              <Button className="w-full h-auto p-4 bg-white/95 backdrop-blur-sm hover-lift button-press flex flex-col items-center gap-2 shadow-lg">
                <LifeBuoy className="h-6 w-6 text-blue-600" />
                <span className="font-medium text-gray-900">Create Ticket</span>
                <span className="text-xs text-gray-500">Support request</span>
              </Button>
            </Link>
            <Link to="/knowledge">
              <Button className="w-full h-auto p-4 bg-white/95 backdrop-blur-sm hover-lift button-press flex flex-col items-center gap-2 shadow-lg">
                <BookOpen className="h-6 w-6 text-purple-600" />
                <span className="font-medium text-gray-900">Knowledge Base</span>
                <span className="text-xs text-gray-500">Guides & articles</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white drop-shadow-lg">Performance Overview</h2>
            <Button variant="ghost" size="sm" className="text-white/80 hover:text-white bg-white/10 backdrop-blur-sm">
              View Details <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 card-stagger">

            {/* Contacts */}
            <Card className="bg-white/95 backdrop-blur-sm hover-lift transition-all button-press shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Contacts</p>
                    <p className="text-3xl font-bold text-gray-900 stat-counter">{stats.totalContacts}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-primary/10">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Registered</span>
                    <span className="text-green-600 font-medium">{stats.totalContacts}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: "75%" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appointments */}
            <Card className="bg-white/95 backdrop-blur-sm hover-lift transition-all button-press shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Today's Appointments</p>
                    <p className="text-3xl font-bold text-gray-900 stat-counter">{stats.todayAppointments}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-green-100">
                    <CalendarCheck className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Upcoming this week</span>
                    <span className="text-green-600 font-medium">{stats.upcomingAppointments}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min((stats.todayAppointments / 10) * 100, 100)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Open Tickets */}
            <Card className="bg-white/95 backdrop-blur-sm hover-lift transition-all button-press shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Open Tickets</p>
                    <p className="text-3xl font-bold text-gray-900 stat-counter">{stats.openTickets}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-red-100">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Total tickets</span>
                    <span className="text-gray-600 font-medium">{tickets.length}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min((stats.openTickets / Math.max(tickets.length, 1)) * 100, 100)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vehicles */}
            <Card className="bg-white/95 backdrop-blur-sm hover-lift transition-all button-press shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Total Vehicles</p>
                    <p className="text-3xl font-bold text-gray-900 stat-counter">{stats.totalVehicles}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-purple-100">
                    <Car className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Fleet</span>
                    <span className="text-purple-600 font-medium">Active</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500 rounded-full" style={{ width: "100%" }} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phone Calls */}
            <Card className="bg-white/95 backdrop-blur-sm hover-lift transition-all button-press shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Phone Calls</p>
                    <p className="text-3xl font-bold text-gray-900 stat-counter">{stats.totalPhoneCalls}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-100">
                    <PhoneCall className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Missed</span>
                    <span className="text-red-600 font-medium">{stats.missedCalls}</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min((stats.totalPhoneCalls / 20) * 100, 100)}%` }} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom two-col grid */}
        <div className="grid gap-8 lg:grid-cols-2">

          {/* Upcoming Events */}
          <div className="fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Upcoming Events</h2>
              <Button variant="ghost" size="sm" className="text-white/80 hover:text-white bg-white/10 backdrop-blur-sm" asChild>
                <Link to="/appointments">View Calendar <ArrowRight className="ml-2 h-4 w-4" /></Link>
              </Button>
            </div>
            <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {appointments.slice(0, 3).map((apt: any) => {
                    const contactName =
                      apt.contact
                        ? `${apt.contact.first_name || ""} ${apt.contact.last_name || ""}`.trim()
                        : apt.customer_name || "Unknown";
                    const dateObj = apt.appointment_date ? new Date(apt.appointment_date) : null;
                    return (
                      <Link
                        key={apt.id}
                        to="/appointments/$appointmentId"
                        params={{ appointmentId: apt.id }}
                        className="flex items-center gap-4 p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors block"
                      >
                        <div className="flex flex-col items-center justify-center p-3 rounded-lg bg-primary/10 min-w-[60px]">
                          <span className="text-2xl font-bold text-gray-900">
                            {dateObj ? dateObj.getDate() : "—"}
                          </span>
                          <span className="text-xs text-gray-600 uppercase">
                            {dateObj ? dateObj.toLocaleString("default", { month: "short" }) : ""}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <CalendarCheck className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold text-gray-900 capitalize">
                              {apt.type?.replace("_", " ") || apt.kind || "Service"}
                            </span>
                            <Badge variant="outline" className="text-xs bg-white capitalize">
                              {apt.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">
                            {contactName} • {apt.appointment_time || "—"} • {apt.branch?.name || "—"}
                          </p>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      </Link>
                    );
                  })}
                  {appointments.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
                      <p>No upcoming events scheduled</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <div className="fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Recent Activity</h2>
              <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">
                {recentActivities.length} items
              </Badge>
            </div>
            <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
              <CardContent className="p-4 space-y-4">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className={cn(
                      "p-2 rounded-lg",
                      activity.color === "blue"   ? "bg-blue-100"   :
                      activity.color === "green"  ? "bg-green-100"  :
                      activity.color === "red"    ? "bg-red-100"    :
                                                    "bg-purple-100"
                    )}>
                      <activity.icon className={cn(
                        "h-4 w-4",
                        activity.color === "blue"   ? "text-blue-600"   :
                        activity.color === "green"  ? "text-green-600"  :
                        activity.color === "red"    ? "text-red-600"    :
                                                      "text-purple-600"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{activity.title}</p>
                      <p className="text-xs text-gray-600 truncate">{activity.subtitle}</p>
                    </div>
                  </div>
                ))}
                {recentActivities.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <Activity className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>No recent activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Branch Overview & Quick Tips */}
        <div className="grid gap-8 lg:grid-cols-2 mt-8">

          {/* Branch Overview */}
          <div className="fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Branch Overview</h2>
              <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">
                {branches.length} locations
              </Badge>
            </div>
            <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
              <CardContent className="p-4">
                <div className="space-y-3">
                  {branches.slice(0, 5).map((branch: any) => (
                    <div key={branch.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-4 w-4 text-gray-600" />
                        <div>
                          <p className="font-medium text-gray-900">{branch.name}</p>
                          <p className="text-xs text-gray-600">{branch.city || branch.address || "—"}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs bg-white capitalize">
                        {branch.status || "active"}
                      </Badge>
                    </div>
                  ))}
                  {branches.length === 0 && (
                    <p className="text-center text-gray-500 py-4 text-sm">No branches found</p>
                  )}
                </div>
                <Button variant="ghost" size="sm" className="w-full mt-4 text-gray-600 hover:text-gray-900" asChild>
                  <Link to="/branches">View All Branches <ArrowRight className="ml-2 h-4 w-4" /></Link>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Quick Tips */}
          <div className="fade-in">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white drop-shadow-lg">Quick Tips</h2>
              <Badge variant="outline" className="text-xs bg-white/20 text-white border-white/30">Helpful hints</Badge>
            </div>
            <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="p-2 rounded-lg bg-yellow-100"><Star className="h-4 w-4 text-yellow-600" /></div>
                    <div>
                      <p className="font-medium text-gray-900">Priority Contacts</p>
                      <p className="text-xs text-gray-600">Platinum members get priority scheduling</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="p-2 rounded-lg bg-green-100"><Shield className="h-4 w-4 text-green-600" /></div>
                    <div>
                      <p className="font-medium text-gray-900">Warranty Tracking</p>
                      <p className="text-xs text-gray-600">Monitor warranty status per vehicle</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="p-2 rounded-lg bg-blue-100"><Activity className="h-4 w-4 text-blue-600" /></div>
                    <div>
                      <p className="font-medium text-gray-900">Real-time Updates</p>
                      <p className="text-xs text-gray-600">Live status for all appointments</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                    <div className="p-2 rounded-lg bg-purple-100"><BookOpen className="h-4 w-4 text-purple-600" /></div>
                    <div>
                      <p className="font-medium text-gray-900">Knowledge Base</p>
                      <p className="text-xs text-gray-600">Access guides, FAQs and articles</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
