const { getDatabase } = require("../../database/connection");
const { created, ok } = require("../../utils/http");
const { cleanText } = require("../../utils/security");

function list(_req, res) {
  return ok(res, getDatabase().many("SELECT id, name, plan, status, created_at FROM tenants ORDER BY id DESC LIMIT 100"));
}

function create(req, res) {
  const name = cleanText(req.body.name, 120);
  if (!name) {
    const error = new Error("El nombre de la empresa es obligatorio.");
    error.status = 400;
    throw error;
  }
  const result = getDatabase().query("INSERT INTO tenants (name, tax_id, plan) VALUES (?, ?, ?)", [name, cleanText(req.body.taxId), req.body.plan || "basic"]);
  return created(res, getDatabase().one("SELECT * FROM tenants WHERE id = ?", [result.lastInsertRowid]));
}

module.exports = { list, create };
