function requireTenant(req, _res, next) {
  const tenantId = req.tenantId || req.headers["x-tenant-id"];
  if (!tenantId) {
    const error = new Error("Empresa requerida.");
    error.status = 400;
    return next(error);
  }
  req.tenantId = Number(tenantId);
  return next();
}

module.exports = { requireTenant };
