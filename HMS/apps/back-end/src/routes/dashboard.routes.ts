import { Router } from "express";

import { requireAuth } from "../middleware/index.ts";
import { getDashboardStats } from "../services/dashboard.service.ts";

const router = Router();

router.use(requireAuth);

/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     tags: [Reports]
 *     summary: Get dashboard statistics
 *     description: >
 *       A point-in-time operational snapshot for the whole hospital: patient
 *       and doctor headcounts, today's open appointments, pending bills, revenue
 *       collected since the first of the month, the total outstanding balance,
 *       and up to ten of today's upcoming appointments earliest-first.
 *
 *
 *       Every count is scoped to non-deleted rows, so the numbers always agree
 *       with the register views.
 *
 *
 *       **Authentication:** session cookie required. Any signed-in role may read
 *       the dashboard.
 *     operationId: getDashboardStats
 *     responses:
 *       200:
 *         description: The operational snapshot.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardStatsResponse'
 *             example:
 *               data:
 *                 totalPatients: 1284
 *                 totalDoctors: 37
 *                 todayAppointments: 42
 *                 pendingBills: 96
 *                 monthlyRevenue: '184250.00'
 *                 totalOutstanding: '27430.50'
 *                 todaySchedule:
 *                   - id: 2a4c6e80-9b1d-4f37-a5c8-3e7d1b6f0a92
 *                     appointmentDate: '2026-08-03'
 *                     startTime: '09:30:00'
 *                     endTime: '10:00:00'
 *                     status: SCHEDULED
 *                     patientName: Ngozi Adeyemi
 *                     doctorName: Dr. Amara Okafor
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.get("/", async (_req, res) => {
	res.json({ data: await getDashboardStats() });
});

export default router;
