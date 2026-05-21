const service = require("./sales.service");
const { ok, created } = require("../../utils/http");
const { recordAudit } = require("../../utils/audit");

async function list(req, res) {
  return ok(res, await service.list(req.tenantId, Number(req.query.limit || 100), Number(req.query.offset || 0)));
}

async function create(req, res) {
  const sale = await service.createSale(req.tenantId, req.user, req.body);
  await recordAudit(req, "sales.create", "sales", sale.id, { total: sale.total, items: req.body.items?.length || 0 });
  return created(res, sale);
}

module.exports = { list, create };
