import { Router } from 'express';
import { query } from '../db/pool';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';

export const auditRouter = Router();
auditRouter.use(requireAuth);

auditRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 200), 1000);
    const result = await query(
      `SELECT id, user_name AS "user", action, report, data_source AS "dataSource", timestamp
       FROM audit_log ORDER BY timestamp DESC LIMIT $1`,
      [limit]
    );
    res.json({ audit: result.rows });
  })
);
