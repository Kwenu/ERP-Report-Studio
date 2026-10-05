import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../utils/asyncHandler';
import { getPrimarySchema } from '../services/schemaCache';
import {
  DATASETS,
  allFields,
  erpTables,
  relationships,
  totalFieldCount,
  totalRelationshipCount,
  totalTableCount
} from '../schema/metadata';

export const schemaRouter = Router();
schemaRouter.use(requireAuth);

/** Live schema of the primary ERP data source, or the bundled reference schema if none is connected. */
async function currentSchema() {
  const live = await getPrimarySchema();
  if (live) {
    return {
      source: 'live' as const,
      tables: live.tables,
      relationships: live.relationships,
      fields: live.tables.flatMap((t) => t.fields)
    };
  }
  return { source: 'reference' as const, tables: erpTables, relationships, fields: allFields };
}

schemaRouter.get(
  '/tables',
  asyncHandler(async (_req, res) => {
    const s = await currentSchema();
    res.json({
      source: s.source,
      tables: s.tables,
      totalTableCount: s.source === 'live' ? s.tables.length : totalTableCount,
      totalFieldCount: s.source === 'live' ? s.fields.length : totalFieldCount,
      totalRelationshipCount: s.source === 'live' ? s.relationships.length : totalRelationshipCount
    });
  })
);

schemaRouter.get(
  '/tables/:name',
  asyncHandler(async (req, res) => {
    const s = await currentSchema();
    const table = s.tables.find((t) => t.name.toLowerCase() === req.params.name.toLowerCase());
    if (!table) return res.status(404).json({ error: `Table "${req.params.name}" not found.` });
    res.json(table);
  })
);

schemaRouter.get(
  '/fields',
  asyncHandler(async (_req, res) => {
    res.json({ fields: (await currentSchema()).fields });
  })
);

schemaRouter.get(
  '/relationships',
  asyncHandler(async (_req, res) => {
    res.json({ relationships: (await currentSchema()).relationships });
  })
);

/** Datasets available to build reports against (salesLines, paymentTxns, openInvoices). */
schemaRouter.get('/datasets', (_req, res) => {
  const datasets = Object.values(DATASETS).map((d) => ({
    id: d.id,
    view: d.view,
    columns: Object.entries(d.columns).map(([key, meta]) => ({ key, ...meta }))
  }));
  res.json({ datasets });
});
