import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../db/pool';
import { asyncHandler } from '../utils/asyncHandler';
import { requireAuth } from '../middleware/auth';
import { buildReportQuery, buildCountParams, QueryValidationError } from '../services/queryBuilder';
import { getReportConnector, NoDataSourceError } from '../db/erpConnector';
import { DATASETS } from '../schema/metadata';
import { logAudit } from '../services/audit';

export const reportsRouter = Router();
reportsRouter.use(requireAuth);

function toPublic(row: any) {
  return {
    ...row.definition,
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    owner: row.owner,
    visibility: row.visibility,
    type: row.type,
    templateId: row.template_id ?? undefined,
    dataset: row.dataset,
    lastModified: row.last_modified,
    lastRun: row.last_run,
    createdBy: row.definition?.createdBy ?? row.owner
  };
}

reportsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { mine, favoritesOnly } = req.query;
    const params: any[] = [req.user!.sub];
    let sql = `
      SELECT r.*, (f.user_id IS NOT NULL) AS is_favorite
      FROM reports r
      LEFT JOIN favorites f ON f.report_id = r.id AND f.user_id = $1
      WHERE (r.visibility != 'Private' OR r.created_by = $1)`;
    if (mine === 'true') {
      sql += ' AND r.created_by = $1';
    }
    if (favoritesOnly === 'true') {
      sql += ' AND f.user_id IS NOT NULL';
    }
    sql += ' ORDER BY r.last_modified DESC';
    const result = await query(sql, params);
    res.json({
      reports: result.rows.map((row) => ({ ...toPublic(row), isFavorite: row.is_favorite }))
    });
  })
);

reportsRouter.get(
  '/meta/datasets',
  asyncHandler(async (_req, res) => {
    res.json({ datasets: Object.keys(DATASETS) });
  })
);

reportsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const result = await query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    if (!result.rows[0]) return res.status(404).json({ error: 'Report not found.' });
    await query(
      `INSERT INTO recently_viewed (user_id, report_id) VALUES ($1, $2)
       ON CONFLICT (user_id, report_id) DO UPDATE SET viewed_at = now()`,
      [req.user!.sub, req.params.id]
    );
    res.json(toPublic(result.rows[0]));
  })
);

const saveSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string().default(''),
  category: z.string().default(''),
  visibility: z.enum(['Private', 'Shared with Department', 'Shared with Company']).default('Private'),
  type: z.enum(['Fixed Template', 'Custom Report']).default('Custom Report'),
  templateId: z.string().optional(),
  // 'erpTable' = a report built on one real ERP table (its name rides along in the saved definition).
  dataset: z.enum(['salesLines', 'paymentTxns', 'openInvoices', 'erpTable']),
  // Everything else (columns, filters, sort, formatting…) rides along as-is.
  rest: z.record(z.any()).default({})
});

reportsRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const body = { ...req.body };
    const { id, name, description, category, visibility, type, templateId, dataset } = saveSchema.parse({
      ...body,
      rest: {}
    });
    const reportId = id ?? `custom-${uuidv4().slice(0, 8)}`;
    if (id) {
      const existing = await query('SELECT created_by FROM reports WHERE id = $1', [id]);
      const owner = existing.rows[0]?.created_by;
      if (owner && owner !== req.user!.sub && req.user!.role !== 'Administrator') {
        return res.status(403).json({ error: 'Only the report owner or an administrator can change this report.' });
      }
    }

    const definition = { ...body, id: reportId, owner: req.user!.name, createdBy: req.user!.name };

    const result = await query(
      `INSERT INTO reports (id, name, description, category, owner, visibility, type, template_id, dataset, definition, created_by, last_modified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11, now())
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category,
         visibility = EXCLUDED.visibility, type = EXCLUDED.type, template_id = EXCLUDED.template_id,
         dataset = EXCLUDED.dataset, definition = EXCLUDED.definition, last_modified = now()
       RETURNING *`,
      [
        reportId,
        name,
        description,
        category,
        req.user!.name,
        visibility,
        type,
        templateId ?? null,
        dataset,
        JSON.stringify(definition),
        req.user!.sub
      ]
    );
    await logAudit(req.user!.name, id ? 'Updated report' : 'Created report', name);
    res.status(201).json(toPublic(result.rows[0]));
  })
);

reportsRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const existing = await query('SELECT name FROM reports WHERE id = $1', [req.params.id]);
    await query('DELETE FROM reports WHERE id = $1', [req.params.id]);
    if (existing.rows[0]) await logAudit(req.user!.name, 'Deleted report', existing.rows[0].name);
    res.status(204).send();
  })
);

