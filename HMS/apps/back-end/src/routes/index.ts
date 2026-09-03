import { Router } from "express";

import appointmentRouter from "./appointment.routes.ts";
import auditLogRouter from "./audit-log.routes.ts";
import billRouter from "./bill.routes.ts";
import dashboardRouter from "./dashboard.routes.ts";
import doctorRouter from "./doctor.routes.ts";
import medicalRecordRouter from "./medical-record.routes.ts";
import patientRouter from "./patient.routes.ts";
import userRouter from "./user.routes.ts";

export const apiRouter = Router();

apiRouter.use("/users", userRouter);
apiRouter.use("/doctors", doctorRouter);
apiRouter.use("/patients", patientRouter);
apiRouter.use("/appointments", appointmentRouter);
apiRouter.use("/medical-records", medicalRecordRouter);
apiRouter.use("/bills", billRouter);
apiRouter.use("/audit-logs", auditLogRouter);
apiRouter.use("/dashboard", dashboardRouter);
