const { getDatabase } = require("../../database/connection");

async function list(tenantId, limit = 100, offset = 0) {
  return getDatabase().many("SELECT * FROM sales WHERE tenant_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?", [tenantId, Math.min(limit, 500), offset]);
}

async function createSale(tenantId, user, input) {
  const db = getDatabase();
  const items = Array.isArray(input.items) ? input.items : [];
  if (!items.length) {
    const error = new Error("La venta necesita al menos un producto.");
    error.status = 400;
    throw error;
  }

  let subtotal = 0;
  for (const item of items) {
    const product = db.one("SELECT * FROM products WHERE tenant_id = ? AND id = ? AND status = 'active'", [tenantId, item.productId]);
    if (!product) {
      const error = new Error("Producto no encontrado.");
      error.status = 400;
      throw error;
    }
    if (Number(item.quantity) <= 0 || Number(item.quantity) > Number(product.stock)) {
      const error = new Error(`Stock insuficiente para ${product.name}.`);
      error.status = 409;
      throw error;
    }
    subtotal += Number(item.quantity) * Number(item.unitPrice ?? product.price);
  }

  const tax = Number(input.tax || 0);
  const discount = Number(input.discount || 0);
  const total = Math.max(0, subtotal + tax - discount);
  const invoiceNumber = String(input.invoiceNumber || `DSP-${Date.now()}`);
  const result = db.query(
    "INSERT INTO sales (tenant_id, branch_id, user_id, customer_id, invoice_number, fiscal_receipt_type, fiscal_number, fiscal_issuer_id, fiscal_customer_id, payment_method, subtotal, tax, discount, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [tenantId, user.branchId || null, user.id, input.customerId || null, invoiceNumber, input.fiscalReceiptType || null, input.fiscalNumber || null, input.fiscalIssuerId || null, input.fiscalCustomerId || null, input.paymentMethod || "cash", subtotal, tax, discount, total]
  );
  const saleId = result.lastInsertRowid;

  for (const item of items) {
    const product = db.one("SELECT * FROM products WHERE tenant_id = ? AND id = ?", [tenantId, item.productId]);
    const quantity = Number(item.quantity);
    const unitPrice = Number(item.unitPrice ?? product.price);
    const lineTotal = quantity * unitPrice;
    db.query("INSERT INTO sale_items (sale_id, product_id, quantity, unit_price, discount, total) VALUES (?, ?, ?, ?, ?, ?)", [saleId, product.id, quantity, unitPrice, Number(item.discount || 0), lineTotal]);
    db.query("UPDATE products SET stock = stock - ? WHERE tenant_id = ? AND id = ? AND stock >= ?", [quantity, tenantId, product.id, quantity]);
  }

  return db.one("SELECT * FROM sales WHERE tenant_id = ? AND id = ?", [tenantId, saleId]);
}

module.exports = { list, createSale };
