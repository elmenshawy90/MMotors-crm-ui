import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Label } from "@/components/ui/label";

const vehicleSchema = z.object({
  vin: z.string().length(17, "VIN must be exactly 17 characters").optional().or(z.literal("")),
  licensePlate: z.string().min(1, "License plate is required"),
  model: z.string().min(1, "Model is required"),
  contactId: z.string().optional(),
  companyId: z.string().optional(),
  branchId: z.string().min(1, "Branch is required"),
  status: z.enum(["available", "in_service", "sold", "reserved", "maintenance", "out_of_service"]),
  color: z.string().min(1, "Color is required"),
  year: z.number().min(2010, "Year must be at least 2010").max(2030, "Invalid year"),
  purchaseDate: z.string().optional(),
  warrantyExpiry: z.string().optional(),
  mileage: z.number().min(0, "Mileage cannot be negative"),
  fuelType: z.enum(["petrol", "diesel", "electric", "hybrid", "lpg", "other"]),
  transmission: z.enum(["manual", "automatic", "cvt", "semi-automatic"]),
  engineNumber: z.string().optional(),
  registrationExpiry: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  nextServiceDue: z.string().optional(),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  category: z.string().optional(),
  make: z.string().min(1, "Make is required"),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

interface VehicleFormProps {
  initialData?: any;
  onSuccess: () => void;
  prefillContactId?: string; // New prop to pre-fill and lock contactId
}

export function VehicleForm({ initialData, onSuccess, prefillContactId }: VehicleFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [isAddingModel, setIsAddingModel] = useState(false);
  const [newModelName, setNewModelName] = useState("");

  // Use prefillContactId if provided, otherwise use initialData.contactId
  const lockedContactId = prefillContactId || initialData?.contactId || null;

  // Fetch companies
  const { data: companiesData } = useQuery({
    queryKey: ['companies'],
    queryFn: () => apiClient.getCompanies(),
  });

  // Fetch branches
  const { data: branchesData } = useQuery({
    queryKey: ['branches', selectedCompanyId],
    queryFn: () => {
      if (selectedCompanyId) {
        return apiClient.getBranches({ company_id: selectedCompanyId });
      }
      return apiClient.getBranches();
    },
  });

  // Fetch contacts (owners)
  const { data: contactsData } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => apiClient.getContacts(),
  });

  const companies = companiesData?.data || [];
  const branches = branchesData?.data || [];
  const contacts = contactsData?.data || [];

  const form = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      vin: initialData?.vin || "",
      licensePlate: initialData?.licensePlate || "",
      model: initialData?.model || "",
      contactId: lockedContactId || "",
      companyId: initialData?.companyId || "",
      branchId: initialData?.branchId || "",
      status: initialData?.status || "available",
      color: initialData?.color || "",
      year: initialData?.year || new Date().getFullYear(),
      purchaseDate: initialData?.purchaseDate || "",
      warrantyExpiry: initialData?.warrantyExpiry || "",
      mileage: initialData?.mileage || 0,
      fuelType: initialData?.fuelType || "petrol",
      transmission: initialData?.transmission || "automatic",
      engineNumber: initialData?.engineNumber || "",
      registrationExpiry: initialData?.registrationExpiry || "",
      insuranceExpiry: initialData?.insuranceExpiry || "",
      nextServiceDue: initialData?.nextServiceDue || "",
      notes: initialData?.notes || "",
      category: initialData?.category || "Sedan",
      make: initialData?.make || "",
    },
  });

  // Update form when initialData changes
  useEffect(() => {
    if (initialData) {
      form.reset({
        vin: initialData.vin || "",
        licensePlate: initialData.licensePlate || "",
        model: initialData.model || "",
        contactId: lockedContactId || initialData.contactId || "",
        companyId: initialData.companyId || "",
        branchId: initialData.branchId || "",
        status: initialData.status || "available",
        color: initialData.color || "",
        year: initialData.year || new Date().getFullYear(),
        purchaseDate: initialData.purchaseDate || "",
        warrantyExpiry: initialData.warrantyExpiry || "",
        mileage: initialData.mileage || 0,
        fuelType: initialData.fuelType || "petrol",
        transmission: initialData.transmission || "automatic",
        engineNumber: initialData.engineNumber || "",
        registrationExpiry: initialData.registrationExpiry || "",
        insuranceExpiry: initialData.insuranceExpiry || "",
        nextServiceDue: initialData.nextServiceDue || "",
        notes: initialData.notes || "",
        category: initialData.category || "Sedan",
        make: initialData.make || "",
      });
    }
  }, [initialData, form, lockedContactId]);

  async function onSubmit(data: VehicleFormValues) {
    setIsSubmitting(true);
    try {
      // Convert camelCase to snake_case for backend
      const payload = {
        vin: data.vin || null,
        license_plate: data.licensePlate,
        model: data.model,
        make: data.make,
        company_id: data.companyId || null,
        owner_id: data.contactId || null,
        branch_id: data.branchId,
        status: data.status,
        color: data.color,
        year: data.year,
        purchase_date: data.purchaseDate || null,
        warranty_expiry: data.warrantyExpiry || null,
        mileage: data.mileage,
        fuel_type: data.fuelType,
        transmission: data.transmission,
        engine_number: data.engineNumber || null,
        registration_expiry: data.registrationExpiry || null,
        insurance_expiry: data.insuranceExpiry || null,
        next_service_date: data.nextServiceDue || null,
        description: data.notes || null,
        category: data.category || null,
      };

      if (initialData) {
        // Edit mode
        await apiClient.updateVehicle(initialData.id, payload);
        toast.success("Vehicle updated successfully");
      } else {
        // Add mode
        await apiClient.createVehicle(payload);
        toast.success("Vehicle added successfully");
      }
      onSuccess();
    } catch (error: any) {
      console.error("Error submitting vehicle form:", error);
      toast.error(error.response?.data?.message || "Failed to save vehicle");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="vin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>VIN (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="MA3EJKD1S00123481" className="transition-all focus:ring-2 focus:ring-primary/20 uppercase" {...field} />
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
                <FormLabel>License Plate</FormLabel>
                <FormControl>
                  <Input placeholder="ص ط ر 4821" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="companyId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand / Company</FormLabel>
                <Select onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedCompanyId(value);
                  form.setValue("branchId", "");
                  const company = companies.find((c) => c.id === value);
                  if (company) {
                    form.setValue("make", company.name);
                  }
                }} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select brand" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">All Brands</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
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
            name="make"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Make</FormLabel>
                <FormControl>
                  <Input placeholder="Auto-filled from brand" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="Corolla, Civic, etc." className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="branchId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Branch *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select branch" />
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

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="contactId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Owner {lockedContactId ? '(Locked)' : '(Optional)'}</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!!lockedContactId}>
                  <FormControl>
                    <SelectTrigger className={cn("transition-all focus:ring-2 focus:ring-primary/20", lockedContactId && "bg-muted")}>
                      <SelectValue placeholder="Select owner" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="">No owner</SelectItem>
                    {contacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {contact.first_name} {contact.last_name}
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
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_service">In Service</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="out_of_service">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="color"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color</FormLabel>
                <FormControl>
                  <Input placeholder="Pearl White" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="year"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="2024" 
                    className="transition-all focus:ring-2 focus:ring-primary/20"
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
            name="mileage"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Mileage (km)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="0" 
                    className="transition-all focus:ring-2 focus:ring-primary/20"
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
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="Sedan">Sedan</SelectItem>
                    <SelectItem value="SUV">SUV</SelectItem>
                    <SelectItem value="Hatchback">Hatchback</SelectItem>
                    <SelectItem value="Pickup">Pickup</SelectItem>
                    <SelectItem value="Van">Van</SelectItem>
                    <SelectItem value="Truck">Truck</SelectItem>
                    <SelectItem value="Coupe">Coupe</SelectItem>
                    <SelectItem value="Convertible">Convertible</SelectItem>
                    <SelectItem value="Wagon">Wagon</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fuelType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fuel Type</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select fuel type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="petrol">Petrol</SelectItem>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="electric">Electric</SelectItem>
                    <SelectItem value="lpg">LPG</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="transmission"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Transmission</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="transition-all focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Select transmission" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="manual">Manual</SelectItem>
                    <SelectItem value="automatic">Automatic</SelectItem>
                    <SelectItem value="cvt">CVT</SelectItem>
                    <SelectItem value="semi-automatic">Semi-Automatic</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="engineNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Engine Number</FormLabel>
              <FormControl>
                <Input placeholder="K14B-882911" className="transition-all focus:ring-2 focus:ring-primary/20 uppercase" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="purchaseDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Purchase Date</FormLabel>
                <FormControl>
                  <Input type="date" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="warrantyExpiry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Warranty Expiry</FormLabel>
                <FormControl>
                  <Input type="date" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="registrationExpiry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Registration Expiry</FormLabel>
                <FormControl>
                  <Input type="date" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="insuranceExpiry"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Insurance Expiry</FormLabel>
                <FormControl>
                  <Input type="date" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="nextServiceDue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Next Service Due (Optional)</FormLabel>
                <FormControl>
                  <Input type="date" className="transition-all focus:ring-2 focus:ring-primary/20" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes (Optional)</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional information about this vehicle..."
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
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="transition-all hover-lift button-press"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : (initialData ? "Save Changes" : "Add Vehicle")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
