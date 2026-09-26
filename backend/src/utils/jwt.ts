import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { UserRole } from '../schema/metadata';

export interface AuthTokenPayload {
  sub: string; // user id
  email: string;
  name: string;
  role: UserRole;
}

export function signToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn as any });
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}
