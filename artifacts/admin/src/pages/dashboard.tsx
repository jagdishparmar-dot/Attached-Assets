import React from "react";
import { useGetDashboardStats, useGetDashboardActivity } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, Truck, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: activity, isLoading: activityLoading } = useGetDashboardActivity();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Operations Overview</h2>
      </div>

      {statsLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Deliveries"
            value={stats.totalDeliveries}
            icon={<Package className="h-4 w-4 text-muted-foreground" />}
          />
          <StatCard
            title="In Transit"
            value={stats.inTransitDeliveries}
            icon={<Truck className="h-4 w-4 text-primary" />}
          />
          <StatCard
            title="Delivered Today"
            value={stats.deliveredToday}
            icon={<CheckCircle2 className="h-4 w-4 text-emerald-500" />}
          />
          <StatCard
            title="Failed/Issues"
            value={stats.failedToday}
            icon={<AlertTriangle className="h-4 w-4 text-destructive" />}
          />
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Delivery Status Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <Skeleton className="h-[200px] w-full" />
            ) : stats ? (
              <div className="flex h-32 items-center justify-between px-4 border rounded-lg bg-muted/20">
                <PipelineStep label="Pending" value={stats.pendingDeliveries} color="bg-amber-500" />
                <div className="h-px bg-border flex-1 mx-4" />
                <PipelineStep label="Assigned" value={stats.assignedDeliveries} color="bg-blue-500" />
                <div className="h-px bg-border flex-1 mx-4" />
                <PipelineStep label="In Transit" value={stats.inTransitDeliveries} color="bg-indigo-500" />
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : activity ? (
              <div className="space-y-4">
                {activity.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-start gap-4 text-sm">
                    <div className="p-2 rounded-full bg-primary/10 text-primary mt-0.5">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">{item.message}</p>
                      <p className="text-muted-foreground text-xs">{new Date(item.time).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string; value: number | string; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function PipelineStep({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${color}`}>
        {value}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
