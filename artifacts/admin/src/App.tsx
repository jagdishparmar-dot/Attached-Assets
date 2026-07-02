import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Shell } from "@/components/layout/Shell";

import Dashboard from "@/pages/dashboard";
import Deliveries from "@/pages/deliveries";
import DeliveryNew from "@/pages/delivery-new";
import DeliveryDetail from "@/pages/delivery-detail";
import Drivers from "@/pages/drivers";
import DriverNew from "@/pages/driver-new";
import DriverDetail from "@/pages/driver-detail";
import Vehicles from "@/pages/vehicles";
import VehicleNew from "@/pages/vehicle-new";
import Customers from "@/pages/customers";
import CustomerNew from "@/pages/customer-new";
import CustomerDetail from "@/pages/customer-detail";
import Staff from "@/pages/staff";
import Hubs from "@/pages/hubs";
import Tracking from "@/pages/tracking";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/">
          <Redirect to="/dashboard" />
        </Route>
        
        <Route path="/dashboard" component={Dashboard} />
        
        <Route path="/deliveries/new" component={DeliveryNew} />
        <Route path="/deliveries/:id" component={DeliveryDetail} />
        <Route path="/deliveries" component={Deliveries} />
        
        <Route path="/drivers/new" component={DriverNew} />
        <Route path="/drivers/:id/edit" component={DriverNew} />
        <Route path="/drivers/:id" component={DriverDetail} />
        <Route path="/drivers" component={Drivers} />
        
        <Route path="/vehicles/new" component={VehicleNew} />
        <Route path="/vehicles/:id/edit" component={VehicleNew} />
        <Route path="/vehicles" component={Vehicles} />
        
        <Route path="/customers/new" component={CustomerNew} />
        <Route path="/customers/:id/edit" component={CustomerNew} />
        <Route path="/customers/:id" component={CustomerDetail} />
        <Route path="/customers" component={Customers} />

        <Route path="/staff" component={Staff} />
        <Route path="/hubs" component={Hubs} />
        <Route path="/tracking" component={Tracking} />
        
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
