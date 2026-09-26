import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
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

schemaRouter.get('/tables', (_req, res) => {
  res.json({ tables: erpTables, totalTableCount, totalFieldCount, totalRelationshipCount });
});

schemaRouter.get('/tables/:name', (req, res) => {
  const table = erpTables.find((t) => t.name.toLowerCase() === req.params.name.toLowerCase());
  if (!table) return res.status(404).json({ error: `Table "${req.params.name}" not found.` });
  res.json(table);
});

schemaRouter.get('/fields', (_req, res) => {
  res.json({ fields: allFields });
});

schemaRouter.get('/relationships', (_req, res) => {
  res.json({ relationships });
});

/** Datasets available to build reports against (salesLines, paymentTxns, openInvoices). */
schemaRouter.get('/datasets', (_req, res) => {
  const datasets = Object.values(DATASETS).map((d) => ({
    id: d.id,
    columns: Object.entries(d.columns).map(([key, meta]) => ({ key, ...meta }))
  }));
  res.json({ datasets });
});
