import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const contactSchema = z.object({
  first_name: z.string().min(2, "First name must be at least 2 characters"),
  last_name: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")).or(z.undefined()),
  phone: z.string().min(5, "Phone number is too short"),
  mobile: z.string().optional(),
  type: z.enum(["Individual", "Company", "Fleet"]),
  branch_id: z.string().min(1, "Please select a branch"),
  company: z.string().optional(),
  position: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});

type ContactFormValues = z.infer<typeof contactSchema>;

interface ContactFormProps {
  initialData?: any;
  onSuccess: () => void;
}

export function ContactForm({ initialData, onSuccess }: ContactFormProps) {
  // Fetch branches from API
  const { data: branchesData, isLoading: branchesLoading } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.getBranches(),
  });

  const branches = branchesData?.data || [];

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      first_name: initialData?.first_name || "",
      last_name: initialData?.last_name || "",
      email: initialData?.email || "",
      phone: initialData?.phone || "",
      mobile: initialData?.mobile || "",
      type: initialData?.type || "Individual",
      branch_id: initialData?.branch_id || "",
      company: initialData?.company || "",
      position: initialData?.position || "",
      address: initialData?.address || "",
      city: initialData?.city || "",
      country: initialData?.country || "",
      notes: initialData?.notes || "",
    },
  });

  async function onSubmit(data: ContactFormValues) {
    try {
      // Send null for empty email so backend doesn't treat it as required
      const payload = {
        ...data,
        email: data.email?.trim() || null,
      };
      if (initialData) {
        await apiClient.updateContact(initialData.id, payload);
        toast.success("Contact updated successfully");
      } else {
        await apiClient.createContact(payload);
        toast.success("Contact created successfully");
      }
      onSuccess();
    } catch (error) {
      toast.error(initialData ? "Failed to update contact" : "Failed to create contact");
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Row 1: 3 fields */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Customer Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Individual">Individual</SelectItem>
                    <SelectItem value="Company">Company</SelectItem>
                    <SelectItem value="Fleet">Fleet</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* Row 2: 3 fields */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="company"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Name (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Company Ltd." className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Manager" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (Optional)</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Row 3: 3 fields */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input placeholder="+20 123 456 7890" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="mobile"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mobile (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="+20 123 456 7890" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="branch_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={branchesLoading}>
                  <FormControl>
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder={branchesLoading ? "Loading branches..." : "Select branch"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Row 4: 3 fields */}
        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="123 Main St" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Cairo" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="country"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Country (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="Egypt" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Row 5: Full width */}
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional information about this contact..."
                  className="transition-all focus:ring-2 focus:ring-primary/20 resize-none"
                  rows={3}
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-4 gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onSuccess()}
            className="transition-all hover-lift"
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            className="transition-all hover-lift button-press"
          >
            {initialData ? "Save Changes" : "Add Contact"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
