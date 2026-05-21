const rateLimit = require("express-rate-limit");

const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 800,
  standardHeaders: true,
  legacyHeaders: false
});

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { apiRateLimit, authRateLimit };
