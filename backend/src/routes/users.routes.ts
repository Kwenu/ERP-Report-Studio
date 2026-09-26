import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { logAudit } from '../services/audit';

export const usersRouter = Router();
usersRouter.use(requireAuth);

function toPublic(row: any) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    department: row.department,
    status: row.status,
    lastActive: row.last_active
  };
}

usersRouter.get(
  '/',
  requireRole('Administrator'),
  asyncHandler(async (_req, res) => {
    const result = await query('SELECT * FROM app_users ORDER BY name ASC');
    res.json({ users: result.rows.map(toPublic) });
  })
);

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['Administrator', 'Report Designer', 'Report Viewer']),
  department: z.string().default('')
});

usersRouter.post(
  '/',
  requireRole('Administrator'),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(body.password, 10);
    const result = await query(
      `INSERT INTO app_users (name, email, password_hash, role, department, status)
       VALUES ($1,$2,$3,$4,$5,'Invited') RETURNING *`,
      [body.name, body.email, passwordHash, body.role, body.department]
    );
    await logAudit(req.user!.name, 'Invited user', body.name);
    res.status(201).json(toPublic(result.rows[0]));
  })
);

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  role: z.enum(['Administrator', 'Report Designer', 'Report Viewer']).optional(),
  department: z.string().optional(),
  status: z.enum(['Active', 'Invited', 'Disabled']).optional(),
  password: z.string().min(8).optional()
});

usersRouter.put(
  '/:id',
  requireRole('Administrator'),
  asyncHandler(async (req, res) => {
    const body = updateSchema.parse(req.body);
    const passwordHash = body.password ? await bcrypt.hash(body.password, 10) : null;
    const result = await query(
      `UPDATE app_users SET
         name = COALESCE($1, name), role = COALESCE($2, role), department = COALESCE($3, department),
         status = COALESCE($4, status), password_hash = COALESCE($5, password_hash)
       WHERE id = $6 RETURNING *`,
      [body.name ?? null, body.role ?? null, body.department ?? null, body.status ?? null, passwordHash, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    await logAudit(req.user!.name, 'Updated user', result.rows[0].name);
    res.json(toPublic(result.rows[0]));
  })
);

usersRouter.delete(
  '/:id',
  requireRole('Administrator'),
  asyncHandler(async (req, res) => {
    await query('DELETE FROM app_users WHERE id = $1', [req.params.id]);
    res.status(204).send();
  })
);
