import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ContactForm } from "@/components/forms/ContactForm";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Phone,
  MapPin,
  Plus,
  Search,
  Download,
  MoreVertical,
  Star,
  Clock,
  AlertCircle,
  TrendingUp,
  Users,
  Car as CarIcon,
  Calendar,
  MessageSquare,
  Shield,
  Award,
  Trash2,
  Tag,
  FileSpreadsheet,
  Edit,
  RefreshCw,
  Loader2,
  UserPlus,
  CheckCheck,
  X,
  Filter,
  Calendar as CalendarIcon,
} from "lucide-react";
import { PageShell } from "@/components/AppTopbar";
import { AppSidebar } from "@/components/AppSidebar";
import { apiClient } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import * as XLSX from 'xlsx';
import { format, startOfYear, endOfYear, subYears, addYears } from 'date-fns';

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [
      { title: "Contacts — SIG" },
      {
        name: "description",
        content:
          "Customer, company and fleet contacts with their owned vehicles, branch and service history.",
      },
      { property: "og:title", content: "Contacts — SIG" },
      {
        property: "og:description",
        content:
          "Directory of individual, company and fleet customers across all branches.",
      },
    ],
  }),
  component: ContactsPage,
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string) {
  return `${firstName?.[0] || ""}${lastName?.[0] || ""}`.toUpperCase();
}

function getContactName(c: any) {
  return `${c.first_name || ""} ${c.last_name || ""}`.trim();
}

