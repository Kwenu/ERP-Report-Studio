import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../services/audit';

export const schedulesRouter = Router();
schedulesRouter.use(requireAuth);

function toPublic(row: any) {
  return {
    id: row.id,
    reportId: row.report_id,
    reportName: row.report_name,
    frequency: row.frequency,
    time: row.time,
    recipients: row.recipients,
    format: row.format,
    nextRun: row.next_run,
    status: row.status
  };
}

schedulesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const result = await query('SELECT * FROM scheduled_reports ORDER BY next_run ASC NULLS LAST');
    res.json({ schedules: result.rows.map(toPublic) });
  })
);

const createSchema = z.object({
  reportId: z.string().optional(),
  reportName: z.string().min(1),
  frequency: z.enum(['Daily', 'Weekly', 'Monthly']),
  time: z.string().min(1),
  recipients: z.array(z.string().email()).default([]),
  format: z.enum(['Excel', 'PDF', 'CSV']),
  nextRun: z.string().optional()
});

schedulesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const result = await query(
      `INSERT INTO scheduled_reports (report_id, report_name, frequency, time, recipients, format, next_run)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [body.reportId ?? null, body.reportName, body.frequency, body.time, body.recipients, body.format, body.nextRun ?? null]
    );
    await logAudit(req.user!.name, 'Scheduled report', body.reportName);
    res.status(201).json(toPublic(result.rows[0]));
  })
);

schedulesRouter.put(
  '/:id/toggle',
  asyncHandler(async (req, res) => {
    const result = await query(
      `UPDATE scheduled_reports SET status = CASE status WHEN 'Active' THEN 'Paused' ELSE 'Active' END
       WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Schedule not found.' });
    res.json(toPublic(result.rows[0]));
  })
);

schedulesRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    await query('DELETE FROM scheduled_reports WHERE id = $1', [req.params.id]);
    res.status(204).send();
  })
);
