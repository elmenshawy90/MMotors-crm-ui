import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { PageShell } from "@/components/AppTopbar";
import { AppSidebar } from "@/components/AppSidebar";
import {
  branches,
  branchName,
  contactName,
  vehicleName,
  type TicketStage,
  type TicketPriority,
  contacts,
  employees,
} from "@/lib/data";
import { useTickets, useTicket } from "@/hooks/use-api";
import apiClient from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TicketForm } from "@/components/forms/TicketForm";
import { Search, Plus, MessageSquare, Clock, User, ArrowRight, Send, Paperclip, LayoutGrid, Table as TableIcon } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/helpdesk")({
  head: () => ({
    meta: [
      { title: "Helpdesk — SIG" },
      {
        name: "description",
        content:
          "Kanban helpdesk for after-sales tickets: warranty claims, spare parts, invoicing and service complaints.",
      },
      { property: "og:title", content: "Helpdesk — SIG" },
      {
        property: "og:description",
        content: "Track after-sales tickets by stage, priority and SLA.",
      },
    ],
  }),
  component: HelpdeskPage,
});

const stages: TicketStage[] = ["New", "In Progress", "Waiting Parts", "Solved"];

const priorityClass: Record<TicketPriority, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-chart-2/20 text-foreground",
  High: "bg-chart-3/25 text-foreground",
  Urgent: "bg-destructive/10 text-destructive",
};

// Map backend priority to frontend priority
const mapPriority = (backendPriority: string): TicketPriority => {
  const priorityMap: Record<string, TicketPriority> = {
    'low': 'Low',
    'medium': 'Medium',
    'high': 'High',
    'critical': 'Urgent'
  };
  return priorityMap[backendPriority] || 'Medium';
};

// Map backend status to frontend stage
const mapStatusToStage = (backendStatus: string): TicketStage => {
  const statusMap: Record<string, TicketStage> = {
    'open': 'New',
    'in_progress': 'In Progress',
    'pending': 'Waiting Parts',
    'resolved': 'Solved',
    'closed': 'Solved'
  };
  return statusMap[backendStatus] || 'New';
};

const stageColors: Record<TicketStage, string> = {
  "New": "bg-blue-50 border-blue-200",
  "In Progress": "bg-yellow-50 border-yellow-200",
  "Waiting Parts": "bg-orange-50 border-orange-200",
  "Solved": "bg-green-50 border-green-200",
};

