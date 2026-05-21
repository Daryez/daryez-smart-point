const express = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { requireTenant } = require("../../middlewares/tenant");
const controller = require("./suppliers.controller");

const router = express.Router();
router.use(authenticate, requireTenant);
router.get("/", authorize("suppliers:read"), controller.list);
router.post("/", authorize("suppliers:create"), controller.create);
router.put("/:id", authorize("suppliers:update"), controller.update);

module.exports = router;
