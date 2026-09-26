import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { query } from '../db/pool';
import { signToken } from '../utils/jwt';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { logAudit } from '../services/audit';

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { email, password } = loginSchema.parse(req.body);

    const result = await query(
      `SELECT id, name, email, password_hash, role, department, status
       FROM app_users WHERE LOWER(email) = LOWER($1)`,
      [email]
    );
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid email or password.' });
    if (user.status === 'Disabled') return res.status(403).json({ error: 'This account has been disabled.' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

    await query('UPDATE app_users SET last_active = now() WHERE id = $1', [user.id]);
    await logAudit(user.name, 'Signed in', undefined);

    const token = signToken({ sub: user.id, email: user.email, name: user.name, role: user.role });
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department
      }
    });
  })
);

authRouter.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const result = await query(
      'SELECT id, name, email, role, department, status FROM app_users WHERE id = $1',
      [req.user!.sub]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found.' });
    res.json(result.rows[0]);
  })
);
