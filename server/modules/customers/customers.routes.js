const express = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { requireTenant } = require("../../middlewares/tenant");
const controller = require("./customers.controller");

const router = express.Router();
router.use(authenticate, requireTenant);
router.get("/", authorize("customers:read"), controller.list);
router.post("/", authorize("customers:create"), controller.create);
router.put("/:id", authorize("customers:update"), controller.update);

module.exports = router;
