const { getDatabase } = require("../../database/connection");
const { ok, created } = require("../../utils/http");
const { recordAudit } = require("../../utils/audit");

function list(req, res) {
  const rows = getDatabase().many("SELECT si.*, s.name AS supplier_name FROM supplier_invoices si JOIN suppliers s ON s.id = si.supplier_id WHERE si.tenant_id = ? ORDER BY si.due_date ASC", [req.tenantId]);
  return ok(res, rows);
}

async function create(req, res) {
  const body = req.body;
  const result = getDatabase().query(
    "INSERT INTO supplier_invoices (tenant_id, supplier_id, invoice_number, entry_date, due_date, amount, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [req.tenantId, body.supplierId, body.invoiceNumber, body.entryDate, body.dueDate || null, Number(body.amount || 0), body.status || "pending", body.notes || ""]
  );
  await recordAudit(req, "supplierInvoices.create", "supplier_invoices", result.lastInsertRowid, body);
  return created(res, getDatabase().one("SELECT * FROM supplier_invoices WHERE id = ?", [result.lastInsertRowid]));
}

async function update(req, res) {
  const body = req.body;
  getDatabase().query(
    "UPDATE supplier_invoices SET supplier_id = ?, invoice_number = ?, entry_date = ?, due_date = ?, amount = ?, status = ?, notes = ? WHERE tenant_id = ? AND id = ?",
    [body.supplierId, body.invoiceNumber, body.entryDate, body.dueDate || null, Number(body.amount || 0), body.status || "pending", body.notes || "", req.tenantId, req.params.id]
  );
  await recordAudit(req, "supplierInvoices.update", "supplier_invoices", req.params.id, body);
  return ok(res, getDatabase().one("SELECT * FROM supplier_invoices WHERE tenant_id = ? AND id = ?", [req.tenantId, req.params.id]));
}

function alerts(req, res) {
  const maxDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const rows = getDatabase().many(
    "SELECT * FROM supplier_invoices WHERE tenant_id = ? AND status != 'paid' AND due_date IS NOT NULL AND due_date <= ? ORDER BY due_date ASC",
    [req.tenantId, maxDate]
  );
  return ok(res, rows);
}

module.exports = { list, create, update, alerts };
