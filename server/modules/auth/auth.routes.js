const express = require("express");
const { authRateLimit } = require("../../middlewares/rateLimit");
const { authenticate } = require("../../middlewares/auth");
const controller = require("./auth.controller");

const router = express.Router();

router.post("/login", authRateLimit, controller.login);
router.get("/me", authenticate, controller.me);
router.post("/logout", authenticate, controller.logout);

module.exports = router;