const LOYALTY_COLOR: Record<string, string> = {
  Bronze: "bg-orange-700/20 text-orange-700",
  Silver: "bg-slate-400/20 text-slate-600",
  Gold: "bg-yellow-500/20 text-yellow-600",
  Platinum: "bg-indigo-500/20 text-indigo-600",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

function ContactsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // ── Filters ────────────────────────────────────────────────────────────────
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [branch, setBranch] = useState("all");
  const [type, setType] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [dateRange, setDateRange] = useState("all"); // all, this_month, this_year, last_month, last_year, custom
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [status, setStatus] = useState("all");
  const [city, setCity] = useState("all");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<any | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [vehicleTarget, setVehicleTarget] = useState<any | null>(null);
  const [isBulkMode, setIsBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagDialogOpen, setBulkTagDialogOpen] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [exportingAll, setExportingAll] = useState(false);

  // ── Debounce search ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 400);
    return () => clearTimeout(t);
  }, [q]);

  // ── Queries ────────────────────────────────────────────────────────────────
  const {
    data: contactsData,
    isLoading: contactsLoading,
    isError: contactsError,
    error: contactsRawError,
    refetch,
  } = useQuery({
    queryKey: ["contacts", { 
      branch_id: branch, 
      type, 
      search: debouncedQ, 
      sort_by: sortBy,
      date_range: dateRange,
      custom_start_date: customStartDate,
      custom_end_date: customEndDate,
      year: yearFilter,
      status,
      city
    }],
    queryFn: () =>
      apiClient.getContacts({
        branch_id: branch !== "all" ? branch : undefined,
        type: type !== "all" ? type : undefined,
        search: debouncedQ || undefined,
        sort_by: sortBy,
        date_range: dateRange !== "all" ? dateRange : undefined,
        custom_start_date: dateRange === "custom" ? customStartDate : undefined,
        custom_end_date: dateRange === "custom" ? customEndDate : undefined,
        year: yearFilter !== "all" ? yearFilter : undefined,
        status: status !== "all" ? status : undefined,
        city: city !== "all" ? city : undefined,
      }),
    staleTime: 30_000,
    retry: 1,
  });

  const { data: statsData } = useQuery({
    queryKey: ["contactStats", { branch_id: branch }],
    queryFn: () =>
      apiClient.getContactStats(branch !== "all" ? { branch_id: branch } : undefined),
  });

  const { data: branchesData } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiClient.getBranches(),
  });

  const list: any[] = useMemo(() => {
    // handle both { data: [...] } and plain array responses
    if (!contactsData) return [];
    if (Array.isArray(contactsData)) return contactsData;
    if (Array.isArray(contactsData.data)) return contactsData.data;
    return [];
  }, [contactsData]);
  const stats = statsData || {
    totalContacts: 0,
    byType: { Individual: 0, Company: 0, Fleet: 0 },
    totalVehicles: 0,
    totalAppointments: 0,
    openTickets: 0,
    platinumMembers: 0,
  };
  const branches: any[] = branchesData?.data || [];

  // ── Single delete ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteContact(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contactStats"] });
      toast.success("Contact deleted");
      setDeleteTarget(null);
    },
    onError: () => toast.error("Failed to delete contact"),
  });

  // ── Bulk delete ────────────────────────────────────────────────────────────
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => apiClient.bulkDeleteContacts(ids),
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      queryClient.invalidateQueries({ queryKey: ["contactStats"] });
      toast.success(`${ids.length} contacts deleted`);
      setSelectedIds(new Set());
      setIsBulkMode(false);
    },
    onError: () => toast.error("Failed to delete contacts"),
  });

  // ── Bulk tag ───────────────────────────────────────────────────────────────
  const bulkTagMutation = useMutation({
    mutationFn: ({ ids, tags }: { ids: string[]; tags: string[] }) =>
      apiClient.bulkUpdateContacts(ids, { tags }),
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(`Tags added to ${ids.length} contacts`);
      setSelectedIds(new Set());
      setIsBulkMode(false);
      setBulkTagDialogOpen(false);
      setTagInput("");
    },
    onError: () => toast.error("Failed to add tags"),
  });

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = async (ids?: string[]) => {
    setExportingAll(true);
    try {
      const params: any = {};
      if (ids && ids.length > 0) params.ids = ids.join(",");
      if (branch !== "all") params.branch_id = branch;
      if (type !== "all") params.type = type;
      if (q.trim()) params.search = q.trim();
      if (dateRange !== "all") params.date_range = dateRange;
      if (dateRange === "custom") {
        params.custom_start_date = customStartDate;
        params.custom_end_date = customEndDate;
      }
      if (yearFilter !== "all") params.year = yearFilter;
      if (status !== "all") params.status = status;
      if (city !== "all") params.city = city;

      const response = await apiClient.getContacts(params);
      const contactsToExport = ids && ids.length > 0 
        ? (Array.isArray(response) ? response : response.data).filter((c: any) => ids.includes(c.id))
        : (Array.isArray(response) ? response : response.data);

      // Create Excel workbook
      const workbook = XLSX.utils.book_new();
      
      // Define worksheet data
      const worksheetData = contactsToExport.map((c: any) => ({
        'ID': c.id,
        'First Name': c.first_name || '',
        'Last Name': c.last_name || '',
        'Full Name': `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        'Company Name': c.company_name || '',
        'Type': c.type || c.contact_type || '',
        'Email': c.email || '',
        'Phone': c.phone || '',
        'Mobile': c.mobile || '',
        'Branch': c.branch?.name || '',
        'City': c.city || '',
        'Address': c.address || '',
        'Credit Limit': c.credit_limit || 0,
        'Status': c.status || 'active',
        'Tags': Array.isArray(c.tags) ? c.tags.join(', ') : '',
        'Created At': c.created_at ? new Date(c.created_at).toLocaleDateString() : '',
        'Updated At': c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '',
      }));

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      
      // Set column widths
      const colWidths = [
        { wch: 10 }, // ID
        { wch: 15 }, // First Name
        { wch: 15 }, // Last Name
        { wch: 25 }, // Full Name
        { wch: 20 }, // Company Name
        { wch: 10 }, // Type
        { wch: 25 }, // Email
        { wch: 15 }, // Phone
        { wch: 15 }, // Mobile
        { wch: 20 }, // Branch
        { wch: 15 }, // City
        { wch: 30 }, // Address
        { wch: 12 }, // Credit Limit
        { wch: 10 }, // Status
        { wch: 30 }, // Tags
        { wch: 12 }, // Created At
        { wch: 12 }, // Updated At
      ];
      worksheet['!cols'] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contacts-${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${ids ? ids.length : "all"} contacts to Excel`);
      if (ids) {
        setSelectedIds(new Set());
        setIsBulkMode(false);
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error("Export failed");
    } finally {
      setExportingAll(false);
    }
  };

  // ── Selection helpers ──────────────────────────────────────────────────────
  const toggleOne = (id: string) => {
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelectedIds(next);
  };

  const toggleAll = () => {
    if (selectedIds.size === list.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(list.map((c) => c.id)));
    }
  };

  // ── Send message helper (opens WhatsApp / tel) ────────────────────────────
  const handleSendMessage = (c: any) => {
    const phone = (c.phone || "").replace(/\D/g, "");
    if (!phone) {
      toast.error("No phone number available");
      return;
    }
    window.open(`https://wa.me/${phone}`, "_blank");
  };

  const handleCall = (c: any) => {
    if (!c.phone) {
      toast.error("No phone number available");
      return;
    }
    window.location.href = `tel:${c.phone}`;
  };

  const handleScheduleAppointment = (c: any) => {
    navigate({ to: "/appointments/create", search: { contactId: c.id } });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentTitle="Contacts"
      />
      <div
        className={cn(
          "transition-all duration-300",
          sidebarCollapsed ? "ml-16" : "ml-64"
        )}
      >
        <PageShell
          title="Contacts"
          subtitle="Individuals, companies and fleet accounts, linked to their vehicles and home branch."
          showTopbar={false}
        >
          {/* ── Stats ── */}
          <div className="mb-6 grid gap-4 md:grid-cols-3 lg:grid-cols-6 card-stagger">
            {[
              { label: "Total",        value: stats.totalContacts,          icon: <Users className="h-5 w-5 text-primary" />,        bg: "bg-primary/10"    },
              { label: "Vehicles",     value: stats.totalVehicles,          icon: <CarIcon className="h-5 w-5 text-blue-500" />,     bg: "bg-blue-500/10"   },
              { label: "Appointments", value: stats.totalAppointments,      icon: <Calendar className="h-5 w-5 text-green-500" />,   bg: "bg-green-500/10"  },
              { label: "Open Tickets", value: stats.openTickets,            icon: <AlertCircle className="h-5 w-5 text-red-500" />,  bg: "bg-red-500/10"    },
              { label: "Platinum",     value: stats.platinumMembers,        icon: <Award className="h-5 w-5 text-purple-500" />,     bg: "bg-purple-500/10" },
              { label: "Fleet",        value: stats.byType?.Fleet ?? 0,     icon: <TrendingUp className="h-5 w-5 text-yellow-500" />,bg: "bg-yellow-500/10" },
            ].map((s) => (
              <Card key={s.label} className="glass-card hover-lift transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-lg", s.bg)}>{s.icon}</div>
                    <div>
                      <p className="text-2xl font-bold stat-counter">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ── Toolbar ── */}
          <div className="mb-4 flex flex-wrap gap-3 items-center justify-between">
            {/* Left: filters */}
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search name, company, phone…"
                  className="pl-10 w-[240px]"
                />
              </div>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Individual">Individual</SelectItem>
                  <SelectItem value="Company">Company</SelectItem>
                  <SelectItem value="Fleet">Fleet</SelectItem>
                </SelectContent>
              </Select>
              <Select value={branch} onValueChange={setBranch}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Branch" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Branches</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name A–Z</SelectItem>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="appointments">Most Active</SelectItem>
                </SelectContent>
              </Select>
              
              {/* Advanced Filters Toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={cn(
                  "hover-lift",
                  showAdvancedFilters && "bg-primary text-primary-foreground"
                )}
              >
                <Filter className="mr-2 h-4 w-4" />
                Advanced Filters
              </Button>

              {/* Advanced Filters Panel */}
              {showAdvancedFilters && (
                <div className="flex flex-wrap gap-2 p-3 bg-muted/30 rounded-lg border border-border/40">
                  {/* Date Range Filter */}
                  <Select value={dateRange} onValueChange={setDateRange}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Date Range" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Time</SelectItem>
                      <SelectItem value="this_month">This Month</SelectItem>
                      <SelectItem value="last_month">Last Month</SelectItem>
                      <SelectItem value="this_year">This Year</SelectItem>
                      <SelectItem value="last_year">Last Year</SelectItem>
                      <SelectItem value="custom">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Custom Date Range */}
                  {dateRange === "custom" && (
                    <>
                      <Input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="w-[140px]"
                        placeholder="Start Date"
                      />
                      <Input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="w-[140px]"
                        placeholder="End Date"
                      />
                    </>
                  )}

                  {/* Year Filter */}
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      <SelectItem value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</SelectItem>
                      <SelectItem value={(new Date().getFullYear() - 1).toString()}>{new Date().getFullYear() - 1}</SelectItem>
                      <SelectItem value={(new Date().getFullYear() - 2).toString()}>{new Date().getFullYear() - 2}</SelectItem>
                      <SelectItem value={(new Date().getFullYear() - 3).toString()}>{new Date().getFullYear() - 3}</SelectItem>
                      <SelectItem value={(new Date().getFullYear() - 4).toString()}>{new Date().getFullYear() - 4}</SelectItem>
                      <SelectItem value={(new Date().getFullYear() - 5).toString()}>{new Date().getFullYear() - 5}</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Status Filter */}
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* City Filter */}
                  <Select value={city} onValueChange={setCity}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="City" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Cities</SelectItem>
                      <SelectItem value="Cairo">Cairo</SelectItem>
                      <SelectItem value="Alexandria">Alexandria</SelectItem>
                      <SelectItem value="Giza">Giza</SelectItem>
                      <SelectItem value="Mansoura">Mansoura</SelectItem>
                      <SelectItem value="Tanta">Tanta</SelectItem>
                      <SelectItem value="Ismailia">Ismailia</SelectItem>
                      <SelectItem value="Asyut">Asyut</SelectItem>
                      <SelectItem value="Luxor">Luxor</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Clear Advanced Filters */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setDateRange("all");
                      setCustomStartDate("");
                      setCustomEndDate("");
                      setYearFilter("all");
                      setStatus("all");
                      setCity("all");
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear
                  </Button>
                </div>
              )}

              <Button
                variant="outline"
                size="icon"
                onClick={() => refetch()}
                disabled={contactsLoading}
                className="hover-lift"
              >
                <RefreshCw className={cn("h-4 w-4", contactsLoading && "animate-spin")} />
              </Button>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2">
              <Button
                variant={isBulkMode ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setIsBulkMode(!isBulkMode);
                  setSelectedIds(new Set());
                }}
                className="hover-lift"
              >
                <CheckCheck className="mr-2 h-4 w-4" />
                {isBulkMode ? "Exit Bulk" : "Bulk Actions"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport()}
                disabled={exportingAll}
                className="hover-lift"
              >
                {exportingAll ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                )}
                Export Excel
              </Button>

              {/* Add Contact */}
              <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogTrigger asChild>
                  <Button className="hover-lift button-press">
                    <Plus className="mr-2 h-4 w-4" /> New Contact
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" /> Add New Contact
                    </DialogTitle>
                  </DialogHeader>
                  <ContactForm
                    onSuccess={() => {
                      setIsAddModalOpen(false);
                      queryClient.invalidateQueries({ queryKey: ["contacts"] });
                      queryClient.invalidateQueries({ queryKey: ["contactStats"] });
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* ── Bulk action bar ── */}
          {isBulkMode && (
            <div className="mb-4 p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={selectedIds.size === list.length && list.length > 0}
                  onCheckedChange={toggleAll}
                />
                <span className="text-sm font-medium">
                  {selectedIds.size} of {list.length} selected
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedIds.size === 0}
                  onClick={() => setBulkTagDialogOpen(true)}
                  className="hover-lift"
                >
                  <Tag className="mr-2 h-4 w-4" /> Add Tags
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={selectedIds.size === 0 || exportingAll}
                  onClick={() => handleExport(Array.from(selectedIds))}
                  className="hover-lift"
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Selected (Excel)
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selectedIds.size === 0 || bulkDeleteMutation.isPending}
                  onClick={() => {
                    if (
                      confirm(
                        `Delete ${selectedIds.size} contact${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`
                      )
                    ) {
                      bulkDeleteMutation.mutate(Array.from(selectedIds));
                    }
                  }}
                  className="hover-lift"
                >
                  {bulkDeleteMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete Selected
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setIsBulkMode(false);
                    setSelectedIds(new Set());
                  }}
                >
                  <X className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </div>
            </div>
          )}

          {/* ── Loading / Error / Empty ── */}
          {contactsLoading && (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading contacts…</span>
            </div>
          )}

          {!contactsLoading && contactsError && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <p className="text-muted-foreground text-center max-w-md">
                {(contactsRawError as any)?.response?.data?.message ||
                  (contactsRawError as any)?.message ||
                  "Failed to load contacts"}
              </p>
              <Button variant="outline" onClick={() => refetch()}>
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </div>
          )}

          {!contactsLoading && !contactsError && list.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 gap-4 text-muted-foreground">
              <Users className="h-12 w-12 opacity-30" />
              <p>No contacts match your search.</p>
              <Button onClick={() => setIsAddModalOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add First Contact
              </Button>
            </div>
          )}

          {/* ── Contact Grid ── */}
          {!contactsLoading && !contactsError && list.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {list.map((c, index) => {
                const name = getContactName(c);
                const loyaltyTier = c.loyalty_tier || "Bronze";
                const sinceYear = c.since
                  ? new Date(c.since).getFullYear()
                  : new Date().getFullYear();
                const isSelected = selectedIds.has(c.id);

                return (
                  <Card
                    key={c.id}
                    className={cn(
                      "glass-card hover-lift transition-all group relative",
                      isSelected && "ring-2 ring-primary ring-offset-2"
                    )}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {/* Bulk checkbox overlay */}
                    {isBulkMode && (
                      <div className="absolute top-4 left-4 z-10">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleOne(c.id)}
                        />
                      </div>
                    )}

                    <CardContent className={cn("space-y-4 p-5", isBulkMode && "pl-12")}>
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <Link
                          to={`/contacts/$contactId`}
                          params={{ contactId: c.id }}
                          className="flex items-center gap-3 flex-1 min-w-0"
                        >
                          <Avatar className="h-12 w-12 border-2 border-primary/20 shrink-0">
                            <AvatarFallback
                              className={cn(
                                "font-semibold text-sm",
                                c.type === "Fleet"
                                  ? "bg-purple-500/20 text-purple-700"
                                  : c.type === "Company"
                                  ? "bg-blue-500/20 text-blue-700"
                                  : "bg-green-500/20 text-green-700"
                              )}
                            >
                              {getInitials(c.first_name, c.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                              {name}
                            </p>
                            {c.company && (
                              <p className="text-sm text-muted-foreground truncate">
                                {c.company}
                              </p>
                            )}
                          </div>
                        </Link>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Badge
                            className={cn(
                              "text-xs",
                              LOYALTY_COLOR[loyaltyTier] || "bg-gray-500/20 text-gray-600"
                            )}
                            variant="secondary"
                          >
                            <Star className="h-3 w-3 mr-1" />
                            {loyaltyTier}
                          </Badge>

                          {/* Actions menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-primary/10"
                                onClick={(e) => e.preventDefault()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {/* View */}
                              <DropdownMenuItem asChild>
                                <Link to={`/contacts/$contactId`} params={{ contactId: c.id }}>
                                  <Users className="mr-2 h-4 w-4" /> View Profile
                                </Link>
                              </DropdownMenuItem>

                              {/* Edit */}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  setEditContact(c);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit Contact
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* WhatsApp */}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleSendMessage(c);
                                }}
                              >
                                <MessageSquare className="mr-2 h-4 w-4" /> WhatsApp
                              </DropdownMenuItem>

                              {/* Call */}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleCall(c);
                                }}
                              >
                                <Phone className="mr-2 h-4 w-4" /> Call
                              </DropdownMenuItem>

                              {/* Schedule appointment */}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  handleScheduleAppointment(c);
                                }}
                              >
                                <Calendar className="mr-2 h-4 w-4" /> Schedule Appointment
                              </DropdownMenuItem>

                              {/* Add vehicle */}
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  setVehicleTarget(c);
                                }}
                              >
                                <CarIcon className="mr-2 h-4 w-4" /> Add Vehicle
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              {/* Delete */}
                              <DropdownMenuItem
                                className="text-destructive focus:text-destructive"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setDeleteTarget(c);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      {/* Contact info */}
                      <div className="space-y-1.5 text-sm">
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4 text-primary/70 shrink-0" />
                          <span className="truncate">{c.email || "No email"}</span>
                        </p>
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4 text-primary/70 shrink-0" />
                          {c.phone}
                        </p>
                        <p className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4 text-primary/70 shrink-0" />
                          {c.branch?.name || "—"}
                        </p>
                      </div>

                      {/* Tags */}
                      {c.tags && c.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {c.tags.slice(0, 4).map((t: string) => (
                            <Badge key={t} variant="outline" className="text-xs bg-background/50">
                              {t}
                            </Badge>
                          ))}
                          {c.tags.length > 4 && (
                            <Badge variant="outline" className="text-xs">
                              +{c.tags.length - 4}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Footer metrics */}
                      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/50 text-center">
                        <div>
                          <div className="flex items-center justify-center gap-1 text-primary font-semibold text-sm">
                            <CarIcon className="h-3 w-3" />
                            {c.vehicles?.length ?? 0}
                          </div>
                          <p className="text-xs text-muted-foreground">Vehicles</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 font-semibold text-sm text-orange-500">
                            <AlertCircle className="h-3 w-3" />
                            {c.appointments?.length ?? 0}
                          </div>
                          <p className="text-xs text-muted-foreground">Appts</p>
                        </div>
                        <div>
                          <div className="flex items-center justify-center gap-1 text-muted-foreground font-semibold text-sm">
                            <Clock className="h-3 w-3" />
                            {sinceYear}
                          </div>
                          <p className="text-xs text-muted-foreground">Since</p>
                        </div>
                      </div>

                      {/* Account manager for Gold/Platinum */}
                      {(loyaltyTier === "Gold" || loyaltyTier === "Platinum") &&
                        c.account_manager && (
                          <div className="flex items-center gap-2 text-xs bg-primary/5 p-2 rounded-lg">
                            <Shield className="h-3 w-3 text-primary" />
                            <span className="text-muted-foreground">Manager:</span>
                            <span className="font-medium">{c.account_manager}</span>
                          </div>
                        )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </PageShell>
      </div>

      {/* ── EDIT DIALOG ── */}
      <Dialog open={!!editContact} onOpenChange={(o) => !o && setEditContact(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" /> Edit Contact
            </DialogTitle>
            <DialogDescription>
              Update the information for{" "}
              <strong>{editContact ? getContactName(editContact) : ""}</strong>
            </DialogDescription>
          </DialogHeader>
          {editContact && (
            <ContactForm
              initialData={editContact}
              onSuccess={() => {
                setEditContact(null);
                queryClient.invalidateQueries({ queryKey: ["contacts"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── DELETE CONFIRMATION DIALOG ── */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Contact</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget ? getContactName(deleteTarget) : ""}</strong>? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── ADD VEHICLE DIALOG ── */}
      <Dialog open={!!vehicleTarget} onOpenChange={(o) => !o && setVehicleTarget(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CarIcon className="h-5 w-5 text-primary" /> Add Vehicle
            </DialogTitle>
            <DialogDescription>
              Adding a vehicle for{" "}
              <strong>{vehicleTarget ? getContactName(vehicleTarget) : ""}</strong>
            </DialogDescription>
          </DialogHeader>
          {vehicleTarget && (
            <VehicleForm
              prefillContactId={vehicleTarget.id}
              initialData={{ branchId: vehicleTarget.branch_id }}
              onSuccess={() => {
                setVehicleTarget(null);
                queryClient.invalidateQueries({ queryKey: ["contacts"] });
                toast.success("Vehicle added successfully");
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── BULK TAG DIALOG ── */}
      <Dialog open={bulkTagDialogOpen} onOpenChange={setBulkTagDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" /> Add Tags
            </DialogTitle>
            <DialogDescription>
              Add tags to {selectedIds.size} selected contact
              {selectedIds.size > 1 ? "s" : ""}. Separate multiple tags with commas.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="e.g. vip, hot-lead, follow-up"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && tagInput.trim()) {
                  const tags = tagInput
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean);
                  bulkTagMutation.mutate({ ids: Array.from(selectedIds), tags });
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkTagDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!tagInput.trim() || bulkTagMutation.isPending}
              onClick={() => {
                const tags = tagInput
                  .split(",")
                  .map((t) => t.trim())
                  .filter(Boolean);
                if (tags.length === 0) return;
                bulkTagMutation.mutate({ ids: Array.from(selectedIds), tags });
              }}
            >
              {bulkTagMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Apply Tags
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
