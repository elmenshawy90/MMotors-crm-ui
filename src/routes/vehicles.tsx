import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  UserPlus,
  X,
  ListFilter,
} from "lucide-react";
import { VehicleForm } from "@/components/forms/VehicleForm";
import { ContactForm } from "@/components/forms/ContactForm";
import { AppSidebar } from "@/components/AppSidebar";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Car,
  Search,
  Filter,
  Plus,
  MoreVertical,
  Calendar,
  Gauge,
  Fuel,
  Settings,
  Shield,
  TrendingUp,
  Wrench,
  AlertCircle,
  ArrowRight,
  ChevronDown,
  CheckCircle2,
  Clock,
  MapPin,
  User,
  Truck,
  Zap,
  DollarSign,
  Building2,
  Bus,
} from "lucide-react";

export const Route = createFileRoute("/vehicles")({
  component: VehiclesPage,
});

const MODELS_STORAGE_KEY = "vehicle_custom_models";

function VehiclesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedVehicles, setSelectedVehicles] = useState<Set<string>>(new Set());
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  // Custom models management
  const [customModels, setCustomModels] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(MODELS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isModelsDialogOpen, setIsModelsDialogOpen] = useState(false);
  const [newModelInput, setNewModelInput] = useState("");

  const saveCustomModels = (models: string[]) => {
    setCustomModels(models);
    localStorage.setItem(MODELS_STORAGE_KEY, JSON.stringify(models));
  };

  const addCustomModel = () => {
    const trimmed = newModelInput.trim();
    if (!trimmed) return;
    if (customModels.includes(trimmed)) {
      setNewModelInput("");
      return;
    }
    saveCustomModels([...customModels, trimmed]);
    setNewModelInput("");
  };

  const removeCustomModel = (model: string) => {
    saveCustomModels(customModels.filter((m) => m !== model));
    if (modelFilter === model) setModelFilter("all");
  };

  // Fetch vehicles from API
  const { data: vehiclesData, isLoading: vehiclesLoading, refetch } = useQuery({
    queryKey: ['vehicles', { branch_id: branchFilter, status: statusFilter, category: categoryFilter, search: searchQuery, sort_by: sortBy }],
    queryFn: () => apiClient.getVehicles({ branch_id: branchFilter, status: statusFilter, category: categoryFilter, search: searchQuery, sort_by: sortBy }),
  });

  // Fetch vehicle statistics from API
  const { data: statsData } = useQuery({
    queryKey: ['vehicleStats', { branch_id: branchFilter }],
    queryFn: () => apiClient.getVehicleStats({ branch_id: branchFilter }),
  });

  // Fetch branches for filter
  const { data: branchesData } = useQuery({
    queryKey: ['branches'],
    queryFn: () => apiClient.getBranches(),
  });

  const vehicles = vehiclesData?.data || [];
  const stats = statsData || {
    totalVehicles: 0,
    statusStats: {
      available: 0,
      reserved: 0,
      in_service: 0,
      sold: 0,
      maintenance: 0,
      out_of_service: 0
    },
    avgMileage: 0,
    totalValue: 0,
    categoryStats: {}
  };
  const branches = branchesData?.data || [];

  // Calculate statistics from API data
  const totalVehicles = stats.totalVehicles;
  const activeVehicles = stats.statusStats.available || 0;
  const inServiceVehicles = stats.statusStats.in_service || 0;
  const maintenanceVehicles = stats.statusStats.maintenance || 0;
  const reservedVehicles = stats.statusStats.reserved || 0;
  const soldVehicles = stats.statusStats.sold || 0;
  const avgMileage = stats.avgMileage;
  const totalValue = stats.totalValue;

  // Filter vehicles (client-side filtering for model)
  const filteredVehicles = vehicles.filter((vehicle: any) => {
    const matchesModel = modelFilter === "all" || vehicle.model === modelFilter;
    return matchesModel;
  });

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedVehicles);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedVehicles(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedVehicles.size === filteredVehicles.length) {
      setSelectedVehicles(new Set());
    } else {
      setSelectedVehicles(new Set(filteredVehicles.map((v) => v.id)));
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-700 border-green-200";
      case "in_service":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "maintenance":
        return "bg-orange-100 text-orange-700 border-orange-200";
      case "reserved":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "sold":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "out_of_service":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getFuelIcon = (fuelType: string) => {
    switch (fuelType) {
      case "Petrol":
        return <Fuel className="h-4 w-4" />;
      case "Diesel":
        return <Truck className="h-4 w-4" />;
      case "Hybrid":
        return <Zap className="h-4 w-4" />;
      case "Electric":
        return <Zap className="h-4 w-4" />;
      default:
        return <Fuel className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Sedan":
        return <Car className="h-8 w-8" />;
      case "SUV":
        return <Truck className="h-8 w-8" />;
      case "Hatchback":
        return <Car className="h-8 w-8" />;
      case "Pickup":
        return <Truck className="h-8 w-8" />;
      case "Van":
        return <Bus className="h-8 w-8" />;
      default:
        return <Car className="h-8 w-8" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentTitle="Vehicle Management"
      />
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-white py-8 px-6 shadow-lg">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                <Car className="h-10 w-10" />
                Vehicle Management
              </h1>
              <p className="text-white/90 text-lg">
                Manage your entire vehicle fleet with comprehensive tracking
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* ── Add Contact ── */}
              <Dialog open={isAddContactDialogOpen} onOpenChange={setIsAddContactDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:text-white shadow-lg button-press"
                  >
                    <UserPlus className="mr-2 h-5 w-5" />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <UserPlus className="h-5 w-5 text-primary" />
                      Add New Contact
                    </DialogTitle>
                  </DialogHeader>
                  <ContactForm
                    onSuccess={() => setIsAddContactDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>

              {/* ── Add Vehicle ── */}
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="lg"
                    className="bg-white text-primary hover:bg-white/90 shadow-lg button-press"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Add Vehicle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Vehicle</DialogTitle>
                  </DialogHeader>
                  <VehicleForm
                    onSuccess={() => {
                      setIsAddDialogOpen(false);
                      refetch();
                    }}
                  />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Category Filter Badges */}
        <div className="flex flex-wrap gap-3">
          <Button
            variant={categoryFilter === "all" ? "default" : "outline"}
            size="lg"
            onClick={() => setCategoryFilter("all")}
            className={cn(
              "flex flex-col items-center gap-2 p-4 min-w-[100px] h-auto",
              categoryFilter === "all" ? "bg-primary text-white" : "hover:bg-primary/10"
            )}
          >
            <Car className="h-8 w-8" />
            <span className="text-xs">All</span>
          </Button>
          {Object.keys(stats.categoryStats).map((category) => (
            <Button
              key={category}
              variant={categoryFilter === category ? "default" : "outline"}
              size="lg"
              onClick={() => setCategoryFilter(category)}
              className={cn(
                "flex flex-col items-center gap-2 p-4 min-w-[100px] h-auto",
                categoryFilter === category ? "bg-primary text-white" : "hover:bg-primary/10"
              )}
            >
              {getCategoryIcon(category)}
              <span className="text-xs">{category}</span>
            </Button>
          ))}
        </div>

        {/* Statistics Dashboard */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 card-stagger">
          <Card className="bg-white/95 backdrop-blur-sm hover-lift transition-all button-press shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Vehicles</p>
                  <p className="text-3xl font-bold text-gray-900 stat-counter">{totalVehicles}</p>
                </div>
                <div className="p-3 rounded-xl bg-primary/10">
                  <Car className="h-6 w-6 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Fleet Value</span>
                  <span className="text-primary font-medium">
                    EGP {(totalValue / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: "100%" }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm hover-lift transition-all button-press shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Active Vehicles</p>
                  <p className="text-3xl font-bold text-gray-900 stat-counter">{activeVehicles}</p>
                </div>
                <div className="p-3 rounded-xl bg-green-100">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">In Service</span>
                  <span className="text-blue-600 font-medium">{inServiceVehicles}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${(activeVehicles / totalVehicles) * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm hover-lift transition-all button-press shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Mileage</p>
                  <p className="text-3xl font-bold text-gray-900 stat-counter">
                    {avgMileage.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-orange-100">
                  <Gauge className="h-6 w-6 text-orange-600" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Maintenance</span>
                  <span className="text-orange-600 font-medium">{maintenanceVehicles}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-500 rounded-full" style={{ width: "65%" }}></div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/95 backdrop-blur-sm hover-lift transition-all button-press shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Reserved</p>
                  <p className="text-3xl font-bold text-gray-900 stat-counter">{reservedVehicles}</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-100">
                  <Clock className="h-6 w-6 text-purple-600" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Sold</span>
                  <span className="text-gray-600 font-medium">{soldVehicles}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full"
                    style={{ width: `${(reservedVehicles / totalVehicles) * 100}%` }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
          <CardContent className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by VIN, plate, or model..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 transition-all focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div className="flex gap-3 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px] transition-all focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="available">Available</SelectItem>
                    <SelectItem value="in_service">In Service</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="reserved">Reserved</SelectItem>
                    <SelectItem value="sold">Sold</SelectItem>
                    <SelectItem value="out_of_service">Out of Service</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={modelFilter} onValueChange={setModelFilter}>
                  <SelectTrigger className="w-[180px] transition-all focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Model" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {Array.from(
                      new Set([
                        ...vehicles.map((v: any) => v.model),
                        ...customModels,
                      ])
                    ).map((model) => (
                      <SelectItem key={model} value={model}>
                        {model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* ── Manage Models ── */}
                <Dialog open={isModelsDialogOpen} onOpenChange={setIsModelsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="shrink-0 transition-all focus:ring-2 focus:ring-primary/20"
                      title="Manage Models"
                    >
                      <ListFilter className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <ListFilter className="h-5 w-5 text-primary" />
                        Manage Models
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      {/* Add new model */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="Enter model name..."
                          value={newModelInput}
                          onChange={(e) => setNewModelInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") addCustomModel();
                          }}
                          className="flex-1"
                        />
                        <Button onClick={addCustomModel} disabled={!newModelInput.trim()}>
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>

                      {/* Models list */}
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {customModels.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No custom models added yet.
                          </p>
                        ) : (
                          customModels.map((model) => (
                            <div
                              key={model}
                              className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-200"
                            >
                              <div className="flex items-center gap-2">
                                <Car className="h-4 w-4 text-gray-500" />
                                <span className="text-sm font-medium text-gray-800">{model}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                onClick={() => removeCustomModel(model)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Models from API (read-only display) */}
                      {vehicles.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs text-gray-500 mb-2">Models from existing vehicles:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from(new Set(vehicles.map((v: any) => v.model))).map((model) => (
                              <Badge key={model} variant="secondary" className="text-xs">
                                {model}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
                <Select value={branchFilter} onValueChange={setBranchFilter}>
                  <SelectTrigger className="w-[180px] transition-all focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Branch" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Branches</SelectItem>
                    {branches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[150px] transition-all focus:ring-2 focus:ring-primary/20">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recent">Most Recent</SelectItem>
                    <SelectItem value="mileage">Mileage (Low)</SelectItem>
                    <SelectItem value="mileage-desc">Mileage (High)</SelectItem>
                    <SelectItem value="plate">License Plate</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedVehicles.size > 0 && (
          <Card className="bg-primary/5 backdrop-blur-sm border-primary/20 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-700">
                    {selectedVehicles.size} vehicle{selectedVehicles.size > 1 ? "s" : ""} selected
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="hover-lift">
                    <Wrench className="mr-2 h-4 w-4" />
                    Schedule Service
                  </Button>
                  <Button variant="outline" size="sm" className="hover-lift">
                    <Shield className="mr-2 h-4 w-4" />
                    Check Warranty
                  </Button>
                  <Button variant="outline" size="sm" className="hover-lift">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vehicle Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVehicles.map((vehicle: any, index: number) => {
            const isSelected = selectedVehicles.has(vehicle.id);

            return (
              <Card
                key={vehicle.id}
                className={cn(
                  "bg-white/95 backdrop-blur-sm hover-lift transition-all button-press shadow-lg",
                  isSelected && "ring-2 ring-primary ring-offset-2"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Car className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg font-semibold text-gray-900">
                          {vehicle.make} {vehicle.model}
                        </CardTitle>
                        <p className="text-sm text-gray-500">{vehicle.year} • {vehicle.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", getStatusColor(vehicle.status))}>
                        {vehicle.status.replace('_', ' ')}
                      </Badge>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(vehicle.id)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-gray-100">
                        <Gauge className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Mileage</p>
                        <p className="font-medium text-gray-900">{vehicle.mileage?.toLocaleString() || 0} km</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-gray-100">
                        {getFuelIcon(vehicle.fuel_type)}
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Fuel</p>
                        <p className="font-medium text-gray-900">{vehicle.fuel_type || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-gray-100">
                        <Settings className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Transmission</p>
                        <p className="font-medium text-gray-900">{vehicle.transmission || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded bg-gray-100">
                        <DollarSign className="h-3.5 w-3.5 text-gray-600" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Price</p>
                        <p className="font-medium text-gray-900">{vehicle.price ? `EGP ${vehicle.price.toLocaleString()}` : 'N/A'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-gray-100 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">VIN</span>
                      <span className="font-mono text-gray-900 text-xs">{vehicle.vin || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">License Plate</span>
                      <span className="font-semibold text-gray-900">{vehicle.license_plate}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Color</span>
                      <span className="text-gray-900">{vehicle.color || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">Branch</span>
                      <span className="text-gray-900">{vehicle.branch?.name || 'N/A'}</span>
                    </div>
                    {vehicle.owner && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Owner</span>
                        <span className="text-gray-900">{vehicle.owner.first_name} {vehicle.owner.last_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>Purchased: {vehicle.purchase_date ? new Date(vehicle.purchase_date).toLocaleDateString() : 'N/A'}</span>
                    </div>
                    <Link
                      to={`/vehicles/${vehicle.id}`}
                      className="flex items-center gap-1 text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                    >
                      View Details <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredVehicles.length === 0 && (
          <Card className="bg-white/95 backdrop-blur-sm shadow-lg">
            <CardContent className="p-12 text-center">
              <Car className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No vehicles found</h3>
              <p className="text-gray-500 mb-4">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <Button onClick={() => setIsAddDialogOpen(true)} className="button-press">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Vehicle
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
      </div>
    </div>
  );
}
