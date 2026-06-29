import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import driversRouter from "./drivers";
import vehiclesRouter from "./vehicles";
import customersRouter from "./customers";
import deliveriesRouter from "./deliveries";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(driversRouter);
router.use(vehiclesRouter);
router.use(customersRouter);
router.use(deliveriesRouter);

export default router;