reportsRouter.post(
  '/:id/duplicate',
  asyncHandler(async (req, res) => {
    const existing = await query('SELECT * FROM reports WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Report not found.' });
    const source = existing.rows[0];
    const newId = `custom-${uuidv4().slice(0, 8)}`;
    const definition = { ...source.definition, id: newId, name: `${source.name} (Copy)`, owner: req.user!.name };

    const result = await query(
      `INSERT INTO reports (id, name, description, category, owner, visibility, type, template_id, dataset, definition, created_by)
       VALUES ($1,$2,$3,$4,$5,'Private',$6,$7,$8,$9,$10) RETURNING *`,
      [
        newId,
        definition.name,
        source.description,
        source.category,
        req.user!.name,
        source.type,
        source.id,
        source.dataset,
        JSON.stringify(definition),
        req.user!.sub
      ]
    );
    await logAudit(req.user!.name, 'Duplicated report', definition.name);
    res.status(201).json(toPublic(result.rows[0]));
  })
);

reportsRouter.post(
  '/:id/favorite',
  asyncHandler(async (req, res) => {
    const on = req.body?.favorite !== false;
    if (on) {
      await query(
        `INSERT INTO favorites (user_id, report_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
        [req.user!.sub, req.params.id]
      );
    } else {
      await query('DELETE FROM favorites WHERE user_id = $1 AND report_id = $2', [req.user!.sub, req.params.id]);
    }
    res.json({ favorite: on });
  })
);

/* ------------------------------------------------------------------ *
 * POST /api/v1/reports/query
 * Executes a report definition (or an ad-hoc query for the builder's
 * live preview) against the real database and returns rows.
 * ------------------------------------------------------------------ */
const queryBodySchema = z.object({
  dataset: z.enum(['salesLines', 'paymentTxns', 'openInvoices']),
  columns: z
    .array(z.object({ key: z.string(), aggregation: z.enum(['sum', 'avg', 'count', 'min', 'max', 'none']).optional() }))
    .default([]),
  filters: z
    .array(
      z.object({
        key: z.string(),
        operator: z.enum([
          'is between',
          'equals',
          'not equals',
          'contains',
          'greater than',
          'less than',
          'on or after',
          'on or before',
          'is empty'
        ]),
        value: z.string().optional(),
        value2: z.string().optional(),
        connector: z.enum(['AND', 'OR']).optional()
      })
    )
    .default([]),
  sort: z.array(z.object({ key: z.string(), dir: z.enum(['asc', 'desc']) })).default([]),
  groupBy: z.string().nullable().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  page: z.number().optional(),
  pageSize: z.number().optional(),
  reportId: z.string().optional() // when set, updates the report's last_run timestamp
});

reportsRouter.post(
  '/query',
  asyncHandler(async (req, res) => {
    const started = Date.now();
    const input = queryBodySchema.parse(req.body);

    let conn;
    try {
      conn = await getReportConnector();
    } catch (err) {
      if (err instanceof NoDataSourceError) return res.status(409).json({ error: err.message });
      throw err;
    }
    let built;
    try {
      built = buildReportQuery({ ...input, dialect: conn.dialect });
    } catch (err) {
      if (err instanceof QueryValidationError) {
        return res.status(400).json({ error: err.message });
      }
      throw err;
    }

    let rowsResult, countResult;
    try {
      [rowsResult, countResult] = await Promise.all([
        conn.query(built.sql, built.params),
        conn.query(built.countSql, buildCountParams(built))
      ]);
    } catch (err: any) {
      // Typically: a view/column in db/erp_views.*.sql doesn't exist yet or the login lacks SELECT.
      console.error('Report query failed:', err.message, '\nSQL:', built.sql);

      // "Invalid object name 'v_…'" = the report views were never created in this ERP database.
      // Say exactly which ones are missing and what to run, instead of a raw SQL Server message.
      if (conn.dialect === 'mssql' && /invalid object name/i.test(String(err.message))) {
        const wanted = Object.values(DATASETS).map((d) => d.view.replace(/^dbo\./i, ''));
        let missing = wanted;
        try {
          const found = await conn.query(
            `SELECT name FROM sys.views WHERE name IN (${wanted.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ')})`
          );
          const have = new Set(found.rows.map((r: any) => String(r.name).toLowerCase()));
          missing = wanted.filter((v) => !have.has(v.toLowerCase()));
        } catch {
          /* keep the full list */
        }
        if (missing.length) {
          return res.status(502).json({
            error:
              `The report views are not installed in ${conn.label}: ${missing.join(', ')}. ` +
              `Run backend/db/erp_views.polydime.sql in SSMS on that database, then press Refresh.`,
            missingViews: missing
          });
        }
      }
      return res.status(502).json({ error: `The ERP database rejected the query: ${err.message}` });
    }

    if (input.reportId) {
      await query('UPDATE reports SET last_run = now() WHERE id = $1', [input.reportId]);
      await logAudit(req.user!.name, 'Ran report', input.reportId);
    } else {
      await logAudit(req.user!.name, 'Ran ad-hoc query', input.dataset);
    }

    res.json({
      rows: rowsResult.rows,
      records: Number(countResult.rows[0]?.total ?? rowsResult.rows.length),
      source: conn.label,
      executionMs: Date.now() - started,
      completedAt: new Date().toISOString(),
      queryDefinition: {
        source: input.dataset,
        columns: input.columns.map((c) => c.key),
        groupBy: input.groupBy ? [input.groupBy] : [],
        filters: input.filters,
        sort: input.sort
      }
    });
  })
);

