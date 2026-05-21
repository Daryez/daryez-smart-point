const express = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { requireTenant } = require("../../middlewares/tenant");
const controller = require("./backups.controller");

const router = express.Router();
router.use(authenticate, requireTenant);
router.get("/", authorize("backups:read"), controller.list);
router.post("/snapshot", authorize("backups:create"), controller.snapshot);

module.exports = router;
