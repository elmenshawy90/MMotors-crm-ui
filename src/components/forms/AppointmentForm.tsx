import React, { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CustomerVehicle } from "@/lib/data";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Plus, Car as CarIcon, Clock, DollarSign, Briefcase, Loader2, UserPlus, Calendar, Search, X } from "lucide-react";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { ContactForm } from "@/components/forms/ContactForm";
import { DayPicker } from "react-day-picker";
import { format, addDays, startOfWeek, endOfWeek, isSameDay } from "date-fns";
import "react-day-picker/dist/style.css";

// Define Appointment interface based on API response
interface Appointment {
  id: string;
  title?: string;
  contactId?: string;
  companyId?: string;
  branchId?: string;
  kind?: string;
  subServices?: string[];
  duration?: number;
  preBookingTime?: number;
  chassisNumber?: string;
  licensePlate?: string;
  customerVehicleId?: string;
  date?: string;
  time?: string;
  advisor?: string;
  serviceAdvisors?: string[];
  bookingInfo?: string;
  status?: string;
  cancellationReason?: string;
}

const appointmentSchema = z.object({
  title: z.string().optional(),
  contactId: z.string().min(1, "Please select a customer"),
  companyId: z.string().optional(),
  branchId: z.string().min(1, "Please select a branch"),
  kind: z.enum(["Test Drive", "Periodic Service", "Repair", "Delivery", "Inspection"]).or(z.string()),
  subServices: z.array(z.string()).optional(),
  duration: z.number().optional(),
  preBookingTime: z.number().optional(),
  chassisNumber: z.string().optional(),
  licensePlate: z.string().optional(),
  customerVehicleId: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  advisor: z.string().min(1, "Advisor name is required"),
  serviceAdvisors: z.array(z.string()).optional(),
  bookingInfo: z.string().optional(),
  status: z.enum(["Confirmed", "Pending", "Completed", "Cancelled"]).or(z.string()),
  cancellationReason: z.string().optional(),
  regardingCategory: z.string().optional(),
  regardingSubCategory: z.string().optional(),
  regardingTicketId: z.string().optional(),
});

type AppointmentFormValues = z.infer<typeof appointmentSchema>;

interface AppointmentFormProps {
  initialData?: Appointment;
  onSuccess: () => void;
  onCustomerSelect?: (customerId: string) => void;
  onBranchSelect?: (branchId: string) => void;
}

// Mapping functions
const mapStatusToBackend = (status: string): string => {
  const mapping: Record<string, string> = {
    "Confirmed": "confirmed",
    "Pending": "scheduled",
    "Completed": "completed",
    "Cancelled": "cancelled"
  };
  return mapping[status] || "scheduled";
};

const mapStatusToFrontend = (status: string): "Confirmed" | "Pending" | "Completed" | "Cancelled" => {
  const mapping: Record<string, "Confirmed" | "Pending" | "Completed" | "Cancelled"> = {
    "confirmed": "Confirmed",
    "scheduled": "Pending",
    "in_progress": "Pending",
    "completed": "Completed",
    "cancelled": "Cancelled",
    "no_show": "Cancelled"
  };
  return mapping[status] || "Pending";
};

const mapTypeToBackend = (kind: string): string => {
  const mapping: Record<string, string> = {
    "Test Drive": "test_drive",
    "Periodic Service": "service",
    "Repair": "service",
    "Delivery": "delivery",
    "Inspection": "consultation"
  };
  return mapping[kind] || "other";
};

const mapTypeToFrontend = (type: string): "Test Drive" | "Periodic Service" | "Repair" | "Delivery" | "Inspection" => {
  const mapping: Record<string, "Test Drive" | "Periodic Service" | "Repair" | "Delivery" | "Inspection"> = {
    "test_drive": "Test Drive",
    "service": "Periodic Service",
    "delivery": "Delivery",
    "consultation": "Inspection",
    "pickup": "Delivery",
    "other": "Periodic Service"
  };
  return mapping[type] || "Periodic Service";
};

