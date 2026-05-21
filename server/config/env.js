require("dotenv").config();

const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  isProduction: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT || 4173),
  appOrigin: process.env.APP_ORIGIN || "http://localhost:4173",
  dbClient: process.env.DB_CLIENT || "sqlite",
  sqlitePath: process.env.SQLITE_PATH || "./data/daryez-smart-point.sqlite",
  databaseUrl: process.env.DATABASE_URL || "",
  jwtSecret: process.env.JWT_SECRET || "development-only-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  passwordPepper: process.env.PASSWORD_PEPPER || "",
  defaultTenantName: process.env.DEFAULT_TENANT_NAME || "Daryez Demo",
  defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL || "admin@daryez.local",
  defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || "admin12345"
};

if (env.isProduction && env.jwtSecret === "development-only-secret") {
  throw new Error("JWT_SECRET debe configurarse en produccion.");
}

module.exports = { env };
