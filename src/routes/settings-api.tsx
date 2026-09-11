import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useSettings, useApiMutation } from "@/hooks/use-api";
import { PageShell } from "@/components/AppTopbar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAuth } from "@/contexts/auth-context";
import {
  Settings2,
  Bell,
  Globe,
  Shield,
  Database,
  Save,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/settings-api")({
  head: () => ({
    meta: [
      { title: "System Settings — Auto Group Hub" },
      {
        name: "description",
        content: "System settings management",
      },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const { data: settingsData, isLoading, refetch } = useSettings();
  const [activeTab, setActiveTab] = useState("general");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [hasChanges, setHasChanges] = useState(false);
  const [localSettings, setLocalSettings] = useState<any>({});

  // Update local settings when data loads
  useEffect(() => {
    if (settingsData?.data) {
      const settingsMap: any = {};
      settingsData.data.forEach((setting: any) => {
        settingsMap[setting.key] = setting;
      });
      setLocalSettings(settingsMap);
    }
  }, [settingsData?.data]);

  const updateSettingMutation = useApiMutation(
    async ({ key, value }: { key: string; value: any }) => {
      return await (await import('@/lib/api-client')).default.updateSetting(key, { value });
    },
    {
      onSuccess: () => {
        toast.success("Setting updated successfully");
        refetch();
        setHasChanges(false);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to update setting");
      },
    }
  );

  const bulkUpdateMutation = useApiMutation(
    async (settings: any[]) => {
      return await (await import('@/lib/api-client')).default.bulkUpdateSettings({ settings });
    },
    {
      onSuccess: () => {
        toast.success("Settings updated successfully");
        refetch();
        setHasChanges(false);
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || "Failed to update settings");
      },
    }
  );

  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings((prev: any) => ({
      ...prev,
      [key]: { ...prev[key], value }
    }));
    setHasChanges(true);
  };

  const handleSaveAll = () => {
    const changes = Object.entries(localSettings)
      .filter(([key, setting]: [string, any]) => {
        const original = settingsData?.data?.find((s: any) => s.key === key);
        return original && original.value !== setting.value;
      })
      .map(([key, setting]: [string, any]) => ({
        key,
        value: setting.value
      }));

    if (changes.length > 0) {
      bulkUpdateMutation.mutate(changes);
    }
  };

  const handleReset = () => {
    if (settingsData?.data) {
      const settingsMap: any = {};
      settingsData.data.forEach((setting: any) => {
        settingsMap[setting.key] = setting;
      });
      setLocalSettings(settingsMap);
      setHasChanges(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} currentTitle="System Settings" />
        <div className={cn("transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
          <PageShell title="System Settings" subtitle="Manage your system configuration" showTopbar={false}>
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          </PageShell>
        </div>
      </div>
    );
  }

  const getSettingValue = (key: string, defaultValue: any = '') => {
    return localSettings[key]?.value ?? defaultValue;
  };

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} currentTitle="System Settings" />
      <div className={cn("transition-all duration-300", sidebarCollapsed ? "ml-16" : "ml-64")}>
        <PageShell title="System Settings" subtitle="Manage your system configuration" showTopbar={false}>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
                <p className="text-muted-foreground mt-1">
                  Manage your system configuration and preferences
                </p>
              </div>
              <div className="flex gap-2">
                {hasChanges && (
                  <>
                    <Button variant="outline" onClick={handleReset}>
                      Reset
                    </Button>
                    <Button onClick={handleSaveAll} disabled={bulkUpdateMutation.isPending}>
                      {bulkUpdateMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Save Changes
                    </Button>
                  </>
                )}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="branch">Branch</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
                <TabsTrigger value="notification">Notifications</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      General Settings
                    </CardTitle>
                    <CardDescription>
                      Basic application configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="app_name">Application Name</Label>
                        <Input
                          id="app_name"
                          value={getSettingValue('app_name', 'Car Branch Manager')}
                          onChange={(e) => handleSettingChange('app_name', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="app_timezone">Timezone</Label>
                        <Input
                          id="app_timezone"
                          value={getSettingValue('app_timezone', 'UTC')}
                          onChange={(e) => handleSettingChange('app_timezone', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="date_format">Date Format</Label>
                        <Select
                          value={getSettingValue('date_format', 'YYYY-MM-DD')}
                          onValueChange={(value) => handleSettingChange('date_format', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="time_format">Time Format</Label>
                        <Select
                          value={getSettingValue('time_format', 'HH:mm')}
                          onValueChange={(value) => handleSettingChange('time_format', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="HH:mm">24 Hour (HH:mm)</SelectItem>
                            <SelectItem value="hh:mm">12 Hour (hh:mm)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <Input
                          id="currency"
                          value={getSettingValue('currency', 'USD')}
                          onChange={(e) => handleSettingChange('currency', e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="language">Language</Label>
                        <Select
                          value={getSettingValue('language', 'en')}
                          onValueChange={(value) => handleSettingChange('language', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="ar">Arabic</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="branch" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Branch Settings
                    </CardTitle>
                    <CardDescription>
                      Branch-specific configuration
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="items_per_page">Items Per Page</Label>
                      <Input
                        id="items_per_page"
                        type="number"
                        value={getSettingValue('items_per_page', '20')}
                        onChange={(e) => handleSettingChange('items_per_page', parseInt(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="system" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings2 className="h-5 w-5" />
                      System Settings
                    </CardTitle>
                    <CardDescription>
                      System configuration and performance
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="session_timeout">Session Timeout (minutes)</Label>
                      <Input
                        id="session_timeout"
                        type="number"
                        value={getSettingValue('session_timeout', '30')}
                        onChange={(e) => handleSettingChange('session_timeout', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="max_upload_size">Max Upload Size (bytes)</Label>
                      <Input
                        id="max_upload_size"
                        type="number"
                        value={getSettingValue('max_upload_size', '5242880')}
                        onChange={(e) => handleSettingChange('max_upload_size', parseInt(e.target.value))}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="notification" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Settings
                    </CardTitle>
                    <CardDescription>
                      Configure system notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Enable Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Enable system-wide notifications
                        </p>
                      </div>
                      <Switch
                        checked={getSettingValue('enable_notifications', 'true') === 'true'}
                        onCheckedChange={(checked) => handleSettingChange('enable_notifications', checked.toString())}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Email Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via email
                        </p>
                      </div>
                      <Switch
                        checked={getSettingValue('enable_email_notifications', 'true') === 'true'}
                        onCheckedChange={(checked) => handleSettingChange('enable_email_notifications', checked.toString())}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>SMS Notifications</Label>
                        <p className="text-sm text-muted-foreground">
                          Receive notifications via SMS
                        </p>
                      </div>
                      <Switch
                        checked={getSettingValue('enable_sms_notifications', 'false') === 'true'}
                        onCheckedChange={(checked) => handleSettingChange('enable_sms_notifications', checked.toString())}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>
                      Security and access control
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Security settings are managed at the system level. Contact your administrator for changes.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </PageShell>
      </div>
    </div>
  );
}
