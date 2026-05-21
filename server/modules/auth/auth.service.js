const { getDatabase } = require("../../database/connection");
const { normalizeEmail, verifyPassword, signSession } = require("../../utils/security");
const { recordAudit } = require("../../utils/audit");

async function login(req) {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || "");
  const tenantId = Number(req.body.tenantId || 1);
  const user = getDatabase().one("SELECT * FROM users WHERE tenant_id = ? AND email = ? AND status = 'active'", [tenantId, email]);

  if (!user || !(await verifyPassword(password, user.password_hash))) {
    const error = new Error("Credenciales invalidas.");
    error.status = 401;
    throw error;
  }

  getDatabase().query("UPDATE users SET last_login_at = CURRENT_TIMESTAMP WHERE id = ?", [user.id]);
  req.user = { id: user.id, tenantId: user.tenant_id, role: user.role };
  req.tenantId = user.tenant_id;
  await recordAudit(req, "auth.login", "users", user.id, { email });

  return {
    token: signSession(user),
    user: { id: user.id, tenantId: user.tenant_id, branchId: user.branch_id, name: user.name, email: user.email, role: user.role }
  };
}

module.exports = { login };
