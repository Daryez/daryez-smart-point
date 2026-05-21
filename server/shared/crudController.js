const { ok, created } = require("../utils/http");
const { recordAudit } = require("../utils/audit");

function createController(entity, repository) {
  return {
    async list(req, res) {
      const limit = Math.min(Number(req.query.limit || 100), 500);
      const offset = Number(req.query.offset || 0);
      return ok(res, await repository.list(req.tenantId, limit, offset));
    },
    async create(req, res) {
      const row = await repository.create(req.tenantId, req.body);
      await recordAudit(req, `${entity}.create`, entity, row?.id, req.body);
      return created(res, row);
    },
    async update(req, res) {
      const row = await repository.update(req.tenantId, Number(req.params.id), req.body);
      await recordAudit(req, `${entity}.update`, entity, req.params.id, req.body);
      return ok(res, row);
    }
  };
}

module.exports = { createController };
