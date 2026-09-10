import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
import { PageShell } from "@/components/AppTopbar";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Calendar,
  Clock,
  User,
  MapPin,
  Car as CarIcon,
  Wrench,
  Phone,
  Mail,
  Building,
  CreditCard,
  Tag,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { AppointmentForm } from "@/components/forms/AppointmentForm";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/api-client";

export const Route = createFileRoute("/appointments/create")({
  validateSearch: (search: Record<string, unknown>) => ({
    contactId: (search.contactId as string) || "",
  }),
  head: () => ({
    meta: [
      { title: "Create Appointment — SIG" },
      {
        name: "description",
        content:
          "Create a new appointment for test drives, services, repairs, inspections and deliveries.",
      },
      { property: "og:title", content: "Create Appointment — SIG" },
      {
        property: "og:description",
        content: "Book a new appointment across all branches and service types.",
      },
    ],
  }),
  component: CreateAppointmentPage,
});

function CreateAppointmentPage() {
  const { contactId } = useSearch({ from: "/appointments/create" });
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(contactId || "");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");

  // Fetch contacts (customers)
  const { data: contactsData, isLoading: loadingContacts } = useQuery({
    queryKey: ["contacts"],
    queryFn: () => apiClient.getContacts(),
  });

  // Fetch branches
  const { data: branchesData, isLoading: loadingBranches } = useQuery({
    queryKey: ["branches"],
    queryFn: () => apiClient.getBranches(),
  });

  // Fetch employees
  const { data: employeesData, isLoading: loadingEmployees } = useQuery({
    queryKey: ["employees"],
    queryFn: () => apiClient.getEmployees(),
  });

  // Fetch vehicles
  const { data: vehiclesData, isLoading: loadingVehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient.getVehicles(),
  });

  // Fetch branch stats if branch is selected
  const { data: branchStatsData } = useQuery({
    queryKey: ["branchStats", selectedBranchId],
    queryFn: () => apiClient.getBranchStats(selectedBranchId),
    enabled: !!selectedBranchId,
  });

  const contacts = contactsData?.data || [];
  const branches = branchesData?.data || [];
  const employees = employeesData?.data || [];
  const vehicles = vehiclesData?.data || [];

  const selectedCustomer = selectedCustomerId
    ? contacts.find((c: any) => c.id === selectedCustomerId)
    : null;
  const selectedBranch = selectedBranchId
    ? branches.find((b: any) => b.id === selectedBranchId)
    : null;
  const branchEmployees = selectedBranchId
    ? employees.filter((e: any) => e.branch_id === selectedBranchId)
    : [];
  const branchVehicles = selectedBranchId
    ? vehicles.filter((v: any) => v.branch_id === selectedBranchId)
    : [];

  // Get avatar URL based on customer name
  const getAvatarUrl = (name: string) => {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=random&color=fff&size=128`;
  };

  const getCustomerName = (customer: any): string => {
    return `${customer.first_name || ""} ${customer.last_name || ""}`.trim();
  };

  const isLoading =
    loadingContacts || loadingBranches || loadingEmployees || loadingVehicles;

  return (
    <PageShell
      title="Create New Appointment"
      subtitle="Book a new appointment for test drives, services, repairs, inspections and deliveries."
    >
      <div className="mb-3 flex items-center justify-between">
        <Button variant="outline" size="sm" asChild>
          <Link to="/appointments">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Link>
        </Button>
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-white">
            <Calendar className="w-3 h-3 mr-1" /> Today
          </Badge>
          <Badge variant="outline" className="bg-white">
            <Clock className="w-3 h-3 mr-1" /> Available
          </Badge>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-3">
          {/* Main Form */}
          <div className="lg:col-span-2">
            <Card className="border-gray-200 bg-white">
              <CardContent className="p-3">
                <div className="mb-3 flex items-center gap-2 pb-2 border-b border-gray-200">
                  <div className="w-7 h-7 bg-gray-100 rounded flex items-center justify-center">
                    <Wrench className="w-3.5 h-3.5 text-gray-600" />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-gray-900">
                      Appointment Details
                    </h2>
                  </div>
                </div>
                <AppointmentForm
                  initialData={contactId ? { contactId } : undefined}
                  onSuccess={() => window.history.back()}
                  onCustomerSelect={(id) => setSelectedCustomerId(id)}
                  onBranchSelect={setSelectedBranchId}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-3">
            {/* Customer Profile Card */}
            <Card className="border-gray-200 bg-white">
              <CardContent className="p-3">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <User className="w-3.5 h-3.5" /> Customer Profile
                </h3>

                {selectedCustomer ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200">
                        <img
                          src={getAvatarUrl(getCustomerName(selectedCustomer))}
                          alt={getCustomerName(selectedCustomer)}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 text-sm">
                          {getCustomerName(selectedCustomer)}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {selectedCustomer.contact_type || "Individual"}
                        </p>
                        {selectedCustomer.company_name && (
                          <p className="text-xs text-gray-600">
                            {selectedCustomer.company_name}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <div className="flex items-center gap-2 text-xs">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600">
                          {selectedCustomer.phone}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <Mail className="w-3 h-3 text-gray-400" />
                        <span className="text-gray-600 truncate">
                          {selectedCustomer.email}
                        </span>
                      </div>
                      {selectedCustomer.branch && (
                        <div className="flex items-center gap-2 text-xs">
                          <Building className="w-3 h-3 text-gray-400" />
                          <span className="text-gray-600">
                            {selectedCustomer.branch.name}
                          </span>
                        </div>
                      )}
                    </div>

                    {selectedCustomer.tags &&
                      selectedCustomer.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-2">
                          {selectedCustomer.tags.map(
                            (tag: string, index: number) => (
                              <Badge
                                key={index}
                                variant="outline"
                                className="text-xs bg-gray-50"
                              >
                                <Tag className="w-2 h-2 mr-1" />
                                {tag}
                              </Badge>
                            )
                          )}
                        </div>
                      )}

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <CreditCard className="w-3 h-3" />
                          <span>Credit Limit</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {selectedCustomer.credit_limit || 0} EGP
                        </p>
                      </div>
                      <div className="bg-gray-50 p-2 rounded">
                        <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                          <CarIcon className="w-3 h-3" />
                          <span>Vehicles</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">
                          {vehicles.filter(
                            (v: any) => v.owner_id === selectedCustomer.id
                          ).length || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <User className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    <p className="text-xs text-gray-500">
                      Select a customer to view profile
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Branch Information Card */}
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="p-3">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <MapPin className="w-3.5 h-3.5" /> Branch Info
                </h3>

                {selectedBranch ? (
                  <div className="space-y-2">
                    <div>
                      <h4 className="font-medium text-gray-900 text-sm">
                        {selectedBranch.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {selectedBranch.city}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <p className="text-xs text-gray-500">Staff</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {branchStatsData?.employees?.total || branchEmployees.length}
                        </p>
                      </div>
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <p className="text-xs text-gray-500">Vehicles</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {branchStatsData?.vehicles?.total || branchVehicles.length}
                        </p>
                      </div>
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <p className="text-xs text-gray-500">Available</p>
                        <p className="text-sm font-semibold text-green-600">
                          {branchStatsData?.employees?.active ||
                            branchEmployees.filter((e: any) => e.status === "active")
                              .length}
                        </p>
                      </div>
                      <div className="bg-white p-2 rounded border border-gray-200">
                        <p className="text-xs text-gray-500">Active</p>
                        <p className="text-sm font-semibold text-blue-600">
                          {branchStatsData?.vehicles?.available ||
                            branchVehicles.filter((v: any) => v.status === "available")
                              .length}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <p className="text-xs text-gray-500 mb-1">
                        Available Staff:
                      </p>
                      <div className="space-y-1">
                        {branchEmployees
                          .filter((e: any) => e.status === "active")
                          .slice(0, 3)
                          .map((employee: any) => (
                            <div
                              key={employee.id}
                              className="flex items-center gap-2 text-xs"
                            >
                              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  {employee.first_name?.charAt(0) || "?"}
                                </span>
                              </div>
                              <span className="text-gray-700">
                                {employee.first_name} {employee.last_name}
                              </span>
                              <Badge
                                variant="outline"
                                className="text-xs bg-green-50 text-green-700 ml-auto"
                              >
                                {employee.position || employee.job_title || "Staff"}
                              </Badge>
                            </div>
                          ))}
                        {branchEmployees.filter((e: any) => e.status === "active")
                          .length > 3 && (
                          <p className="text-xs text-gray-500 text-center">
                            +
                            {branchEmployees.filter(
                              (e: any) => e.status === "active"
                            ).length - 3}{" "}
                            more
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-xs text-gray-600">
                    {branches.slice(0, 4).map((branch: any) => (
                      <div key={branch.id} className="flex items-center gap-2">
                        <MapPin className="w-3 h-3" />
                        <span>{branch.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Types Card */}
            <Card className="border-gray-200 bg-white">
              <CardContent className="p-3">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <CarIcon className="w-3.5 h-3.5" /> Service Types
                </h3>

                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-xs text-gray-700">Test Drive</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs bg-blue-50 text-blue-700"
                    >
                      Popular
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-xs text-gray-700">Service</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs bg-green-50 text-green-700"
                    >
                      Routine
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-xs text-gray-700">Consultation</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs bg-purple-50 text-purple-700"
                    >
                      Common
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-xs text-gray-700">Delivery</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs bg-orange-50 text-orange-700"
                    >
                      New
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-teal-500 rounded-full"></div>
                      <span className="text-xs text-gray-700">Pickup</span>
                    </div>
                    <Badge
                      variant="outline"
                      className="text-xs bg-teal-50 text-teal-700"
                    >
                      Available
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Tips Card */}
            <Card className="border-gray-200 bg-gray-50">
              <CardContent className="p-3">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2 text-sm">
                  <AlertCircle className="w-3.5 h-3.5" /> Quick Tips
                </h3>

                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Select customer first to auto-fill vehicle info</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Check staff availability before booking</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Review customer's service history</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mt-1.5 flex-shrink-0"></div>
                    <span>Confirm branch location and hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </PageShell>
  );
}