function HelpdeskPage() {
  const [q, setQ] = useState("");
  const [branch, setBranch] = useState("all");
  const [priority, setPriority] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [newMessage, setNewMessage] = useState("");
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" | null }>({ key: "", direction: null });

  // Fetch tickets from API
  const { data: ticketsResponse, isLoading, error, refetch } = useTickets({ branch_id: branch === "all" ? undefined : branch, priority: priority === "all" ? undefined : priority });
  const currentTickets = ticketsResponse?.data || [];

  const filteredList = useMemo(
    () =>
      currentTickets
        .filter((t: any) => {
          // Filter by branch if not already filtered by API
          if (branch !== "all" && t.branch_id !== branch) return false;
          // Filter by priority if not already filtered by API
          if (priority !== "all" && t.priority !== priority) return false;
          return true;
        })
        .filter((t: any) => {
          if (!q) return true;
          const c = contacts.find((c) => c.id === t.contactId);
          return (
            t.title?.toLowerCase().includes(q.toLowerCase()) ||
            t.ticket_number?.toLowerCase().includes(q.toLowerCase()) ||
            t.description?.toLowerCase().includes(q.toLowerCase()) ||
            c?.name.toLowerCase().includes(q.toLowerCase())
          );
        }),
    [currentTickets, branch, priority, q],
  );

  const list = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) return filteredList;
    return [...filteredList].sort((a: any, b: any) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (sortConfig.key === "customer") {
        aVal = a.requester_name || contactName(a.contactId);
        bVal = b.requester_name || contactName(b.contactId);
      } else if (sortConfig.key === "branchName") {
        aVal = branchName(a.branch_id);
        bVal = branchName(b.branch_id);
      }

      if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [filteredList, sortConfig]);

  const requestSort = (key: string) => {
    let direction: "asc" | "desc" | null = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    } else if (sortConfig.key === key && sortConfig.direction === "desc") {
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const selectedTicketData = selectedTicket ? currentTickets.find((t: any) => t.id === selectedTicket) : null;
  const selectedCustomer = selectedTicketData ? contacts.find(c => c.id === selectedTicketData.contactId) : null;
  const selectedAssignee = selectedTicketData?.assignedUser ? employees.find(e => e.name === selectedTicketData.assignedUser.name) : null;

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      // Update ticket with new message in description or create a comment
      await apiClient.updateTicket(selectedTicket, {
        description: newMessage
      });
      setNewMessage("");
      refetch(); // Refresh tickets data
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleAddLine = async () => {
    if (!selectedTicket) return;

    try {
      // Add note to ticket
      await apiClient.updateTicket(selectedTicket, {
        description: selectedTicketData?.description + "\n\nNote: Additional information added to ticket"
      });
      refetch(); // Refresh tickets data
    } catch (error) {
      console.error("Failed to add line:", error);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentTitle="Helpdesk"
      />
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
    <PageShell
      title="Helpdesk"
      subtitle="After-sales tickets by stage, priority and SLA, connected to customers, vehicles and branches."
      showTopbar={false}
    >
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search tickets by subject, ref, or customer..."
            className="pl-10 w-full md:w-[400px] bg-background"
          />
        </div>
        <div className="flex gap-3">
          <Select value={branch} onValueChange={setBranch}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Branch" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All branches</SelectItem>
              {branches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="Urgent">Urgent</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>

          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "kanban" | "table")}>
            <TabsList>
              <TabsTrigger value="kanban"><LayoutGrid className="h-4 w-4 mr-2" /> Kanban</TabsTrigger>
              <TabsTrigger value="table"><TableIcon className="h-4 w-4 mr-2" /> Excel</TabsTrigger>
            </TabsList>
          </Tabs>

          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button className="hover-lift">
                <Plus className="mr-2 h-4 w-4" /> New Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
              </DialogHeader>
              <TicketForm onSuccess={() => setIsAddModalOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Main Content Area */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading tickets...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-red-500">Error loading tickets. Please try again.</p>
            </div>
          ) : viewMode === "kanban" ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              {stages.map((stage) => {
                const items = list.filter((t: any) => mapStatusToStage(t.status) === stage);
                return (
                  <section key={stage} className={`rounded-2xl p-4 border ${stageColors[stage]} tile-shadow backdrop-blur-sm`}>
                    <header className="mb-3 flex items-center justify-between px-1">
                      <h2 className="text-sm font-semibold tracking-wide uppercase">
                        {stage}
                      </h2>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium">
                        {items.length}
                      </span>
                    </header>
                    <div className="space-y-3">
                      {items.map((t) => (
                        <div
                          key={t.id}
                          onClick={() => setSelectedTicket(t.id)}
                          className={`cursor-pointer block outline-none ring-primary focus-visible:ring-2 rounded-xl transition-all ${selectedTicket === t.id ? 'ring-2 ring-primary' : ''}`}
                        >
                          <Card className={`hover-lift transition-all ${selectedTicket === t.id ? 'bg-white' : 'bg-white/80'}`}>
                            <CardContent className="space-y-2 p-4">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-mono text-muted-foreground">{t.ticket_number}</span>
                                <Badge className={priorityClass[mapPriority(t.priority)]} variant="secondary">
                                  {mapPriority(t.priority)}
                                </Badge>
                              </div>
                              <p className="text-sm leading-snug font-semibold text-foreground group-hover:text-primary transition-colors">
                                {t.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {t.requester_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-muted-foreground">{branchName(t.branch_id)}</p>
                              <div className="flex justify-between border-t border-border/50 pt-2 mt-2 text-xs text-muted-foreground">
                                <span>{t.assignedUser?.first_name + ' ' + t.assignedUser?.last_name || 'Unassigned'}</span>
                                <span className="font-medium text-primary">{t.category}</span>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      ))}
                      {items.length === 0 && (
                        <p className="px-1 py-6 text-center text-xs text-muted-foreground">No tickets</p>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border bg-white shadow-sm tile-shadow overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                      <TableHead className="font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => requestSort("ticket_number")}>
                        Ref {sortConfig.key === "ticket_number" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="font-semibold cursor-pointer select-none whitespace-nowrap min-w-[200px]" onClick={() => requestSort("title")}>
                        Subject {sortConfig.key === "title" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => requestSort("customer")}>
                        Customer {sortConfig.key === "customer" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => requestSort("vehicle")}>
                        Vehicle {sortConfig.key === "vehicle" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => requestSort("branchName")}>
                        Branch {sortConfig.key === "branchName" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => requestSort("status")}>
                        Stage {sortConfig.key === "status" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => requestSort("priority")}>
                        Priority {sortConfig.key === "priority" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => requestSort("assignee")}>
                        Assignee {sortConfig.key === "assignee" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </TableHead>
                      <TableHead className="font-semibold cursor-pointer select-none whitespace-nowrap" onClick={() => requestSort("created_at")}>
                        Opened {sortConfig.key === "created_at" && (sortConfig.direction === "asc" ? "↑" : "↓")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {list.map((t) => (
                      <TableRow
                        key={t.id}
                        onClick={() => setSelectedTicket(t.id)}
                        className={`cursor-pointer transition-colors hover:bg-muted/50 ${selectedTicket === t.id ? 'bg-muted' : ''}`}
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground">{t.ticket_number}</TableCell>
                        <TableCell className="font-medium text-sm">{t.title}</TableCell>
                        <TableCell className="text-sm">{t.requester_name || 'Unknown'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">-</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{branchName(t.branch_id)}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stageColors[mapStatusToStage(t.status)].replace('bg-', 'bg-').replace('50', '100')} text-gray-800`}>
                            {mapStatusToStage(t.status)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge className={priorityClass[mapPriority(t.priority)]} variant="secondary">
                            {mapPriority(t.priority)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{t.assignedUser?.first_name + ' ' + t.assignedUser?.last_name || 'Unassigned'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{t.created_at?.split('T')[0] || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {list.length === 0 && !isLoading && (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                          No tickets found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>

        {/* Helpdesk Info Panel */}
        <div className="lg:col-span-1">
          <Card className="border-gray-200 bg-white sticky top-4">
            <CardContent className="p-4">
              {selectedTicketData ? (
                <div className="space-y-4">
                  {/* Ticket Header */}
                  <div className="pb-3 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{selectedTicketData.ticket_number}</h3>
                      <Badge className={priorityClass[mapPriority(selectedTicketData.priority)]} variant="secondary">
                        {mapPriority(selectedTicketData.priority)}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{selectedTicketData.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock className="w-3 h-3" />
                      <span>Opened: {selectedTicketData.created_at?.split('T')[0] || '-'}</span>
                    </div>
                  </div>

                  {/* From/To */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">From</p>
                        <p className="font-medium text-gray-900">{selectedTicketData.requester_name || 'Unknown'}</p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-gray-500">To</p>
                        <p className="font-medium text-gray-900">{selectedTicketData.assignedUser?.first_name + ' ' + selectedTicketData.assignedUser?.last_name || 'Unassigned'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Customer Info */}
                  {selectedTicketData.requester_name && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">{selectedTicketData.requester_name.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{selectedTicketData.requester_name}</p>
                          <p className="text-xs text-gray-500">Requester</p>
                        </div>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        {selectedTicketData.requester_phone && <p>📞 {selectedTicketData.requester_phone}</p>}
                        {selectedTicketData.requester_email && <p>📧 {selectedTicketData.requester_email}</p>}
                      </div>
                    </div>
                  )}

                  {/* Assignee Info */}
                  {selectedTicketData.assignedUser && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-purple-600">{selectedTicketData.assignedUser.first_name?.charAt(0)}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{selectedTicketData.assignedUser.first_name + ' ' + selectedTicketData.assignedUser.last_name}</p>
                          <p className="text-xs text-gray-500">Assigned User</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Timeline/Messages */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Description
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      <div className="p-2 bg-gray-50 rounded border border-gray-200">
                        <p className="text-xs text-gray-600 whitespace-pre-wrap">{selectedTicketData.description || 'No description'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Add Line Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={handleAddLine}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add a line
                  </Button>

                  {/* Message Input */}
                  <div className="space-y-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="min-h-[80px] border-gray-300 text-sm"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={handleSendMessage}
                        disabled={!newMessage.trim()}
                      >
                        <Send className="w-3 h-3 mr-1" />
                        Send
                      </Button>
                      <Button variant="outline" size="sm">
                        <Paperclip className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Ticket Details */}
                  <div className="pt-3 border-t border-gray-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Category:</span>
                      <span className="font-medium">{selectedTicketData.category || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className="font-medium">{mapStatusToStage(selectedTicketData.status)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Branch:</span>
                      <span className="font-medium">{branchName(selectedTicketData.branch_id)}</span>
                    </div>
                    {selectedTicketData.due_date && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Due Date:</span>
                        <span className="font-medium">{selectedTicketData.due_date.split('T')[0]}</span>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">Select a ticket to view details</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
      </div>
    </div>
  );
}
