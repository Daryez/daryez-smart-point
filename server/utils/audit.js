const { getDatabase } = require("../database/connection");

async function recordAudit(req, action, entity, entityId, payload = {}) {
  const db = getDatabase();
  const tenantId = req.tenantId || req.user?.tenantId || null;
  const userId = req.user?.id || null;
  const ip = req.ip || req.headers["x-forwarded-for"] || null;
  const device = req.headers["user-agent"] || null;

  const sql = "INSERT INTO audit_logs (tenant_id, user_id, action, entity, entity_id, ip, device, payload_json) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
  return db.query(sql, [tenantId, userId, action, entity, String(entityId || ""), ip, device, JSON.stringify(payload)]);
}

module.exports = { recordAudit };
