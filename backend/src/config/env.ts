import dotenv from 'dotenv';

dotenv.config();

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(',').map((s) => s.trim()),
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '8h',
  credentialsEncKey: required('CREDENTIALS_ENC_KEY'),
  seedAdminEmail: process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com',
  seedAdminPassword: process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!',
  // Optional: the company ERP database (used by `npm run erp:connect` to register the primary data source)
  erp: {
    type: process.env.ERP_DB_TYPE ?? 'SQL Server',
    server: process.env.ERP_DB_SERVER ?? '',
    port: process.env.ERP_DB_PORT ?? '1433',
    database: process.env.ERP_DB_NAME ?? '',
    user: process.env.ERP_DB_USER ?? '',
    password: process.env.ERP_DB_PASSWORD ?? '',
    encrypt: (process.env.ERP_DB_ENCRYPT ?? 'false') === 'true',
    trustServerCertificate: (process.env.ERP_DB_TRUST_CERT ?? 'true') === 'true',
    // Old SQL Server (2008-2014) only speaks TLS 1.0/1.1, which Node 18+ refuses by default.
    legacyTls: (process.env.ERP_DB_LEGACY_TLS ?? 'false') === 'true'
  },
  seedAdminName: process.env.SEED_ADMIN_NAME ?? 'Administrator'
};
