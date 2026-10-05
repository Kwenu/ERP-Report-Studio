import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { encryptSecret, decryptSecret } from '../utils/crypto';
import { testDatasourceConnection, validateHostPort } from '../services/datasourceDrivers';
import { findDataSource, getConnector, invalidateConnector } from '../db/erpConnector';
import { introspectSchema, tableRowCounts } from '../services/introspect';
import { setCachedSchema, clearCachedSchema, getSchemaFor } from '../services/schemaCache';
import { logAudit } from '../services/audit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const datasourcesRouter = Router();
datasourcesRouter.use(requireAuth);

function toPublic(row: any) {
  return {
    id: row.id,
    name: row.name,
    databaseType: row.database_type,
    server: row.server,
    port: row.port,
    database: row.database_name,
    authMethod: row.auth_method,
    username: row.username,
    status: row.status,
    isPrimary: row.is_primary,
    lastSchemaRefresh: row.last_schema_refresh,
    lastDataRefresh: row.last_data_refresh
    // encrypted_credentials is intentionally never returned to the client.
  };
}

datasourcesRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const result = await query('SELECT * FROM data_sources ORDER BY is_primary DESC, name ASC');
    res.json({ dataSources: result.rows.map(toPublic) });
  })
);

const upsertSchema = z.object({
  name: z.string().min(1),
  databaseType: z.string().min(1),
  server: z.string().min(1),
  // Defaulted per database type below (SQL Server 1433, PostgreSQL 5432 ...), not a blanket 5432.
  port: z.string().optional(),
  database: z.string().min(1),
  authMethod: z.enum(['Windows Authentication', 'Database Authentication']),
  username: z.string().optional(),
  password: z.string().optional(),
  isPrimary: z.boolean().optional()
});

const DEFAULT_PORTS: Record<string, string> = { 'SQL Server': '1433', PostgreSQL: '5432', MySQL: '3306', Oracle: '1521', 'IBM Db2': '50000' };

