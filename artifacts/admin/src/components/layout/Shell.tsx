import React from "react";
import { Link, useLocation } from "wouter";
import logoUrl from "@assets/Screenshot_2026-06-29_at_8.17.10_PM_1782744451491.png";
import { 
  LayoutDashboard, 
  Truck, 
  Users, 
  Car, 
  Building2, 
  MapPin,
  Bell
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const OPS_NAV = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard },
  { title: "Deliveries", url: "/admin/deliveries", icon: Truck },
  { title: "Drivers", url: "/admin/drivers", icon: Users },
  { title: "Vehicles", url: "/admin/vehicles", icon: Car },
  { title: "Customers", url: "/admin/customers", icon: Building2 },
];

const WORKFORCE_NAV = [
  { title: "Staff", url: "/admin/staff", icon: Users },
  { title: "Live Tracking", url: "/admin/tracking", icon: MapPin },
];

function NavGroup({ label, items, location }: { label: string; items: typeof OPS_NAV; location: string }) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-sidebar-foreground/50 text-xs font-semibold uppercase tracking-wider mt-4 mb-2 px-6">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const isActive = location.startsWith(item.url);
            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
                  <Link
                    href={item.url}
                    className={`flex items-center gap-3 px-6 py-2.5 transition-colors ${isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"}`}
                  >
                    <item.icon className="h-5 w-5" />
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

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-muted/30">
        <Sidebar className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
          <SidebarHeader className="h-16 flex items-center px-6 border-b border-sidebar-border">
            <img src={logoUrl} alt="Coldverse" className="h-9 w-auto object-contain" />
          </SidebarHeader>
          <SidebarContent>
            <NavGroup label="Operations" items={OPS_NAV} location={location} />
            <NavGroup label="Workforce" items={WORKFORCE_NAV} location={location} />
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          <header className="h-16 flex items-center justify-between px-6 bg-card border-b border-border shrink-0 sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="-ml-2" />
              <h1 className="text-lg font-semibold tracking-tight">Admin Console</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="text-muted-foreground relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-destructive"></span>
              </Button>
              <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-medium">
                JS
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
