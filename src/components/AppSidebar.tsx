import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Car,
  Wrench,
  FileText,
  Package,
  BarChart3,
  Phone,
  BookOpen,
  LogOut,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { usePermissions } from "@/hooks/usePermissions";

// pageKey matches the keys defined in PAGE_PERMISSIONS in usePermissions.ts
// undefined pageKey = always visible (Home)
const navItems = [
  { to: "/",            icon: Home,     image: null,                label: "Home",        pageKey: undefined  },
  { to: "/appointments",icon: null,     image: "/Appointments.png", label: "Appointments",pageKey: "appointments" },
  { to: "/contacts",    icon: null,     image: "/Contact.png",      label: "Contacts",    pageKey: "contacts"     },
  { to: "/helpdesk",    icon: null,     image: "/helpdesk.png",     label: "Helpdesk",    pageKey: "helpdesk"     },
  { to: "/vehicles",    icon: null,     image: "/cars.png",         label: "Vehicles",    pageKey: "vehicles"     },
  { to: "/phonecalls",  icon: Phone,    image: null,                label: "Phone Calls", pageKey: "phonecalls"   },
  { to: "/sales",       icon: null,     image: "/carss.png",        label: "Sales & Leads", pageKey: "sales"      },
  { to: "/knowledge",   icon: BookOpen, image: null,                label: "Knowledge",   pageKey: "knowledge"    },
  { to: "/settings-api",icon: null,     image: "/setting.png",    label: "Settings",    pageKey: "settings"     },
  { to: "/system",      icon: Activity, image: null,                label: "System Status", pageKey: "system"     },
  // Coming-soon items — always shown but disabled
  { to: "/",            icon: Wrench,   image: null,  label: "Workshop",  disabled: true },
  { to: "/",            icon: FileText, image: null,  label: "Invoicing", disabled: true },
  { to: "/",            icon: Package,  image: null,  label: "Inventory", disabled: true },
  { to: "/",            icon: BarChart3,image: null,  label: "Dashboards",disabled: true },
];

interface AppSidebarProps {
  collapsed?: boolean;
  onToggle?: () => void;
  currentTitle?: string;
}

export function AppSidebar({ collapsed = false, onToggle, currentTitle }: AppSidebarProps) {
  const location = useLocation();
  const { user, logout, isAuthenticated } = useAuth();
  const { canPage } = usePermissions();

  // Filter to items the user is allowed to see
  const visibleItems = navItems.filter((item) => {
    if ((item as any).disabled) return true; // keep disabled "coming soon" items
    if (!item.pageKey) return true;          // no pageKey = always visible (Home)
    return canPage(item.pageKey);
  });

  return (
    <div
      className={cn(
        "fixed left-0 top-0 h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40 flex flex-col",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Toggle Button */}
      <div className="absolute -right-3 top-20 transform z-50">
        <Button
          variant="outline"
          size="icon"
          className="h-6 w-6 rounded-full bg-background border-sidebar-border shadow-md"
          onClick={onToggle}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-transparent">
            <img src="/cars.png" alt="Auto Group Hub" className="h-14 w-14 object-contain" />
          </div>
          {!collapsed && (
            <div>
              <p className="font-bold text-sm text-sidebar-foreground">Auto Group Hub</p>
              <p className="text-xs text-sidebar-foreground/60">System Settings</p>
            </div>
          )}
        </div>
      </div>

      {/* Current page title */}
      {!collapsed && currentTitle && (
        <div className="px-4 py-3 border-b border-sidebar-border bg-sidebar-accent/50">
          <p className="text-sm font-semibold text-sidebar-foreground truncate">{currentTitle}</p>
        </div>
      )}

      {/* Navigation */}
      <nav
        className="p-3 space-y-1 overflow-y-auto flex-1 custom-scrollbar"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#bcbcbc #2d2d2d" }}
      >
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 8px; background: #252530; border-radius: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, #6366F1 30%, #252530 100%);
            border-radius: 7px; min-height: 20px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, #818CF8 30%, #363640 100%);
          }
        `}</style>

        {visibleItems.map((item, idx) => {
          const isActive = location.pathname === item.to && item.to !== "/";
          const isHomePage = item.to === "/" && item.label === "Home";
          const active = isHomePage ? location.pathname === "/" : isActive;
          const Icon = item.icon;
          const label = item.label;

          // Disabled / coming-soon
          if ((item as any).disabled) {
            return (
              <div
                key={`${label}-${idx}`}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/40 cursor-not-allowed select-none",
                  collapsed && "justify-center"
                )}
                title="Coming Soon"
              >
                {item.image ? (
                  <img src={item.image} alt={label} className="h-10 w-10 opacity-40 object-contain" />
                ) : Icon && (
                  <Icon className="h-6 w-6 opacity-40" />
                )}
                {!collapsed && <span className="text-sm font-medium">{label}</span>}
              </div>
            );
          }

          return (
            <Link
              key={`${label}-${idx}`}
              to={item.to}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative overflow-hidden",
                active
                  ? "bg-primary text-primary-foreground font-semibold shadow-md shadow-primary/20"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center"
              )}
            >
              {active && (
                <div className="absolute left-0 top-0 w-1 h-full bg-white/20" />
              )}
              {item.image ? (
                <img
                  src={item.image}
                  alt={label}
                  className={cn(
                    "h-10 w-10 transition-transform group-hover:scale-110 object-contain",
                    active ? "" : "opacity-70 group-hover:opacity-100"
                  )}
                />
              ) : Icon && (
                <Icon className={cn(
                  "h-6 w-6 transition-transform group-hover:scale-110",
                  active
                    ? "text-primary-foreground"
                    : "text-sidebar-foreground/70 group-hover:text-sidebar-accent-foreground"
                )} />
              )}
              {!collapsed && <span className="text-sm tracking-wide">{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User info & logout */}
      <div className="p-3 border-t border-sidebar-border">
        {isAuthenticated ? (
          <div className="space-y-2">
            {!collapsed && (
              <div className="px-3 py-2">
                <p className="text-xs font-medium text-sidebar-foreground">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-sidebar-foreground/60 capitalize">
                  {user?.role?.replace('_', ' ')}
                </p>
              </div>
            )}
            <button
              onClick={logout}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                collapsed && "justify-center"
              )}
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span className="text-sm">Logout</span>}
            </button>
          </div>
        ) : (
          <a
            href="/login"
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 w-full",
              "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="text-sm">Login</span>}
          </a>
        )}
      </div>
    </div>
  );
}
