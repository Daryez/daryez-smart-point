const express = require("express");
const { authenticate, authorize } = require("../../middlewares/auth");
const { requireTenant } = require("../../middlewares/tenant");
const controller = require("./memberships.controller");

const router = express.Router();
router.use(authenticate, requireTenant);
router.get("/plans", controller.plans);
router.get("/current", controller.current);
router.post("/checkout-intent", authorize("memberships:write"), controller.checkoutIntent);

module.exports = router;
