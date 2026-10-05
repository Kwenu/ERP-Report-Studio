import { findDataSource, getConnector, type DataSourceRow } from '../db/erpConnector';
import { introspectSchema, IntrospectedSchema } from './introspect';
import { query } from '../db/pool';

/** Last discovered ERP schema, keyed by data source id. Refreshed by POST /datasources/:id/schema/refresh. */
const cache = new Map<string, IntrospectedSchema>();

export function setCachedSchema(sourceId: string, schema: IntrospectedSchema) {
  cache.set(sourceId, schema);
}

export function clearCachedSchema(sourceId: string) {
  cache.delete(sourceId);
}

/** Cached schema for a source, or introspect it now. Throws if the ERP cannot be reached. */
export async function getSchemaFor(row: DataSourceRow): Promise<IntrospectedSchema> {
  const hit = cache.get(row.id);
  if (hit) return hit;
  const schema = await introspectSchema(getConnector(row));
  cache.set(row.id, schema);
  return schema;
}

/** Schema of the primary data source (introspected lazily on first use). Returns null if unavailable. */
export async function getPrimarySchema(): Promise<IntrospectedSchema | null> {
  const primary = (await query('SELECT id FROM data_sources WHERE is_primary = true LIMIT 1')).rows[0];
  if (!primary) return null;
  const hit = cache.get(primary.id);
  if (hit) return hit;
  try {
    const row = await findDataSource(primary.id);
    if (!row) return null;
    const schema = await introspectSchema(getConnector(row));
    cache.set(primary.id, schema);
    return schema;
  } catch (err) {
    console.warn('Could not introspect the primary data source:', (err as Error).message);
    return null;
  }
}
