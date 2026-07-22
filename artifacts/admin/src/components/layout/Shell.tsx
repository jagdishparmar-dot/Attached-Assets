import React from "react";
import { Link, useLocation } from "wouter";
import { BrandLogo } from "@/components/brand/BrandLogo";
import {
  LayoutDashboard,
  Truck,
  Users,
  Car,
  Building2,
  MapPin,
  Warehouse,
  Bell,
  LogOut,
  CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, initials } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }> };

const OVERVIEW_NAV: NavItem[] = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
];

const LOGISTICS_NAV: NavItem[] = [
  { title: "Deliveries", url: "/deliveries", icon: Truck },
  { title: "Customers", url: "/customers", icon: Building2 },
];

const FLEET_NAV: NavItem[] = [
  { title: "Drivers", url: "/drivers", icon: Users },
  { title: "Vehicles", url: "/vehicles", icon: Car },
  { title: "Live Tracking", url: "/tracking", icon: MapPin },
];

const WORKFORCE_NAV: NavItem[] = [
  { title: "Staff", url: "/staff", icon: Users },
  { title: "Attendance", url: "/attendance", icon: CalendarCheck },
];

const NETWORK_NAV: NavItem[] = [
  { title: "Hubs", url: "/hubs", icon: Warehouse },
];

function NavGroup({ label, items, location }: { label: string; items: NavItem[]; location: string }) {
  return (
    <SidebarGroup className="px-2 py-0">
      <SidebarGroupLabel className="px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/40">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => {
            const isActive = location.startsWith(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link
                    href={item.url}
                    className={cn(
                      "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                    )}
                  >
                    {isActive && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-primary" />
                    )}
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-primary" : "text-sidebar-foreground/55",
                      )}
                    />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { admin, logout } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="border-b border-sidebar-border/80 p-0">
            <div className="relative overflow-hidden px-4 py-4">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,60,0,0.14),transparent_55%)]" />
              <div className="relative">
                <BrandLogo size="md" />
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-3 py-3">
            <NavGroup label="Overview" items={OVERVIEW_NAV} location={location} />
            <NavGroup label="Logistics" items={LOGISTICS_NAV} location={location} />
            <NavGroup label="Fleet" items={FLEET_NAV} location={location} />
            <NavGroup label="Workforce" items={WORKFORCE_NAV} location={location} />
            <NavGroup label="Network" items={NETWORK_NAV} location={location} />
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 bg-card border-b border-border shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2" />
              <h1 className="text-lg font-semibold tracking-tight">Admin Console</h1>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-destructive" />
              </Button>
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium leading-none">{admin?.name}</p>
                <p className="text-xs text-muted-foreground mt-1 capitalize">{admin?.role}</p>
              </div>
              <div
                className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-medium text-sm"
                title={admin?.name}
              >
                {admin ? initials(admin.name) : "?"}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                onClick={() => void logout()}
                title="Sign out"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
