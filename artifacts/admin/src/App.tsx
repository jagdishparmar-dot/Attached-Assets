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
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/">
          <Redirect to="/admin/dashboard" />
        </Route>
        <Route path="/admin">
          <Redirect to="/admin/dashboard" />
        </Route>
        
        <Route path="/admin/dashboard" component={Dashboard} />
        
        <Route path="/admin/deliveries/new" component={DeliveryNew} />
        <Route path="/admin/deliveries/:id" component={DeliveryDetail} />
        <Route path="/admin/deliveries" component={Deliveries} />
        
        <Route path="/admin/drivers/new" component={DriverNew} />
        <Route path="/admin/drivers/:id" component={DriverDetail} />
        <Route path="/admin/drivers" component={Drivers} />
        
        <Route path="/admin/vehicles/new" component={VehicleNew} />
        <Route path="/admin/vehicles" component={Vehicles} />
        
        <Route path="/admin/customers/new" component={CustomerNew} />
        <Route path="/admin/customers/:id" component={CustomerDetail} />
        <Route path="/admin/customers" component={Customers} />
        
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
