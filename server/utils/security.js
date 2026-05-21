const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { env } = require("../config/env");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function cleanText(value, max = 250) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, max);
}

async function hashPassword(password) {
  return bcrypt.hash(`${password}${env.passwordPepper}`, 12);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(`${password}${env.passwordPepper}`, hash);
}

function signSession(user) {
  return jwt.sign(
    { id: user.id, tenantId: user.tenant_id, branchId: user.branch_id, role: user.role, email: user.email, name: user.name },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn }
  );
}

module.exports = { normalizeEmail, cleanText, hashPassword, verifyPassword, signSession };
