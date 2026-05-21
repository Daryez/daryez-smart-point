const { getDatabase } = require("../../database/connection");
const { ok, created } = require("../../utils/http");
const { recordAudit } = require("../../utils/audit");
const { buildPreviewContext, detectPlaceholders, importExcelTemplate, renderTemplate } = require("./templateEngine");

function list(req, res) {
  return ok(res, getDatabase().many("SELECT id, name, type, source, is_default, created_at, updated_at FROM invoice_templates WHERE tenant_id = ? ORDER BY is_default DESC, id DESC", [req.tenantId]));
}

async function create(req, res) {
  const content = req.body.content || { title: "{{empresa}}", lines: ["Cliente: {{cliente}}", "Total: {{total}}"] };
  const result = getDatabase().query(
    "INSERT INTO invoice_templates (tenant_id, name, type, source, content_json, is_default) VALUES (?, ?, ?, ?, ?, ?)",
    [req.tenantId, req.body.name || "Plantilla personalizada", req.body.type || "ticket", req.body.source || "visual", JSON.stringify(content), req.body.isDefault ? 1 : 0]
  );
  await recordAudit(req, "invoiceTemplates.create", "invoice_templates", result.lastInsertRowid, { name: req.body.name });
  return created(res, getDatabase().one("SELECT * FROM invoice_templates WHERE id = ?", [result.lastInsertRowid]));
}

function preview(req, res) {
  const context = { ...buildPreviewContext(), ...(req.body.context || {}) };
  return ok(res, {
    rendered: renderTemplate(req.body.template || {}, context),
    placeholders: detectPlaceholders(JSON.stringify(req.body.template || {}))
  });
}

async function importExcel(req, res) {
  if (!req.file) {
    const error = new Error("Debes subir una plantilla .xlsx.");
    error.status = 400;
    throw error;
  }
  const template = importExcelTemplate(req.file.buffer);
  const result = getDatabase().query(
    "INSERT INTO invoice_templates (tenant_id, name, type, source, content_json, is_default) VALUES (?, ?, ?, ?, ?, ?)",
    [req.tenantId, req.body.name || req.file.originalname, req.body.type || "letter", "excel", JSON.stringify(template), 0]
  );
  await recordAudit(req, "invoiceTemplates.importExcel", "invoice_templates", result.lastInsertRowid, { filename: req.file.originalname });
  return created(res, getDatabase().one("SELECT * FROM invoice_templates WHERE id = ?", [result.lastInsertRowid]));
}

async function setDefault(req, res) {
  getDatabase().query("UPDATE invoice_templates SET is_default = 0 WHERE tenant_id = ?", [req.tenantId]);
  getDatabase().query("UPDATE invoice_templates SET is_default = 1 WHERE tenant_id = ? AND id = ?", [req.tenantId, req.params.id]);
  await recordAudit(req, "invoiceTemplates.setDefault", "invoice_templates", req.params.id);
  return ok(res, { id: Number(req.params.id), isDefault: true });
}

module.exports = { list, create, preview, importExcel, setDefault };
