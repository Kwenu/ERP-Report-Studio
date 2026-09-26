import { Router } from 'express';
import { z } from 'zod';
import { query } from '../db/pool';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { encryptSecret, decryptSecret } from '../utils/crypto';
import { testDatasourceConnection } from '../services/datasourceDrivers';
import { erpTables, totalFieldCount, totalRelationshipCount, totalTableCount } from '../schema/metadata';
import { logAudit } from '../services/audit';

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
  port: z.string().min(1).default('5432'),
  database: z.string().min(1),
  authMethod: z.enum(['Windows Authentication', 'Database Authentication']),
  username: z.string().optional(),
  password: z.string().optional(),
  isPrimary: z.boolean().optional()
});

datasourcesRouter.post(
  '/',
  requireRole('Administrator'),
  asyncHandler(async (req, res) => {
    const body = upsertSchema.parse(req.body);
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
        body.isPrimary ?? false,
        req.user!.sub
      ]
    );
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
    await logAudit(req.user!.name, 'Updated data source', undefined, result.rows[0].name);
    res.json(toPublic(result.rows[0]));
  })
);

datasourcesRouter.delete(
  '/:id',
  requireRole('Administrator'),
  asyncHandler(async (req, res) => {
    await query('DELETE FROM data_sources WHERE id = $1', [req.params.id]);
    res.status(204).send();
  })
);

/** POST /api/v1/datasources/:id/test — real connectivity test against the stored (or provided) credentials. */
datasourcesRouter.post(
  '/:id/test',
  asyncHandler(async (req, res) => {
    const existing = await query('SELECT * FROM data_sources WHERE id = $1', [req.params.id]);
    const row = existing.rows[0];
    if (!row) return res.status(404).json({ error: 'Data source not found.' });

    const secret = decryptSecret(row.encrypted_credentials);
    await query("UPDATE data_sources SET status = 'Testing' WHERE id = $1", [req.params.id]);

    const result = await testDatasourceConnection({
      server: row.server,
      port: row.port,
      database: row.database_name,
      databaseType: row.database_type,
      authMethod: row.auth_method,
      username: row.username,
      password: (secret?.password as string) ?? undefined
    });

    await query('UPDATE data_sources SET status = $1 WHERE id = $2', [
      result.success ? 'Connected' : 'Error',
      req.params.id
    ]);
    await logAudit(req.user!.name, result.success ? 'Tested connection (success)' : 'Tested connection (failed)', undefined, row.name);

    res.json(result);
  })
);

/**
 * POST /api/v1/datasources/:id/schema/refresh
 * Reports the live schema metadata (see src/schema/metadata.ts) as "discovered".
 * In production this would run an information_schema query against the
 * live customer database instead of returning the bundled metadata.
 */
datasourcesRouter.post(
  '/:id/schema/refresh',
  requireRole('Administrator', 'Report Designer'),
  asyncHandler(async (req, res) => {
    const primaryKeys = erpTables.filter((t) => t.fields.some((f) => f.isKey)).length;
    const foreignKeys = erpTables.reduce((sum, t) => sum + t.fields.filter((f) => f.references).length, 0);

    const result = await query(
      'UPDATE data_sources SET last_schema_refresh = now() WHERE id = $1 RETURNING last_schema_refresh',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Data source not found.' });

    await logAudit(req.user!.name, 'Refreshed schema', undefined, req.params.id);

    res.json({
      tables: totalTableCount,
      fields: totalFieldCount,
      relationships: totalRelationshipCount,
      primaryKeys,
      foreignKeys,
      completedAt: result.rows[0].last_schema_refresh
    });
  })
);

/**
 * POST /api/v1/datasources/:id/data/refresh
 * Marks the demo ERP tables as refreshed and returns row counts.
 * In production this triggers/awaits the actual ETL job that pulls the
 * customer's ERP data into the reporting store.
 */
datasourcesRouter.post(
  '/:id/data/refresh',
  requireRole('Administrator', 'Report Designer'),
  asyncHandler(async (req, res) => {
    const tables: string[] = req.body?.tables ?? erpTables.map((t) => t.name);

    const counts = await query(
      `SELECT
         (SELECT count(*) FROM erp_customers)     AS "Customers",
         (SELECT count(*) FROM erp_invoices)      AS "Invoices",
         (SELECT count(*) FROM erp_invoice_lines) AS "InvoiceLines",
         (SELECT count(*) FROM erp_payments)      AS "Payments",
         (SELECT count(*) FROM erp_items)         AS "Items",
         (SELECT count(*) FROM erp_employees)     AS "Employees"`
    );

    const result = await query(
      'UPDATE data_sources SET last_data_refresh = now() WHERE id = $1 RETURNING last_data_refresh',
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Data source not found.' });

    await logAudit(req.user!.name, 'Refreshed data', undefined, req.params.id);

    res.json({
      completedAt: result.rows[0].last_data_refresh,
      tables: tables.map((t) => ({ table: t, records: Number(counts.rows[0][t] ?? 0) }))
    });
  })
);
