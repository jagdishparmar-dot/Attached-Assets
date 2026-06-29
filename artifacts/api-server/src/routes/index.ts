import { Router, type IRouter } from "express";
import healthRouter from "./health";
import dashboardRouter from "./dashboard";
import driversRouter from "./drivers";
import vehiclesRouter from "./vehicles";
import customersRouter from "./customers";
import deliveriesRouter from "./deliveries";
import staffRouter from "./staff";
import attendanceRouter from "./attendance";
import locationsRouter from "./locations";
import hubsRouter from "./hubs";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(dashboardRouter);
router.use(driversRouter);
router.use(vehiclesRouter);
router.use(customersRouter);
router.use(deliveriesRouter);
router.use(staffRouter);
router.use(attendanceRouter);
router.use(locationsRouter);
router.use(hubsRouter);
router.use(aiRouter);

export default router;