// ─── Searchable Ticket Select ─────────────────────────────────────────────────
function TicketSearchSelect({
  tickets,
  value,
  onChange,
  placeholder = "Select ticket",
}: {
  tickets: any[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = tickets.filter((t: any) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (
      (t.title || "").toLowerCase().includes(s) ||
      (t.id || "").toLowerCase().includes(s) ||
      (t.category || "").toLowerCase().includes(s) ||
      (t.status || "").toLowerCase().includes(s) ||
      (t.requester_name || "").toLowerCase().includes(s)
    );
  });

  const selected = tickets.find((t: any) => t.id === value);

  return (
    <Select
      value={value}
      onValueChange={(v) => { onChange(v); setQ(""); }}
    >
      <SelectTrigger className="border-gray-300">
        <SelectValue placeholder={placeholder}>
          {selected
            ? `#${selected.id?.slice(-6) || selected.id} — ${selected.title || "Untitled"}`
            : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="p-0">
        {/* Sticky search bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border sticky top-0 bg-background z-10">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, ID, category…"
            className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
            onKeyDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(""); inputRef.current?.focus(); }}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Results list */}
        <div className="max-h-56 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              No tickets found
            </p>
          ) : (
            filtered.map((t: any) => (
              <SelectItem key={t.id} value={t.id} className="py-2">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium text-sm">
                    #{t.id?.slice(-6) || t.id}{" "}
                    <span className="font-normal">{t.title || "Untitled"}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {[t.category, t.status, t.requester_name].filter(Boolean).join(" · ")}
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

// ─── Searchable Customer Select ───────────────────────────────────────────────
function CustomerSearchSelect({
  contacts,
  value,
  onChange,
  placeholder = "Select customer",
}: {
  contacts: any[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = contacts.filter((c: any) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    const name = `${c.first_name || ""} ${c.last_name || ""}`.toLowerCase();
    return (
      name.includes(s) ||
      (c.phone  || "").toLowerCase().includes(s) ||
      (c.mobile || "").toLowerCase().includes(s) ||
      (c.email  || "").toLowerCase().includes(s) ||
      (c.company|| "").toLowerCase().includes(s)
    );
  });

  const selected = contacts.find((c: any) => c.id === value);

  return (
    <Select
      value={value}
      onValueChange={(v) => { onChange(v); setQ(""); }}
    >
      <SelectTrigger className="border-gray-300">
        <SelectValue placeholder={placeholder}>
          {selected
            ? `${selected.first_name} ${selected.last_name}${selected.company ? ` (${selected.company})` : ""}`
            : placeholder}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="p-0">
        {/* Sticky search bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border sticky top-0 bg-background z-10">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, email…"
            className="flex-1 text-xs bg-transparent outline-none placeholder:text-muted-foreground min-w-0"
            onKeyDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          />
          {q && (
            <button
              type="button"
              onClick={() => { setQ(""); inputRef.current?.focus(); }}
              className="text-muted-foreground hover:text-foreground shrink-0"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* Results list */}
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
                    {c.company && (
                      <span className="text-muted-foreground font-normal ml-1">({c.company})</span>
                    )}
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

export function AppointmentForm({ initialData, onSuccess, onCustomerSelect, onBranchSelect }: AppointmentFormProps) {
  const queryClient = useQueryClient();
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("");
  const [showNewContactDialog, setShowNewContactDialog] = useState(false);
  const [showAddVehicleDialog, setShowAddVehicleDialog] = useState(false);
  const [newVehicleData, setNewVehicleData] = useState({
    modelId: "",
    vin: "",
    licensePlate: "",
    purchaseDate: "",
    warrantyExpiry: "",
    mileage: 0,
  });
  const [regardingCategory, setRegardingCategory] = useState("");
  const [regardingSubCategory, setRegardingSubCategory] = useState("");
  const [calendarDate, setCalendarDate] = useState<Date | undefined>(new Date());

  // Initialize form
  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: initialData?.title || "",
      contactId: initialData?.contactId || "",
      companyId: initialData?.companyId || "",
      branchId: initialData?.branchId || "",
      kind: initialData?.kind || "Periodic Service",
      subServices: initialData?.subServices || [],
      duration: initialData?.duration || 60,
      preBookingTime: initialData?.preBookingTime || 0,
      chassisNumber: initialData?.chassisNumber || "",
      licensePlate: initialData?.licensePlate || "",
      customerVehicleId: initialData?.customerVehicleId || "",
      date: initialData?.date || new Date().toISOString().split("T")[0],
      time: initialData?.time || "09:00",
      advisor: initialData?.advisor || "",
      serviceAdvisors: initialData?.serviceAdvisors || [],
      bookingInfo: initialData?.bookingInfo || "",
      status: initialData?.status || "Pending",
      cancellationReason: initialData?.cancellationReason || "",
      regardingCategory: initialData?.regardingCategory || "",
      regardingSubCategory: initialData?.regardingSubCategory || "",
      regardingTicketId: "",
    },
  });

  // Watch form values for API queries
  const selectedDate = form.watch("date");

  // Fetch contacts from API
  const { data: contactsResponse, isLoading: contactsLoading } = useQuery({
    queryKey: ['contacts'],
    queryFn: async () => {
      return await apiClient.getContacts();
    },
  });

  // Fetch companies from API
  const { data: companiesResponse } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      return await apiClient.getCompanies();
    },
  });

  // Fetch branches from API (fetch all branches)
  const { data: branchesResponse, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: async () => {
      return await apiClient.getBranches();
    },
  });

  const contactsData = contactsResponse?.data || [];
  const allBranchesData = branchesResponse?.data || [];
  const companiesData = companiesResponse?.data || [];

  // Filter branches client-side based on selected company
  const branchesData = selectedCompanyId 
    ? allBranchesData.filter((b: any) => b.company_id === selectedCompanyId || b.companyId === selectedCompanyId)
    : allBranchesData;

  // Fetch vehicles for selected customer
  const { data: vehiclesResponse, isLoading: vehiclesLoading } = useQuery({
    queryKey: ['vehicles', selectedCustomerId],
    queryFn: async () => {
      if (!selectedCustomerId) return { data: [] };
      const response = await apiClient.getVehicles({ owner_id: selectedCustomerId });
      return response;
    },
    enabled: !!selectedCustomerId,
  });

  const customerVehicles = vehiclesResponse?.data || [];

  // Fetch employees for selected branch
  const { data: employeesResponse, isLoading: employeesLoading } = useQuery({
    queryKey: ['employees', selectedBranchId],
    queryFn: async () => {
      if (!selectedBranchId) return { data: [] };
      const response = await apiClient.getEmployees({ branch_id: selectedBranchId, status: 'active' });
      return response;
    },
    enabled: !!selectedBranchId,
  });

  const branchEmployees = employeesResponse?.data || [];

  // Fetch tickets for categories
  const { data: ticketsResponse } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      try {
        return await apiClient.getTickets();
      } catch (error) {
        console.error('Error fetching tickets:', error);
        return { data: [] };
      }
    },
  });

  const tickets = ticketsResponse?.data || [];

  // Mutation to create ticket from appointment
  const createTicketMutation = useMutation({
    mutationFn: async (ticketData: any) => {
      return await apiClient.createTicket(ticketData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success("Ticket created successfully from appointment");
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create ticket");
    },
  });

  // Watch form values for time slot generation
  const selectedAdvisor = form.watch("advisor");

  // Fetch existing appointments for conflict checking
  const { data: appointmentsResponse, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['appointments', selectedBranchId, selectedDate, selectedAdvisor],
    queryFn: async () => {
      if (!selectedBranchId || !selectedDate) return { data: [] };
      try {
        const response = await apiClient.getAppointments({
          branch_id: selectedBranchId,
          date_from: selectedDate,
          date_to: selectedDate
        });
        return response;
      } catch (error) {
        console.error('Error fetching appointments:', error);
        return { data: [] };
      }
    },
    enabled: !!selectedBranchId && !!selectedDate,
  });

  const existingAppointments = appointmentsResponse?.data || [];

  // Create appointment mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiClient.createAppointment(data);
    },
    onSuccess: async (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("Appointment created successfully");
      
      // Create ticket if regarding category is 'ticket'
      if (variables.regarding_category === 'ticket') {
        const formValues = form.getValues();
        const customerName = formValues.title || 
          (selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : 'Unknown');
        const branchName = branchesData?.data?.find((b: any) => b.id === variables.branch_id)?.name || 'Unknown';
        const vehicleInfo = customerVehicles.find((v: any) => v.id === variables.vehicle_id);
        
        const ticketData = {
          title: `Appointment: ${customerName} - ${formValues.kind}`,
          branch_id: variables.branch_id,
          priority: 'medium',
          category: variables.regarding_sub_category || 'general',
          requester_name: customerName,
          requester_email: selectedCustomer?.email || '',
          requester_phone: selectedCustomer?.phone || '',
          description: `Appointment Details:\n` +
            `Date: ${variables.appointment_date}\n` +
            `Time: ${variables.appointment_time}\n` +
            `Service Type: ${formValues.kind}\n` +
            `Advisor: ${variables.advisor}\n` +
            `Branch: ${branchName}\n` +
            `Notes: ${variables.notes || 'No additional notes'}\n` +
            `Vehicle: ${vehicleInfo?.license_plate || vehicleInfo?.licensePlate || 'Not specified'}`,
        };
        createTicketMutation.mutate(ticketData);
      }
      
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to create appointment");
    },
  });

  // Update appointment mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      return await apiClient.updateAppointment(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      toast.success("Appointment updated successfully");
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update appointment");
    },
  });

  // Regarding To categories
  const regardingCategories = [
    { value: "ticket", label: "Tickets" },
    { value: "vehicle", label: "Vehicle Issues" },
    { value: "general", label: "General Inquiry" },
    { value: "other", label: "Other" },
  ];

  const getSubCategories = (category: string) => {
    switch (category) {
      case "ticket":
        return [...new Set(tickets.map((t: any) => t.category || t.type || "General"))].map((cat) => ({
          value: cat,
          label: cat,
        }));
      case "vehicle":
        return [
          { value: "maintenance", label: "Maintenance" },
          { value: "repair", label: "Repair" },
          { value: "inspection", label: "Inspection" },
          { value: "parts", label: "Parts" },
        ];
      case "general":
        return [
          { value: "information", label: "Information" },
          { value: "consultation", label: "Consultation" },
          { value: "feedback", label: "Feedback" },
        ];
      default:
        return [];
    }
  };

  const subCategories = getSubCategories(regardingCategory);

  // Auto-set title to customer name when customer is selected
  const watchedContactId = form.watch("contactId");
  useEffect(() => {
    if (watchedContactId) {
      setSelectedCustomerId(watchedContactId);
      const customer = contactsData.find((c: any) => c.id === watchedContactId);
      if (customer) {
        const customerName = `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        form.setValue("title", customerName || customer.company || "");
        if (onCustomerSelect) {
          onCustomerSelect(watchedContactId);
        }
      }
    }
  }, [watchedContactId, contactsData, form, onCustomerSelect]);

  // Notify parent when branch is selected
  const watchedBranchId = form.watch("branchId");
  useEffect(() => {
    if (watchedBranchId) {
      setSelectedBranchId(watchedBranchId);
      if (onBranchSelect) {
        onBranchSelect(watchedBranchId);
      }
    }
  }, [watchedBranchId, onBranchSelect]);

  // Clear time when advisor changes
  const watchedAdvisor = form.watch("advisor");
  useEffect(() => {
    form.setValue("time", "");
  }, [watchedAdvisor, form]);

  // Get selected customer details
  const selectedCustomer = selectedCustomerId && contactsData.length > 0
    ? contactsData.find((c: any) => c.id === selectedCustomerId)
    : null;

  // branchEmployees already filtered by branch_id in the query, no need to filter again
  const filteredBranchEmployees = branchEmployees;

  const generateTimeSlots = (specificAdvisor?: string) => {
    const slots = [];
    const targetAdvisor = specificAdvisor || selectedAdvisor;

    // Show loading state if appointments are being fetched
    if (appointmentsLoading) {
      return [];
    }

    // Get the day of the week for the selected date
    const selectedDateObj = new Date(selectedDate + 'T00:00:00');
    const dayIndex = selectedDateObj.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[dayIndex];

    // Get employees to generate slots for
    const employeesToProcess = targetAdvisor
      ? branchEmployees.filter((e: any) =>
          `${e.first_name} ${e.last_name}`.trim() === targetAdvisor ||
          e.name === targetAdvisor
        )
      : branchEmployees;

    // Generate slots for each employee
    employeesToProcess.forEach((employee: any) => {
      const advisorSchedule = employee?.schedule;
      const slotDuration = employee?.slot_duration || employee?.slotDuration || 15;
      const employeeName = `${employee.first_name} ${employee.last_name}`.trim() || employee.name;

      // Get the working hours for the selected day
      const daySchedule = advisorSchedule?.[dayOfWeek as keyof NonNullable<typeof advisorSchedule>];

      if (!daySchedule) {
        return;
      }

      const startHour = parseInt(daySchedule.start.split(':')[0]);
      const startMinute = parseInt(daySchedule.start.split(':')[1]);
      const endHour = parseInt(daySchedule.end.split(':')[0]);
      const endMinute = parseInt(daySchedule.end.split(':')[1]);

      // Generate time slots based on the employee's schedule
      let currentHour = startHour;
      let currentMinute = startMinute;

      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        const newEndMinute = currentMinute + slotDuration;
        const endHourFormatted = newEndMinute === 60 ? currentHour + 1 : currentHour;
        const endMinuteFormatted = newEndMinute === 60 ? '00' : newEndMinute.toString().padStart(2, '0');
        const endTime = `${endHourFormatted.toString().padStart(2, '0')}:${endMinuteFormatted}`;

        const slotEndTime = new Date();
        slotEndTime.setHours(endHourFormatted, endMinuteFormatted);
        const workEndTime = new Date();
        workEndTime.setHours(endHour, endMinute);

        if (slotEndTime > workEndTime) {
          break;
        }

        // Check if this slot is already booked for this employee
        const isBooked = existingAppointments.some(
          (apt: any) => {
            const appointmentAdvisor = apt.advisor;
            const appointmentDate = apt.appointment_date;
            const appointmentTime = apt.appointment_time;
            const appointmentStatus = apt.status;

            // Normalize date for comparison (extract date part from ISO format)
            const normalizedAppointmentDate = appointmentDate ? appointmentDate.split('T')[0] : '';

            // Map backend status to frontend status for comparison
            const isCancelled = appointmentStatus === 'cancelled' || appointmentStatus === 'no_show';

            return appointmentAdvisor === employeeName &&
                   normalizedAppointmentDate === selectedDate &&
                   appointmentTime === startTime &&
                   !isCancelled;
          }
        );

        // Only add slot if it's available (not booked)
        if (!isBooked) {
          // Check if this time slot already exists
          const existingSlot = slots.find(s => s.startTime === startTime);
          if (!existingSlot) {
            slots.push({
              startTime,
              endTime,
              available: true,
              availableAdvisors: targetAdvisor ? [employeeName] : [employeeName]
            });
          } else {
            // Add this advisor to the existing slot
            if (!existingSlot.availableAdvisors.includes(employeeName)) {
              existingSlot.availableAdvisors.push(employeeName);
            }
          }
        }

        // Move to next slot
        currentMinute += slotDuration;
        if (currentMinute >= 60) {
          currentMinute = 0;
          currentHour++;
        }
      }
    });

    // Sort slots by time
    return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const availableTimeSlots = generateTimeSlots();

  // Get available time slots for a specific date
  const getTimeSlotsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const slots = [];

    // Get the day of the week for the selected date
    const dayIndex = date.getDay();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const dayOfWeek = dayNames[dayIndex];

    // Get employees to generate slots for
    const employeesToProcess = selectedAdvisor
      ? branchEmployees.filter((e: any) =>
          `${e.first_name} ${e.last_name}`.trim() === selectedAdvisor ||
          e.name === selectedAdvisor
        )
      : branchEmployees;

    // Generate slots for each employee
    employeesToProcess.forEach((employee: any) => {
      const advisorSchedule = employee?.schedule;
      const slotDuration = employee?.slot_duration || employee?.slotDuration || 15;
      const employeeName = `${employee.first_name} ${employee.last_name}`.trim() || employee.name;

      // Get the working hours for the selected day
      const daySchedule = advisorSchedule?.[dayOfWeek as keyof NonNullable<typeof advisorSchedule>];

      if (!daySchedule) {
        return;
      }

      const startHour = parseInt(daySchedule.start.split(':')[0]);
      const startMinute = parseInt(daySchedule.start.split(':')[1]);
      const endHour = parseInt(daySchedule.end.split(':')[0]);
      const endMinute = parseInt(daySchedule.end.split(':')[1]);

      // Generate time slots based on the employee's schedule
      let currentHour = startHour;
      let currentMinute = startMinute;

      while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
        const startTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
        const newEndMinute = currentMinute + slotDuration;
        const endHourFormatted = newEndMinute === 60 ? currentHour + 1 : currentHour;
        const endMinuteFormatted = newEndMinute === 60 ? '00' : newEndMinute.toString().padStart(2, '0');
        const endTime = `${endHourFormatted.toString().padStart(2, '0')}:${endMinuteFormatted}`;

        const slotEndTime = new Date();
        slotEndTime.setHours(endHourFormatted, endMinuteFormatted);
        const workEndTime = new Date();
        workEndTime.setHours(endHour, endMinute);

        if (slotEndTime > workEndTime) {
          break;
        }

        // Check if this slot is already booked for this employee on this date
        const isBooked = existingAppointments.some(
          (apt: any) => {
            const appointmentAdvisor = apt.advisor;
            const appointmentDate = apt.appointment_date;
            const appointmentTime = apt.appointment_time;
            const appointmentStatus = apt.status;

            // Normalize date for comparison (extract date part from ISO format)
            const normalizedAppointmentDate = appointmentDate ? appointmentDate.split('T')[0] : '';

            // Map backend status to frontend status for comparison
            const isCancelled = appointmentStatus === 'cancelled' || appointmentStatus === 'no_show';

            return appointmentAdvisor === employeeName &&
                   normalizedAppointmentDate === dateStr &&
                   appointmentTime === startTime &&
                   !isCancelled;
          }
        );

        // Only add slot if it's available (not booked)
        if (!isBooked) {
          const existingSlot = slots.find(s => s.startTime === startTime);
          if (!existingSlot) {
            slots.push({
              startTime,
              endTime,
              available: true,
              availableAdvisors: selectedAdvisor ? [employeeName] : [employeeName]
            });
          } else {
            if (!existingSlot.availableAdvisors.includes(employeeName)) {
              existingSlot.availableAdvisors.push(employeeName);
            }
          }
        }

        // Move to next slot
        currentMinute += slotDuration;
        if (currentMinute >= 60) {
          currentMinute = 0;
          currentHour++;
        }
      }
    });

    // Sort slots by time
    return slots.sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  // Handle date selection from calendar
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setCalendarDate(date);
      form.setValue("date", format(date, 'yyyy-MM-dd'));
    }
  };

  const handleAddVehicle = () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer first");
      return;
    }
    if (!newVehicleData.modelId || !newVehicleData.vin || !newVehicleData.licensePlate) {
      toast.error("Please fill in required vehicle fields");
      return;
    }

    const newVehicle: CustomerVehicle = {
      id: `cv${Date.now()}`,
      modelId: newVehicleData.modelId,
      vin: newVehicleData.vin,
      licensePlate: newVehicleData.licensePlate,
      purchaseDate: newVehicleData.purchaseDate || new Date().toISOString().split("T")[0],
      warrantyExpiry: newVehicleData.warrantyExpiry || "",
      mileage: newVehicleData.mileage || 0,
    };

    if (selectedCustomer.customerVehicles) {
      selectedCustomer.customerVehicles.push(newVehicle);
    } else {
      selectedCustomer.customerVehicles = [newVehicle];
    }

    toast.success("New vehicle added to customer");
      
    // Reset form
    setNewVehicleData({
      modelId: "",
      vin: "",
      licensePlate: "",
      purchaseDate: "",
      warrantyExpiry: "",
      mileage: 0,
    });
  };

  function onSubmit(data: AppointmentFormValues) {
    // Guard: customer_name and customer_phone are required by the backend
    const customerName = data.title?.trim() ||
      (selectedCustomer ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`.trim() : "");
    const customerPhone = selectedCustomer?.phone?.trim() || selectedCustomer?.mobile?.trim() || "";

    if (!customerName) {
      toast.error("Customer name is required — please select a customer");
      return;
    }
    if (!customerPhone) {
      toast.error("Customer phone is required — the selected contact has no phone number");
      return;
    }

    // Transform form data to backend format
    const appointmentPayload = {
      company_id: data.companyId || null,
      branch_id: data.branchId,
      contact_id: data.contactId,
      vehicle_id: data.customerVehicleId || null,
      type: mapTypeToBackend(data.kind),
      status: mapStatusToBackend(data.status),
      appointment_date: data.date,
      appointment_time: data.time,
      duration_minutes: data.duration || 60,
      notes: data.bookingInfo || null,
      advisor: data.advisor,
      customer_name: customerName,
      customer_phone: customerPhone,
      // send null for email if empty — backend isEmail validator rejects ""
      customer_email: selectedCustomer?.email?.trim() || null,
      cancellation_reason: data.cancellationReason || null,
      regarding_category: data.regardingCategory || null,
      regarding_sub_category: data.regardingSubCategory || null,
      regarding_ticket_id: data.regardingTicketId || null,
    };

    if (initialData) {
      updateMutation.mutate({ id: initialData.id, data: appointmentPayload });
    } else {
      createMutation.mutate(appointmentPayload);
    }
  }

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const isLoading = contactsLoading || branchesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3">
        {/* Basic Information Section */}
        <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Basic Information</h3>
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Title</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Auto-filled from customer" 
                      className="border-gray-300 bg-gray-50"
                      {...field} 
                      readOnly
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
              
            <FormField
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Customer</FormLabel>
                  <div className="flex gap-1.5">
                    <CustomerSearchSelect
                      contacts={contactsData || []}
                      value={field.value}
                      onChange={field.onChange}
                    />
                    {/* ── Add new contact button ── */}
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="shrink-0 h-9 w-9 border-gray-300 text-primary hover:bg-primary/10 hover:border-primary"
                      title="Add new customer"
                      onClick={() => setShowNewContactDialog(true)}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Customer Details */}
          {selectedCustomer && (
            <div className="p-2 bg-gray-50 rounded border border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Type:</span>
                  <span className="ml-1 font-medium">{selectedCustomer.type}</span>
                </div>
                <div>
                  <span className="text-gray-500">Branch:</span>
                  <span className="ml-1 font-medium">
                    {branchesData?.find((b: any) => b.id === selectedCustomer.branch_id)?.name || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Credit Limit:</span>
                  <span className="ml-1 font-medium">{selectedCustomer.credit_limit || 0} EGP</span>
                </div>
                <div>
                  <span className="text-gray-500">Vehicles:</span>
                  <span className="ml-1 font-medium">{customerVehicles.length}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Service Details Section */}
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Service Details</h3>
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="kind"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Service Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Test Drive">Test Drive</SelectItem>
                      <SelectItem value="Periodic Service">Periodic Service</SelectItem>
                      <SelectItem value="Repair">Repair</SelectItem>
                      <SelectItem value="Delivery">Delivery</SelectItem>
                      <SelectItem value="Inspection">Inspection</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Brand / Company</FormLabel>
                  <Select onValueChange={(value) => {
                    const realValue = value === "__all__" ? "" : value;
                    field.onChange(realValue);
                    setSelectedCompanyId(realValue);
                    form.setValue("branchId", "", { shouldValidate: false });
                    setSelectedBranchId("");
                  }} value={field.value || "__all__"}>
                    <FormControl>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Select brand" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__all__">All Brands</SelectItem>
                      {companiesData?.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="branchId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Branch</FormLabel>
                  <Select
                    key={selectedCompanyId}
                    onValueChange={field.onChange}
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {branchesData?.map((b: any) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="subServices"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Sub Services</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Comma separated" 
                    className="border-gray-300"
                    {...field}
                    value={field.value?.join(", ") || ""}
                    onChange={(e) => field.onChange(e.target.value.split(", ").filter(Boolean))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Regarding To Section */}
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Regarding To</h3>
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="regardingCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Category</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    setRegardingCategory(value);
                    setRegardingSubCategory("");
                    form.setValue("regardingSubCategory", "");
                    form.setValue("regardingTicketId", "");
                  }} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {regardingCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="regardingSubCategory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">
                    {regardingCategory === "ticket" ? "Select Ticket" : "Sub Category"}
                  </FormLabel>

                  {regardingCategory === "ticket" ? (
                    // ── Ticket picker ──
                    <TicketSearchSelect
                      tickets={tickets}
                      value={form.watch("regardingTicketId") || ""}
                      onChange={(id) => {
                        form.setValue("regardingTicketId", id);
                        // also store the ticket id as subCategory so the payload carries it
                        field.onChange(id);
                        setRegardingSubCategory(id);
                      }}
                      placeholder="Search and select a ticket…"
                    />
                  ) : (
                    // ── Normal sub-category dropdown ──
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        setRegardingSubCategory(value);
                      }}
                      value={field.value}
                      disabled={!regardingCategory}
                    >
                      <FormControl>
                        <SelectTrigger className="border-gray-300">
                          <SelectValue
                            placeholder={
                              regardingCategory ? "Select sub category" : "Select category first"
                            }
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subCategories.length > 0 ? (
                          subCategories.map((sub) => (
                            <SelectItem key={sub.value} value={sub.value}>
                              {sub.label}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-center text-xs text-muted-foreground">
                            No sub categories available
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  )}

                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Timing Section */}
        <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Timing</h3>
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Duration (min)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      className="border-gray-300"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="preBookingTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Pre-booking (hrs)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      className="border-gray-300"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Date</FormLabel>
                  <FormControl>
                    <Input 
                      type="date" 
                      className="border-gray-300"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="time"
              render={({ field}) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Time</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Select time" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableTimeSlots.length > 0 ? (
                        availableTimeSlots.map((slot: any) => (
                          <SelectItem key={slot.startTime} value={slot.startTime}>
                            <div className="flex items-center gap-2">
                              <Clock className="w-3 h-3" />
                              <span>{slot.startTime}</span>
                              {!selectedAdvisor && slot.availableAdvisors && slot.availableAdvisors.length > 0 && (
                                <span className="text-xs text-gray-500">
                                  ({slot.availableAdvisors.length} advisor{slot.availableAdvisors.length > 1 ? 's' : ''})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-2 text-center text-xs text-gray-500">
                          {selectedBranchId
                            ? selectedAdvisor
                              ? "No available time slots for this advisor"
                              : "No available time slots for any advisor"
                            : "Select a branch first"}
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Vehicle Information Section */}
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Vehicle</h3>
            {selectedCustomer && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddVehicleDialog(true)}
                className="text-xs"
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Vehicle
              </Button>
            )}
          </div>
            
          {vehiclesLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="ml-2 text-xs text-gray-500">Loading vehicles...</span>
            </div>
          ) : selectedCustomer && customerVehicles.length > 0 ? (
            <FormField
              control={form.control}
              name="customerVehicleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Select Customer Vehicle</FormLabel>
                  <Select onValueChange={(value) => {
                    field.onChange(value);
                    const vehicle = customerVehicles.find((v: any) => v.id === value);
                    if (vehicle) {
                      form.setValue("chassisNumber", vehicle.vin || vehicle.chassis_number || "");
                      form.setValue("licensePlate", vehicle.license_plate || vehicle.licensePlate || "");
                    }
                  }} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Select vehicle" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customerVehicles.map((vehicle: any) => (
                        <SelectItem key={vehicle.id} value={vehicle.id}>
                          <div className="flex items-center gap-2">
                            <CarIcon className="w-3 h-3" />
                            <span>{vehicle.license_plate || vehicle.licensePlate || "No Plate"}</span>
                            <span className="text-gray-500">•</span>
                            <span className="text-gray-600">
                              {vehicle.make} {vehicle.model} ({vehicle.year || "N/A"})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="text-xs text-gray-500 p-2 bg-white rounded border border-gray-200">
              {selectedCustomerId ? "No vehicles registered for this customer" : "Select a customer first"}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="chassisNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">VIN</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="VIN" 
                      className="border-gray-300"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="licensePlate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">License Plate</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Plate" 
                      className="border-gray-300"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Staff Assignment Section */}
        <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Staff</h3>
            
          <FormField
            control={form.control}
            name="advisor"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs text-gray-600">Primary Advisor</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Select advisor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {employeesLoading ? (
                      <div className="p-2 text-center">
                        <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                      </div>
                    ) : filteredBranchEmployees.length > 0 ? (
                      filteredBranchEmployees.map((e: any) => {
                        const employeeName = `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.name || 'Unknown';
                        const employeeRole = e.position || e.role || e.job_title || 'Staff';
                        return (
                          <SelectItem key={e.id} value={employeeName}>
                            <div className="flex flex-col">
                              <span className="font-medium">{employeeName}</span>
                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                <span>{employeeRole}</span>
                                {e.working_hours && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3" />
                                      {e.working_hours}h
                                    </span>
                                  </>
                                )}
                                {e.hourly_rate && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <DollarSign className="w-3 h-3" />
                                      {e.hourly_rate}
                                    </span>
                                  </>
                                )}
                              </div>
                              {e.specialization && (
                                <div className="flex items-center gap-1 text-xs text-gray-600">
                                  <Briefcase className="w-3 h-3" />
                                  {e.specialization}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        );
                      })
                    ) : (
                      <div className="p-2 text-center text-xs text-gray-500">
                        No advisors available
                      </div>
                    )}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Availability Section */}
        <div className="space-y-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Available Staff</h3>
          {employeesLoading ? (
            <div className="flex items-center justify-center p-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="ml-2 text-xs text-gray-500">Loading staff...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-1">
              {filteredBranchEmployees.map((employee: any) => {
                const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.name || 'Unknown';
                const employeeRole = employee.position || employee.role || employee.job_title || 'Staff';
                return (
                  <div key={employee.id} className="flex items-center justify-between p-2 bg-white rounded border border-gray-200">
                    <div className="flex-1">
                      <p className="text-xs font-medium text-gray-900">{employeeName}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <span>{employeeRole}</span>
                        {employee.working_hours && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {employee.working_hours}h
                            </span>
                          </>
                        )}
                        {employee.hourly_rate && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3" />
                              {employee.hourly_rate}
                            </span>
                          </>
                        )}
                      </div>
                      {employee.specialization && (
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Briefcase className="w-3 h-3" />
                          {employee.specialization}
                        </div>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">Available</Badge>
                  </div>
                );
              })}
              {filteredBranchEmployees.length === 0 && (
                <div className="text-xs text-gray-500 p-2 bg-white rounded border border-gray-200 text-center">
                  {selectedBranchId ? "No staff found for this branch" : "Select a branch first"}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Additional Information Section */}
        <div className="space-y-2 p-3 bg-white rounded-lg border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Additional</h3>
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name="bookingInfo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Notes" 
                      className="min-h-[60px] border-gray-300"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-gray-300">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Confirmed">Confirmed</SelectItem>
                      <SelectItem value="Completed">Completed</SelectItem>
                      <SelectItem value="Cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {form.watch("status") === "Cancelled" && (
            <FormField
              control={form.control}
              name="cancellationReason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs text-gray-600">Cancellation Reason</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Reason" 
                      className="min-h-[60px] border-gray-300"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>

        {/* Tabs Section */}
        <Tabs defaultValue="employees" className="w-full">
          <TabsList className="grid w-full grid-cols-7 bg-gray-100">
            <TabsTrigger value="employees" className="data-[state=active]:bg-white">Employees</TabsTrigger>
            <TabsTrigger value="schedule" className="data-[state=active]:bg-white">Schedule</TabsTrigger>
            <TabsTrigger value="options" className="data-[state=active]:bg-white">Options</TabsTrigger>
            <TabsTrigger value="questions" className="data-[state=active]:bg-white">Questions</TabsTrigger>
            <TabsTrigger value="messages" className="data-[state=active]:bg-white">Messages</TabsTrigger>
            <TabsTrigger value="vehicle" className="data-[state=active]:bg-white">Vehicle</TabsTrigger>
            <TabsTrigger value="new-vehicle" className="data-[state=active]:bg-white">New Vehicle</TabsTrigger>
          </TabsList>
            
          <TabsContent value="employees" className="space-y-3 mt-3">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium mb-3 text-sm text-gray-900">Available Employees</h4>
              {employeesLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="ml-2 text-xs text-gray-500">Loading employees...</span>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredBranchEmployees.map((employee: any) => {
                    const employeeName = `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || employee.name || 'Unknown';
                    const employeeRole = employee.position || employee.role || employee.job_title || 'Staff';
                    return (
                      <div key={employee.id} className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{employeeName}</p>
                          <div className="flex items-center gap-2 text-xs text-gray-600">
                            <span>{employeeRole}</span>
                            {employee.working_hours && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {employee.working_hours}h
                                </span>
                              </>
                            )}
                            {employee.hourly_rate && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <DollarSign className="w-3 h-3" />
                                  {employee.hourly_rate}
                                </span>
                              </>
                            )}
                          </div>
                          {employee.specialization && (
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Briefcase className="w-3 h-3" />
                              {employee.specialization}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">Available</Badge>
                      </div>
                    );
                  })}
                  {filteredBranchEmployees.length === 0 && (
                    <div className="text-xs text-gray-500 p-2 bg-white rounded border border-gray-200 text-center">
                      {selectedBranchId ? "No employees found for this branch" : "Select a branch first"}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
            
          <TabsContent value="schedule" className="space-y-3 mt-3">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium mb-3 text-sm text-gray-900">Schedule Overview</h4>
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-gray-500">Date:</span>
                    <span className="ml-2 font-medium">{form.watch("date") || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Time:</span>
                    <span className="ml-2 font-medium">{form.watch("time") || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Duration:</span>
                    <span className="ml-2 font-medium">{form.watch("duration")} minutes</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Service:</span>
                    <span className="ml-2 font-medium">{form.watch("kind")}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Branch:</span>
                    <span className="ml-2 font-medium">
                      {selectedBranchId && branchesData 
                        ? branchesData.find((b: any) => b.id === selectedBranchId)?.name || "Not specified"
                        : "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">Advisor:</span>
                    <span className="ml-2 font-medium">{form.watch("advisor") || "Not specified"}</span>
                  </div>
                </div>
                {selectedAdvisor && (
                  <div className="mt-3 pt-3 border-t">
                    <span className="text-gray-500 text-sm">Advisor Schedule:</span>
                    <div className="ml-2 mt-1">
                      {(() => {
                        const advisor = branchEmployees.find((e: any) => 
                          `${e.first_name} ${e.last_name}`.trim() === selectedAdvisor || 
                          e.name === selectedAdvisor
                        );
                        const selectedDateObj = new Date(form.watch("date"));
                        const dayIndex = selectedDateObj.getDay();
                        const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
                        const dayOfWeek = dayNames[dayIndex];
                        const daySchedule = advisor?.schedule?.[dayOfWeek as keyof NonNullable<typeof advisor.schedule>];
                          
                        if (daySchedule) {
                          return (
                            <span className="font-medium text-green-600 text-sm">
                              {daySchedule.start} - {daySchedule.end}
                            </span>
                          );
                        } else {
                          return (
                            <span className="font-medium text-red-600 text-sm">
                              Not available on this day
                            </span>
                          );
                        }
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Available Time Slots */}
              {selectedAdvisor && (
                <div className="mt-3">
                  <h5 className="text-xs font-semibold text-gray-700 mb-2">Available Time Slots for {selectedAdvisor}</h5>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {availableTimeSlots.length > 0 ? (
                      availableTimeSlots.map((slot, index) => (
                        <div
                          key={index}
                          onClick={() => slot.available && form.setValue("time", slot.startTime)}
                          className={`flex items-center justify-between p-2 rounded border cursor-pointer transition-colors ${
                            slot.available
                              ? "bg-white border-gray-200 hover:bg-green-50 hover:border-green-300"
                              : "bg-gray-100 border-gray-200 opacity-50 cursor-not-allowed"
                          } ${form.watch("time") === slot.startTime ? "bg-blue-50 border-blue-300" : ""}`}
                        >
                          <span className="text-xs font-medium">
                            {slot.startTime} - {slot.endTime}
                          </span>
                          {slot.available ? (
                            <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                              Available
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                              Booked
                            </Badge>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500 p-2 bg-white rounded border border-gray-200">
                        No time slots available
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Calendar View */}
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium mb-3 text-sm text-gray-900 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Available Slots Calendar
              </h4>
              <div className="space-y-4">
                <div className="flex justify-center">
                  <DayPicker
                    mode="single"
                    selected={calendarDate}
                    onSelect={handleDateSelect}
                    disabled={{ before: new Date() }}
                    className="rounded-md border"
                    modifiers={{
                      available: (date) => {
                        if (!selectedBranchId) return false;
                        const slots = getTimeSlotsForDate(date);
                        return slots.length > 0;
                      }
                    }}
                    modifiersStyles={{
                      available: {
                        backgroundColor: '#22c55e',
                        color: 'white',
                        fontWeight: 'bold'
                      }
                    }}
                  />
                </div>

                {calendarDate && (
                  <div className="mt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">
                      Available slots for {format(calendarDate, 'MMMM d, yyyy')}:
                    </h5>
                    {selectedBranchId ? (
                      (() => {
                        const slots = getTimeSlotsForDate(calendarDate);
                        if (slots.length === 0) {
                          return (
                            <div className="text-center py-4 text-xs text-gray-500">
                              No available slots for this date
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-2">
                            {slots.map((slot: any, index: number) => (
                              <div
                                key={index}
                                className="border border-gray-200 rounded overflow-hidden"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    form.setValue("time", slot.startTime);
                                    form.setValue("date", format(calendarDate, 'yyyy-MM-dd'));
                                    // Select random advisor from available advisors
                                    if (slot.availableAdvisors && slot.availableAdvisors.length > 0) {
                                      const randomAdvisor = slot.availableAdvisors[Math.floor(Math.random() * slot.availableAdvisors.length)];
                                      form.setValue("advisor", randomAdvisor);
                                    }
                                  }}
                                  className={`w-full p-2 text-left transition-colors ${
                                    form.watch("time") === slot.startTime &&
                                    form.watch("date") === format(calendarDate, 'yyyy-MM-dd')
                                      ? "bg-primary text-white"
                                      : "bg-gray-50 hover:bg-gray-100"
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3" />
                                    <span className="font-medium">{slot.startTime}</span>
                                    {slot.endTime && (
                                      <span className="text-gray-500">- {slot.endTime}</span>
                                    )}
                                  </div>
                                </button>
                                {!selectedAdvisor && slot.availableAdvisors && slot.availableAdvisors.length > 0 && (
                                  <div className={`p-2 border-t ${
                                    form.watch("time") === slot.startTime &&
                                    form.watch("date") === format(calendarDate, 'yyyy-MM-dd')
                                      ? "bg-primary/90"
                                      : "bg-white"
                                  }`}>
                                    <div className="text-xs">
                                      <p className="font-medium mb-1">Available advisors:</p>
                                      <div className="space-y-1">
                                        {slot.availableAdvisors.map((advisorName: string, advisorIndex: number) => (
                                          <div
                                            key={advisorIndex}
                                            className={`flex items-center gap-2 p-1 rounded ${
                                              form.watch("advisor") === advisorName
                                                ? "bg-green-100 text-green-700"
                                                : "bg-gray-50"
                                            }`}
                                          >
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span>{advisorName}</span>
                                            {form.watch("advisor") === advisorName && (
                                              <span className="ml-auto text-xs bg-green-600 text-white px-1 rounded">Auto-selected</span>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      })()
                    ) : (
                      <div className="text-center py-4 text-xs text-gray-500">
                        Select a branch to view available slots
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
            
          <TabsContent value="options" className="space-y-3 mt-3">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium mb-3 text-sm text-gray-900">Additional Options</h4>
              <div className="space-y-3">
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    <span>Send SMS confirmation to customer</span>
                  </label>
                </div>
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    <span>Email appointment details</span>
                  </label>
                </div>
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    <span>Set reminder 24 hours before</span>
                  </label>
                </div>
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="rounded" />
                    <span>Reserve courtesy vehicle if needed</span>
                  </label>
                </div>
              </div>
            </div>
          </TabsContent>
            
          <TabsContent value="questions" className="space-y-3 mt-3">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium mb-3 text-sm text-gray-900">Pre-appointment Questions</h4>
              <div className="space-y-3">
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Have you experienced any issues with the vehicle?</label>
                  <Textarea 
                    placeholder="Describe any issues..." 
                    className="min-h-[60px] border-gray-300 text-sm"
                  />
                </div>
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Is this the first service for this vehicle?</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="firstService" className="rounded" />
                      <span>Yes</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="firstService" className="rounded" />
                      <span>No</span>
                    </label>
                  </div>
                </div>
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <label className="text-sm font-medium text-gray-700 block mb-1">Any specific requests or preferences?</label>
                  <Textarea 
                    placeholder="Special requests..." 
                    className="min-h-[60px] border-gray-300 text-sm"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
            
          <TabsContent value="messages" className="space-y-3 mt-3">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium mb-3 text-sm text-gray-900">Communication History</h4>
              <div className="space-y-2">
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-900">System</span>
                    <span className="text-xs text-gray-500">Today, 10:30 AM</span>
                  </div>
                  <p className="text-xs text-gray-600">Appointment created via dashboard</p>
                </div>
                {selectedCustomer && (
                  <div className="p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-900">
                        {selectedCustomer.first_name} {selectedCustomer.last_name}
                      </span>
                      <span className="text-xs text-gray-500">Previous contact</span>
                    </div>
                    <p className="text-xs text-gray-600">Customer profile loaded</p>
                  </div>
                )}
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-900">Branch</span>
                    <span className="text-xs text-gray-500">Ongoing</span>
                  </div>
                  <p className="text-xs text-gray-600">Staff assignment pending confirmation</p>
                </div>
              </div>
              <div className="mt-3 p-2 bg-gray-50 rounded border border-gray-200">
                <Textarea 
                  placeholder="Add a note or message..." 
                  className="min-h-[60px] border-gray-300 text-sm"
                />
              </div>
            </div>
          </TabsContent>
            
          <TabsContent value="vehicle" className="space-y-3 mt-3">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium mb-3 text-sm text-gray-900">Vehicle Information</h4>
              {vehiclesLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="ml-2 text-xs text-gray-500">Loading vehicle information...</span>
                </div>
              ) : (
                <div className="bg-gray-50 p-3 rounded border border-gray-200">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-500">VIN:</span>
                      <span className="ml-2 font-medium">{form.watch("chassisNumber") || "Not specified"}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">License Plate:</span>
                      <span className="ml-2 font-medium">{form.watch("licensePlate") || "Not specified"}</span>
                    </div>
                    {selectedCustomer && customerVehicles.length > 0 && (
                      <>
                        <div>
                          <span className="text-gray-500">Model:</span>
                          <span className="ml-2 font-medium">
                            {customerVehicles[0]?.make} {customerVehicles[0]?.model || "Not specified"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Year:</span>
                          <span className="ml-2 font-medium">{customerVehicles[0]?.year || "N/A"}</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Mileage:</span>
                          <span className="ml-2 font-medium">{customerVehicles[0]?.mileage || 0} km</span>
                        </div>
                        <div>
                          <span className="text-gray-500">Status:</span>
                          <span className="ml-2 font-medium">{customerVehicles[0]?.status || "N/A"}</span>
                        </div>
                      </>
                    )}
                  </div>
                  {customerVehicles.length === 0 && selectedCustomerId && (
                    <p className="text-xs text-gray-500 text-center mt-2">No vehicles found for this customer</p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
            
          <TabsContent value="new-vehicle" className="space-y-3 mt-3">
            <div className="p-3 bg-white rounded-lg border border-gray-200">
              <h4 className="font-medium mb-3 text-sm text-gray-900">Add New Vehicle for Customer</h4>
              {!selectedCustomer ? (
                <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded border border-gray-200">
                  Please select a customer first to add a vehicle
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Vehicle Model</label>
                      <Select onValueChange={(value) => setNewVehicleData({...newVehicleData, modelId: value})}>
                        <SelectTrigger className="border-gray-300 text-sm">
                          <SelectValue placeholder="Select model" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="v1">Swift GL</SelectItem>
                          <SelectItem value="v2">Ciaz Premium</SelectItem>
                          <SelectItem value="v3">Vitara AllGrip</SelectItem>
                          <SelectItem value="v4">Baleno Sport</SelectItem>
                          <SelectItem value="v5">Carry Pickup</SelectItem>
                          <SelectItem value="v6">Ertiga Family</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">VIN</label>
                      <Input 
                        placeholder="Enter VIN" 
                        className="border-gray-300 text-sm"
                        value={newVehicleData.vin}
                        onChange={(e) => setNewVehicleData({...newVehicleData, vin: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">License Plate</label>
                      <Input 
                        placeholder="Enter plate" 
                        className="border-gray-300 text-sm"
                        value={newVehicleData.licensePlate}
                        onChange={(e) => setNewVehicleData({...newVehicleData, licensePlate: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Purchase Date</label>
                      <Input 
                        type="date" 
                        className="border-gray-300 text-sm"
                        value={newVehicleData.purchaseDate}
                        onChange={(e) => setNewVehicleData({...newVehicleData, purchaseDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Warranty Expiry</label>
                      <Input 
                        type="date" 
                        className="border-gray-300 text-sm"
                        value={newVehicleData.warrantyExpiry}
                        onChange={(e) => setNewVehicleData({...newVehicleData, warrantyExpiry: e.target.value})}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600 block mb-1">Current Mileage</label>
                      <Input 
                        type="number" 
                        placeholder="km" 
                        className="border-gray-300 text-sm"
                        value={newVehicleData.mileage || ""}
                        onChange={(e) => setNewVehicleData({...newVehicleData, mileage: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                  <Button 
                    type="button"
                    variant="outline" 
                    className="w-full text-sm"
                    onClick={handleAddVehicle}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Vehicle to Customer
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-2">
          <Button 
            type="submit" 
            className="w-full sm:w-auto bg-gray-900 hover:bg-gray-800 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {initialData ? "Save Changes" : "Book Appointment"}
          </Button>
        </div>
      </form>

      {/* ── Add Vehicle Dialog ── */}
      <Dialog open={showAddVehicleDialog} onOpenChange={setShowAddVehicleDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CarIcon className="h-5 w-5 text-primary" />
              Add Vehicle
            </DialogTitle>
            <DialogDescription>
              Adding a new vehicle for{" "}
              {selectedCustomer
                ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}`
                : "selected customer"}
            </DialogDescription>
          </DialogHeader>

          {selectedCustomer && (
            <VehicleForm
              prefillContactId={selectedCustomer.id}
              onSuccess={() => {
                setShowAddVehicleDialog(false);
                // Refresh vehicles list for this customer
                queryClient.invalidateQueries({ queryKey: ['vehicles', selectedCustomerId] });
                toast.success("Vehicle added successfully");
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Add New Customer Dialog ── */}
      <Dialog open={showNewContactDialog} onOpenChange={setShowNewContactDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              Add New Customer
            </DialogTitle>
            <DialogDescription>
              Fill in the details below to create a new contact. They will be automatically selected after saving.
            </DialogDescription>
          </DialogHeader>

          <ContactForm
            onSuccess={async () => {
              // Refresh the contacts list
              await queryClient.invalidateQueries({ queryKey: ['contacts'] });

              // Fetch updated list and auto-select the newest entry
              try {
                const updated = await apiClient.getContacts();
                const list: any[] = updated?.data || [];
                if (list.length > 0) {
                  const newest = list.reduce((a: any, b: any) =>
                    new Date(b.created_at) > new Date(a.created_at) ? b : a
                  );
                  form.setValue("contactId", newest.id);
                  setSelectedCustomerId(newest.id);
                  onCustomerSelect?.(newest.id);
                  toast.success(`"${newest.first_name} ${newest.last_name}" selected as customer`);
                }
              } catch {
                // list will be refreshed; user can pick manually
              }

              setShowNewContactDialog(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </Form>
  );
}