datasourcesRouter.post(
  '/',
  requireRole('Administrator'),
  asyncHandler(async (req, res) => {
    const body = upsertSchema.parse(req.body);
    body.port = (body.port ?? '').trim() || DEFAULT_PORTS[body.databaseType] || '1433';
    const badAddress = validateHostPort(body.server, Number(body.port));
    if (badAddress) return res.status(400).json({ error: badAddress });
    if (body.authMethod === 'Windows Authentication' && /sql\s*server/i.test(body.databaseType)) {
      return res.status(400).json({
        error: 'Windows Authentication is not supported by the Node SQL Server driver. Use "Database Authentication" with a read-only SQL login.'
      });
    }
    const encrypted = body.password ? encryptSecret({ password: body.password }) : null;

    const result = await query(
      `INSERT INTO data_sources
         (name, database_type, server, port, database_name, auth_method, username, encrypted_credentials, is_primary, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        body.name,
        body.databaseType,
        body.server,
        body.port,
        body.database,
        body.authMethod,
        body.username ?? null,
        encrypted,
        body.isPrimary ?? (await query('SELECT 1 FROM data_sources WHERE is_primary = true LIMIT 1')).rows.length === 0,
        req.user!.sub
      ]
    );
    // Only one primary at a time (the report engine reads the first row where is_primary = true).
    if (result.rows[0].is_primary) {
      await query('UPDATE data_sources SET is_primary = false WHERE id <> $1', [result.rows[0].id]);
    }
    await logAudit(req.user!.name, 'Added data source', undefined, body.name);
    res.status(201).json(toPublic(result.rows[0]));
  })
);

datasourcesRouter.put(
  '/:id',
  requireRole('Administrator'),
  asyncHandler(async (req, res) => {
    const body = upsertSchema.partial().parse(req.body);
    const existing = await query('SELECT * FROM data_sources WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Data source not found.' });
    const badAddress = validateHostPort(body.server ?? existing.rows[0].server, Number(body.port ?? existing.rows[0].port));
    if (badAddress) return res.status(400).json({ error: badAddress });

    const encrypted = body.password ? encryptSecret({ password: body.password }) : existing.rows[0].encrypted_credentials;

    const result = await query(
      `UPDATE data_sources SET
         name = COALESCE($1, name),
         database_type = COALESCE($2, database_type),
         server = COALESCE($3, server),
         port = COALESCE($4, port),
         database_name = COALESCE($5, database_name),
         auth_method = COALESCE($6, auth_method),
         username = COALESCE($7, username),
         encrypted_credentials = $8,
         is_primary = COALESCE($9, is_primary)
       WHERE id = $10
       RETURNING *`,
      [
        body.name ?? null,
        body.databaseType ?? null,
        body.server ?? null,
        body.port ?? null,
        body.database ?? null,
        body.authMethod ?? null,
        body.username ?? null,
        encrypted,
        body.isPrimary ?? null,
        req.params.id
      ]
    );
    if (body.isPrimary) await query('UPDATE data_sources SET is_primary = false WHERE id <> $1', [req.params.id]);
    await invalidateConnector(req.params.id);
    await logAudit(req.user!.name, 'Updated data source', undefined, result.rows[0].name);
    res.json(toPublic(result.rows[0]));
  })
);

/**
 * DELETE /api/v1/datasources/:id — removes the connection (and its stored, encrypted password) from the studio.
 * Nothing in the ERP database itself is touched. If the primary source is deleted, the oldest remaining
 * source becomes primary so reports keep working.
 */
datasourcesRouter.delete(
  '/:id',
  requireRole('Administrator'),
  asyncHandler(async (req, res) => {
    if (!UUID_RE.test(req.params.id)) return res.status(404).json({ error: 'Data source not found.' });
    const removed = await query('DELETE FROM data_sources WHERE id = $1 RETURNING name, is_primary', [req.params.id]);
    if (!removed.rows[0]) return res.status(404).json({ error: 'Data source not found.' });
    await invalidateConnector(req.params.id);
    clearCachedSchema(req.params.id);
    if (removed.rows[0].is_primary) {
      await query(
        `UPDATE data_sources SET is_primary = true
         WHERE id = (SELECT id FROM data_sources ORDER BY created_at ASC LIMIT 1)`
      );
    }
    await logAudit(req.user!.name, 'Deleted data source', undefined, removed.rows[0].name);
    res.status(204).send();
  })
);

/**
 * GET /api/v1/datasources/:id/tables — every real table in the ERP database with its row count,
 * plus the schema totals. Row counts come from the catalogue, so this is fast even with ~1,000 tables.
 */
datasourcesRouter.get(
  '/:id/tables',
  asyncHandler(async (req, res) => {
    const row = await findDataSource(req.params.id);
    if (!row) return res.status(404).json({ error: 'Data source not found.' });
    try {
      const schema = await getSchemaFor(row);
      const counts = await tableRowCounts(getConnector(row));
      res.json({
        stats: {
          tables: schema.tables.length,
          fields: schema.fieldCount,
          relationships: schema.relationships.length,
          primaryKeys: schema.primaryKeys,
          foreignKeys: schema.foreignKeys
        },
        tables: schema.tables
          .map((t) => ({ table: t.name, columns: t.fields.length, records: counts[t.name] ?? 0 }))
          .sort((a, b) => a.table.localeCompare(b.table, undefined, { sensitivity: 'base' }))
      });
    } catch (err: any) {
      await invalidateConnector(row.id);
      res.status(502).json({ error: `Could not read the table list from the ERP: ${err.message}` });
    }
  })
);

/** POST /api/v1/datasources/:id/test — real connectivity test against the stored credentials. */
datasourcesRouter.post(
  '/:id/test',
  asyncHandler(async (req, res) => {
    const row = await findDataSource(req.params.id);
    if (!row) return res.status(404).json({ error: 'Data source not found. Run "npm run erp:connect" or add one first.' });

    await query("UPDATE data_sources SET status = 'Testing' WHERE id = $1", [row.id]);

    let result: Awaited<ReturnType<typeof testDatasourceConnection>>;
    try {
      const secret = decryptSecret(row.encrypted_credentials);
      result = await testDatasourceConnection({
        server: row.server,
        port: row.port,
        database: row.database_name,
        databaseType: row.database_type,
        authMethod: row.auth_method as any,
        username: row.username ?? undefined,
        password: (secret?.password as string) ?? undefined
      });
    } catch (err: any) {
      // e.g. CREDENTIALS_ENC_KEY changed since the password was stored, so it can no longer be decrypted.
      const message = /unable to authenticate|auth/i.test(err.message)
        ? 'The stored password could not be decrypted (CREDENTIALS_ENC_KEY changed?). Re-enter the password: run "npm run erp:connect" again or edit the data source.'
        : err.message ?? String(err);
      result = { success: false, message, latencyMs: 0, steps: [{ id: 'auth', status: 'failed', detail: message }] };
    }

    await query('UPDATE data_sources SET status = $1 WHERE id = $2', [result.success ? 'Connected' : 'Error', row.id]);
    await invalidateConnector(row.id); // next report run opens a fresh pool with the tested credentials
    await logAudit(req.user!.name, result.success ? 'Tested connection (success)' : 'Tested connection (failed)', undefined, row.name);

    res.json(result);
  })
);

/** POST /api/v1/datasources/:id/schema/refresh — reads the live tables / columns / keys from the ERP database. */
datasourcesRouter.post(
  '/:id/schema/refresh',
  requireRole('Administrator', 'Report Designer'),
  asyncHandler(async (req, res) => {
    const row = await findDataSource(req.params.id);
    if (!row) return res.status(404).json({ error: 'Data source not found.' });

    let schema;
    try {
      schema = await introspectSchema(getConnector(row));
    } catch (err: any) {
      await invalidateConnector(row.id);
      return res.status(502).json({ error: `Could not read the ERP schema: ${err.message}` });
    }
    setCachedSchema(row.id, schema);

    const result = await query('UPDATE data_sources SET last_schema_refresh = now() WHERE id = $1 RETURNING last_schema_refresh', [row.id]);
    await logAudit(req.user!.name, 'Refreshed schema', undefined, row.name);

    res.json({
      tables: schema.tables.length,
      fields: schema.fieldCount,
      relationships: schema.relationships.length,
      primaryKeys: schema.primaryKeys,
      foreignKeys: schema.foreignKeys,
      completedAt: result.rows[0].last_schema_refresh
    });
  })
);

/**
 * POST /api/v1/datasources/:id/data/refresh
 * Reports read the ERP live, so there is nothing to copy: "refresh" re-reads the row counts of the
 * requested tables (all tables when none are given) straight from the database catalogue.
 */
datasourcesRouter.post(
  '/:id/data/refresh',
  requireRole('Administrator', 'Report Designer'),
  asyncHandler(async (req, res) => {
    const row = await findDataSource(req.params.id);
    if (!row) return res.status(404).json({ error: 'Data source not found.' });

    const conn = getConnector(row);
    let counts: Record<string, number>;
    let requested: string[];
    try {
      const schema = await introspectSchema(conn);
      setCachedSchema(row.id, schema);
      counts = await tableRowCounts(conn);

      // Only tables that really exist (names come from the live catalogue, never from the request).
      const known = new Set(schema.tables.map((t) => t.name));
      const asked: string[] = Array.isArray(req.body?.tables) && req.body.tables.length ? req.body.tables : [...known];
      requested = asked.filter((t) => known.has(t));
    } catch (err: any) {
      await invalidateConnector(row.id);
      return res.status(502).json({ error: `Could not read data from the ERP: ${err.message}` });
    }

    const result = await query('UPDATE data_sources SET last_data_refresh = now() WHERE id = $1 RETURNING last_data_refresh', [row.id]);
    await logAudit(req.user!.name, 'Refreshed data', undefined, row.name);

    res.json({
      completedAt: result.rows[0].last_data_refresh,
      tables: requested.map((t) => ({ table: t, records: counts[t] ?? 0 }))
    });
  })
);
