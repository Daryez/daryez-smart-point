const express = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { requireTenant } = require("../../middlewares/tenant");
const controller = require("./audit.controller");

const router = express.Router();
router.use(authenticate, requireTenant);
router.get("/", authorize("audit:read"), controller.list);

module.exports = router;
