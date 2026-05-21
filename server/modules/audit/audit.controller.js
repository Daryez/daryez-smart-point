const { getDatabase } = require("../../database/connection");
const { ok } = require("../../utils/http");

function list(req, res) {
  return ok(res, getDatabase().many("SELECT * FROM audit_logs WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 300", [req.tenantId]));
}

module.exports = { list };
