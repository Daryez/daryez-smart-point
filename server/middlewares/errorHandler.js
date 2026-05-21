const fs = require("fs");
const path = require("path");

function notFound(req, res, next) {
  const error = new Error(`Ruta no encontrada: ${req.method} ${req.originalUrl}`);
  error.status = 404;
  next(error);
}

function writeServerError(error, req, status) {
  if (status < 500) return;
  const logsDir = path.resolve(process.cwd(), "logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const entry = {
    createdAt: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    status,
    message: error.message,
    stack: error.stack
  };
  fs.appendFileSync(path.join(logsDir, "server-error.log"), `${JSON.stringify(entry)}\n`, "utf8");
}

function errorHandler(error, req, res, _next) {
  const status = error.status || 500;
  writeServerError(error, req, status);
  res.status(status).json({
    ok: false,
    message: status >= 500 ? "Ocurrio un error inesperado." : error.message,
    code: error.code || "APP_ERROR"
  });
}

module.exports = { notFound, errorHandler };
