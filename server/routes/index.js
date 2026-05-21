const express = require("express");
const authRoutes = require("../modules/auth/auth.routes");
const tenantRoutes = require("../modules/tenants/tenants.routes");
const productRoutes = require("../modules/products/products.routes");
const customerRoutes = require("../modules/customers/customers.routes");
const supplierRoutes = require("../modules/suppliers/suppliers.routes");
const salesRoutes = require("../modules/sales/sales.routes");
const supplierInvoiceRoutes = require("../modules/supplier-invoices/supplierInvoices.routes");
const invoiceTemplateRoutes = require("../modules/invoice-templates/invoiceTemplates.routes");
const membershipRoutes = require("../modules/memberships/memberships.routes");
const analyticsRoutes = require("../modules/analytics/analytics.routes");
const backupRoutes = require("../modules/backups/backups.routes");
const auditRoutes = require("../modules/audit/audit.routes");

const apiRouter = express.Router();

apiRouter.get("/health", (_req, res) => res.json({ ok: true, app: "Daryez Smart Point", version: "2.0.0" }));
apiRouter.use("/auth", authRoutes);
apiRouter.use("/tenants", tenantRoutes);
apiRouter.use("/products", productRoutes);
apiRouter.use("/customers", customerRoutes);
apiRouter.use("/suppliers", supplierRoutes);
apiRouter.use("/sales", salesRoutes);
apiRouter.use("/supplier-invoices", supplierInvoiceRoutes);
apiRouter.use("/invoice-templates", invoiceTemplateRoutes);
apiRouter.use("/memberships", membershipRoutes);
apiRouter.use("/analytics", analyticsRoutes);
apiRouter.use("/backups", backupRoutes);
apiRouter.use("/audit", auditRoutes);

module.exports = { apiRouter };
