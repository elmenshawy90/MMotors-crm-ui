import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import apiClient from "@/lib/api-client";
import { toast } from "sonner";
import { Calendar, Clock, User, Loader2 } from "lucide-react";

interface PhoneCallFormProps {
  onSuccess?: () => void;
  editingCall?: any;
}

// Add N days to a date string (yyyy-mm-dd) and return yyyy-mm-dd
function addDays(dateStr: string, days: number): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function PhoneCallForm({ onSuccess, editingCall }: PhoneCallFormProps) {
  const queryClient = useQueryClient();

  // ── Remote data ────────────────────────────────────────────────────────────
  const { data: contactsResponse } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => apiClient.getContacts(),
  });
  const { data: branchesResponse } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiClient.getBranches(),
  });
  const { data: usersResponse } = useQuery({
    queryKey: ["users"],
    queryFn: () => apiClient.getUsers(),
  });
  // Current logged-in user
  const { data: profileData } = useQuery({
    queryKey: ["profile"],
    queryFn: () => apiClient.getProfile(),
  });

  const contacts  = contactsResponse?.data  || [];
  const branches  = branchesResponse?.data  || [];
  const users     = usersResponse?.data     || [];
  const profile   = profileData;

  // ── Form state ─────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    contact_id:        editingCall?.contact_id        || "",
    caller_name:       editingCall?.caller_name        || "",
    caller_phone:      editingCall?.caller_phone       || "",
    branch_id:         editingCall?.branch_id          || "",
    agent_id:          editingCall?.agent_id           || "",
    agent_name:        editingCall?.agent_name         || "",
    direction:         editingCall?.direction          || "inbound",
    status:            editingCall?.status             || "completed",
    purpose:           editingCall?.purpose            || "inquiry",
    call_duration:     editingCall?.call_duration      || 0,
    notes:             editingCall?.notes              || "",
    follow_up_required:editingCall?.follow_up_required || false,
    follow_up_date:    editingCall?.follow_up_date
      ? new Date(editingCall.follow_up_date).toISOString().split("T")[0]
      : "",
    follow_up_date_2:  editingCall?.follow_up_date_2  || "",
    follow_up_date_3:  editingCall?.follow_up_date_3  || "",
  });

  // ── Auto-fill agent from logged-in user on mount ───────────────────────────
  useEffect(() => {
    if (profile && !editingCall) {
      const fullName = `${profile.first_name || ""} ${profile.last_name || ""}`.trim();
      setFormData((prev) => ({
        ...prev,
        agent_id:   profile.id    || "",
        agent_name: fullName,
        branch_id:  profile.branch_id || prev.branch_id,
      }));
    }
  }, [profile, editingCall]);

  // ── Auto-compute follow_up_date_2 and _3 when follow_up_date changes ──────
  useEffect(() => {
    if (formData.follow_up_date) {
      setFormData((prev) => ({
        ...prev,
        follow_up_date_2: addDays(formData.follow_up_date, 1),
        follow_up_date_3: addDays(formData.follow_up_date, 3),
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        follow_up_date_2: "",
        follow_up_date_3: "",
      }));
    }
  }, [formData.follow_up_date]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => apiClient.createPhoneCall(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-calls"] });
      toast.success("Call created successfully");
      onSuccess?.();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to create call"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.updatePhoneCall(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["phone-calls"] });
      toast.success("Call updated successfully");
      onSuccess?.();
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Failed to update call"),
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleContactChange = (contactId: string) => {
    const contact = contacts.find((c: any) => c.id === contactId);
    if (contact) {
      setFormData((prev) => ({
        ...prev,
        contact_id:   contactId,
        caller_name:  `${contact.first_name} ${contact.last_name}`,
        caller_phone: contact.phone,
        branch_id:    contact.branch_id || prev.branch_id,
      }));
    }
  };

  const handleAgentChange = (userId: string) => {
    const user = users.find((u: any) => u.id === userId);
    if (user) {
      setFormData((prev) => ({
        ...prev,
        agent_id:   userId,
        agent_name: `${user.first_name} ${user.last_name}`.trim(),
        branch_id:  user.branch_id || prev.branch_id,
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.caller_phone) { toast.error("Phone number is required"); return; }
    if (!formData.branch_id)    { toast.error("Branch is required"); return; }

    const payload = {
      contact_id:         formData.contact_id    || null,
      caller_name:        formData.caller_name,
      caller_phone:       formData.caller_phone,
      branch_id:          formData.branch_id,
      direction:          formData.direction,
      status:             formData.status,
      purpose:            formData.purpose,
      call_duration:      formData.call_duration,
      notes:              formData.notes,
      follow_up_required: formData.follow_up_required,
      follow_up_date:     formData.follow_up_required && formData.follow_up_date
        ? formData.follow_up_date : null,
      follow_up_date_2:   formData.follow_up_required && formData.follow_up_date_2
        ? formData.follow_up_date_2 : null,
      follow_up_date_3:   formData.follow_up_required && formData.follow_up_date_3
        ? formData.follow_up_date_3 : null,
    };

    if (editingCall) {
      updateMutation.mutate({ id: editingCall.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Row 1: Contact + Phone */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact">Contact *</Label>
          <Select value={formData.contact_id} onValueChange={handleContactChange}>
            <SelectTrigger id="contact">
              <SelectValue placeholder="Select contact" />
            </SelectTrigger>
            <SelectContent>
              {contacts.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.first_name} {c.last_name} — {c.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            value={formData.caller_phone}
            onChange={(e) => setFormData({ ...formData, caller_phone: e.target.value })}
            placeholder="+20 xxx xxx xxxx"
            required
          />
        </div>
      </div>

      {/* Row 2: Agent (auto-filled) + Branch */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="agent" className="flex items-center gap-1.5">
            Agent *
            {formData.agent_name && (
              <Badge variant="outline" className="text-[10px] py-0 gap-1 font-normal">
                <User className="h-2.5 w-2.5" />
                Auto-filled
              </Badge>
            )}
          </Label>
          <Select
            value={formData.agent_id}
            onValueChange={handleAgentChange}
          >
            <SelectTrigger id="agent">
              <SelectValue placeholder="Select agent" />
            </SelectTrigger>
            <SelectContent>
              {/* Current user at the top */}
              {profile && (
                <SelectItem value={profile.id}>
                  ★ {profile.first_name} {profile.last_name} (You)
                </SelectItem>
              )}
              {users
                .filter((u: any) => u.id !== profile?.id)
                .map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.first_name} {u.last_name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="branch">Branch *</Label>
          <Select
            value={formData.branch_id}
            onValueChange={(v) => setFormData({ ...formData, branch_id: v })}
            required
          >
            <SelectTrigger id="branch">
              <SelectValue placeholder="Select branch" />
            </SelectTrigger>
            <SelectContent>
              {branches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 3: Direction + Status + Purpose */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="direction">Direction *</Label>
          <Select
            value={formData.direction}
            onValueChange={(v) => setFormData({ ...formData, direction: v })}
          >
            <SelectTrigger id="direction"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="inbound">Inbound</SelectItem>
              <SelectItem value="outbound">Outbound</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status *</Label>
          <Select
            value={formData.status}
            onValueChange={(v) => setFormData({ ...formData, status: v })}
          >
            <SelectTrigger id="status"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="missed">Missed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="voicemail">Voicemail</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="purpose">Purpose *</Label>
          <Select
            value={formData.purpose}
            onValueChange={(v) => setFormData({ ...formData, purpose: v })}
          >
            <SelectTrigger id="purpose"><SelectValue /></SelectTrigger>
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
        </div>
      </div>

      {/* Row 4: Duration */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="duration">Duration (seconds)</Label>
          <Input
            id="duration"
            type="number"
            value={formData.call_duration}
            onChange={(e) =>
              setFormData({ ...formData, call_duration: parseInt(e.target.value) || 0 })
            }
            placeholder="0"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="Additional notes about the call"
          rows={3}
        />
      </div>

      {/* Follow-up checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="followUpRequired"
          checked={formData.follow_up_required}
          onCheckedChange={(checked) =>
            setFormData({ ...formData, follow_up_required: checked as boolean })
          }
        />
        <Label htmlFor="followUpRequired" className="cursor-pointer">
          Follow-up Required
        </Label>
      </div>

      {/* Follow-up dates — shown only when follow-up is required */}
      {formData.follow_up_required && (
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-3">
          <p className="text-sm font-semibold flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Follow-up Schedule
          </p>

          <div className="grid grid-cols-3 gap-4">
            {/* Follow-up Date 1 — manual */}
            <div className="space-y-1.5">
              <Label htmlFor="fud1" className="text-xs font-medium flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-primary" />
                Follow-up Date 1
              </Label>
              <Input
                id="fud1"
                type="date"
                value={formData.follow_up_date}
                onChange={(e) =>
                  setFormData({ ...formData, follow_up_date: e.target.value })
                }
              />
              <p className="text-[10px] text-muted-foreground">Set manually</p>
            </div>

            {/* Follow-up Date 2 — auto: +1 day */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-orange-500" />
                Follow-up Date 2
                <Badge variant="outline" className="text-[10px] py-0 font-normal">
                  Auto
                </Badge>
              </Label>
              <Input
                type="date"
                value={formData.follow_up_date_2}
                readOnly
                className="bg-muted/50 cursor-not-allowed opacity-70"
              />
              <p className="text-[10px] text-muted-foreground">
                +1 day from Date 1{formData.follow_up_date_2 ? ` (${formData.follow_up_date_2})` : ""}
              </p>
            </div>

            {/* Follow-up Date 3 — auto: +3 days */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium flex items-center gap-1.5">
                <Clock className="h-3 w-3 text-red-500" />
                Follow-up Date 3
                <Badge variant="outline" className="text-[10px] py-0 font-normal">
                  Auto
                </Badge>
              </Label>
              <Input
                type="date"
                value={formData.follow_up_date_3}
                readOnly
                className="bg-muted/50 cursor-not-allowed opacity-70"
              />
              <p className="text-[10px] text-muted-foreground">
                +3 days from Date 1{formData.follow_up_date_3 ? ` (${formData.follow_up_date_3})` : ""}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onSuccess}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {editingCall ? "Update Call" : "Create Call"}
        </Button>
      </div>
    </form>
  );
}
