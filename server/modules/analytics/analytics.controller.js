const { getDatabase } = require("../../database/connection");
const { ok } = require("../../utils/http");

function summary(req, res) {
  const db = getDatabase();
  const sales = db.one("SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total FROM sales WHERE tenant_id = ?", [req.tenantId]);
  const products = db.one("SELECT COUNT(*) AS count, COALESCE(SUM(stock * cost), 0) AS inventory_cost FROM products WHERE tenant_id = ?", [req.tenantId]);
  const lowStock = db.one("SELECT COUNT(*) AS count FROM products WHERE tenant_id = ? AND stock <= min_stock", [req.tenantId]);
  return ok(res, { sales, products, lowStock });
}

module.exports = { summary };
