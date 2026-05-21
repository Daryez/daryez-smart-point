const express = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { requireTenant } = require("../../middlewares/tenant");
const controller = require("./sales.controller");

const router = express.Router();
router.use(authenticate, requireTenant);
router.get("/", authorize("sales:read"), controller.list);
router.post("/", authorize("sales:create"), controller.create);

module.exports = router;
