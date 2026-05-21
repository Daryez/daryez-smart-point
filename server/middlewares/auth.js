const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

const ROLE_PERMISSIONS = {
  admin: ["*"],
  gerente: ["*"],
  supervisor: ["sales:*", "products:*", "customers:*", "suppliers:*", "reports:read", "invoiceTemplates:*"],
  auditor: ["reports:read", "audit:read", "sales:read", "products:read"],
  cashier: ["sales:create", "sales:read", "customers:read", "products:read"]
};

function authenticate(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : req.cookies?.dsp_token;
  if (!token) {
    const error = new Error("Sesion requerida.");
    error.status = 401;
    return next(error);
  }

  try {
    req.user = jwt.verify(token, env.jwtSecret);
    req.tenantId = req.user.tenantId;
    return next();
  } catch (_error) {
    const error = new Error("Sesion invalida o expirada.");
    error.status = 401;
    return next(error);
  }
}

function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] || [];
  return permissions.includes("*") || permissions.includes(permission) || permissions.some((item) => {
    const [scope] = item.split(":");
    return item.endsWith(":*") && permission.startsWith(`${scope}:`);
  });
}

function authorize(permission) {
  return (req, _res, next) => {
    if (!hasPermission(req.user?.role, permission)) {
      const error = new Error("No tienes permiso para esta accion.");
      error.status = 403;
      return next(error);
    }
    return next();
  };
}

module.exports = { ROLE_PERMISSIONS, authenticate, authorize, hasPermission };
