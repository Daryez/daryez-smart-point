const express = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { requireTenant } = require("../../middlewares/tenant");
const controller = require("./analytics.controller");

const router = express.Router();
router.use(authenticate, requireTenant);
router.get("/summary", authorize("reports:read"), controller.summary);

module.exports = router;
