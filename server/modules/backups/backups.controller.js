const crypto = require("crypto");
const { getDatabase } = require("../../database/connection");
const { ok, created } = require("../../utils/http");
const { recordAudit } = require("../../utils/audit");

function list(req, res) {
  return ok(res, getDatabase().many("SELECT * FROM backups WHERE tenant_id = ? ORDER BY created_at DESC LIMIT 100", [req.tenantId]));
}

async function snapshot(req, res) {
  const checksum = crypto.createHash("sha256").update(`${req.tenantId}:${Date.now()}`).digest("hex");
  const result = getDatabase().query("INSERT INTO backups (tenant_id, type, status, checksum, path) VALUES (?, ?, ?, ?, ?)", [req.tenantId, "snapshot", "created", checksum, "database-managed"]);
  await recordAudit(req, "backups.snapshot", "backups", result.lastInsertRowid, { checksum });
  return created(res, getDatabase().one("SELECT * FROM backups WHERE id = ?", [result.lastInsertRowid]));
}

module.exports = { list, snapshot };
