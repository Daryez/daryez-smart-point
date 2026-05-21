const { connectDatabase, getDatabase } = require("./connection");
const { env } = require("../config/env");
const { hashPassword, normalizeEmail } = require("../utils/security");

async function seed() {
  await connectDatabase();
  const db = getDatabase();

  let tenant = db.one("SELECT * FROM tenants ORDER BY id ASC LIMIT 1");
  if (!tenant) {
    const tenantResult = db.query("INSERT INTO tenants (name, plan, status) VALUES (?, ?, ?)", [env.defaultTenantName, "professional", "active"]);
    tenant = db.one("SELECT * FROM tenants WHERE id = ?", [tenantResult.lastInsertRowid]);
  }

  let branch = db.one("SELECT * FROM branches WHERE tenant_id = ? ORDER BY id ASC LIMIT 1", [tenant.id]);
  if (!branch) {
    const branchResult = db.query("INSERT INTO branches (tenant_id, name, address) VALUES (?, ?, ?)", [tenant.id, "Sucursal principal", ""]);
    branch = db.one("SELECT * FROM branches WHERE id = ?", [branchResult.lastInsertRowid]);
  }

  const email = normalizeEmail(env.defaultAdminEmail);
  const existingUser = db.one("SELECT * FROM users WHERE tenant_id = ? AND email = ?", [tenant.id, email]);
  if (!existingUser) {
    const passwordHash = await hashPassword(env.defaultAdminPassword);
    db.query(
      "INSERT INTO users (tenant_id, branch_id, name, email, password_hash, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [tenant.id, branch.id, "Administrador", email, passwordHash, "admin", "active"]
    );
  }

  const membership = db.one("SELECT * FROM memberships WHERE tenant_id = ? ORDER BY id DESC LIMIT 1", [tenant.id]);
  if (!membership) {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    db.query("INSERT INTO memberships (tenant_id, plan, status, trial_ends_at) VALUES (?, ?, ?, ?)", [tenant.id, "professional", "trial", trialEndsAt]);
  }

  console.log(`Tenant inicial: ${tenant.name} (id ${tenant.id})`);
  console.log(`Usuario administrador: ${email}`);
}

if (require.main === module) {
  seed()
    .then(() => console.log("Datos iniciales creados correctamente."))
    .catch((error) => {
      console.error("Error creando datos iniciales", error);
      process.exit(1);
    });
}

module.exports = { seed };
