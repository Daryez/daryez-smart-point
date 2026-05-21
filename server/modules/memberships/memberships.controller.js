const { getDatabase } = require("../../database/connection");
const { ok } = require("../../utils/http");
const { PLANS } = require("./plans");

function plans(_req, res) {
  return ok(res, PLANS);
}

function current(req, res) {
  const membership = getDatabase().one("SELECT * FROM memberships WHERE tenant_id = ? ORDER BY id DESC LIMIT 1", [req.tenantId]);
  return ok(res, membership || { plan: "basic", status: "trial" });
}

function checkoutIntent(req, res) {
  return ok(res, {
    provider: req.body.provider || "stripe",
    plan: req.body.plan || "professional",
    status: "pending_configuration",
    message: "Configura STRIPE_SECRET_KEY o PayPal para activar pagos reales."
  });
}

module.exports = { plans, current, checkoutIntent };
