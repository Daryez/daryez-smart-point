const express = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { requireTenant } = require("../../middlewares/tenant");
const controller = require("./products.controller");

const router = express.Router();
router.use(authenticate, requireTenant);
router.get("/", authorize("products:read"), controller.list);
router.post("/", authorize("products:create"), controller.create);
router.put("/:id", authorize("products:update"), controller.update);

module.exports = router;
