const express = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { requireTenant } = require("../../middlewares/tenant");
const controller = require("./supplierInvoices.controller");

const router = express.Router();
router.use(authenticate, requireTenant);
router.get("/", authorize("suppliers:read"), controller.list);
router.post("/", authorize("suppliers:create"), controller.create);
router.put("/:id", authorize("suppliers:update"), controller.update);
router.get("/alerts", authorize("suppliers:read"), controller.alerts);

module.exports = router;
