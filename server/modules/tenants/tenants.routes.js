const express = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const controller = require("./tenants.controller");

const router = express.Router();

router.get("/", authenticate, authorize("reports:read"), controller.list);
router.post("/", authenticate, authorize("tenants:*"), controller.create);

module.exports = router;
