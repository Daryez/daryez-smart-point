const service = require("./auth.service");
const { ok } = require("../../utils/http");

async function login(req, res) {
  const session = await service.login(req);
  res.cookie("dsp_token", session.token, { httpOnly: true, sameSite: "lax", secure: false });
  return ok(res, session);
}

function me(req, res) {
  return ok(res, { user: req.user });
}

function logout(_req, res) {
  res.clearCookie("dsp_token");
  return ok(res, { loggedOut: true });
}

module.exports = { login, me, logout };
