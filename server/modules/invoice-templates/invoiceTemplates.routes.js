const express = require("express");
const multer = require("multer");
const { authenticate, authorize } = require("../../middlewares/auth");
const { requireTenant } = require("../../middlewares/tenant");
const controller = require("./invoiceTemplates.controller");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } });

router.use(authenticate, requireTenant);
router.get("/", authorize("invoiceTemplates:read"), controller.list);
router.post("/", authorize("invoiceTemplates:create"), controller.create);
router.post("/:id/default", authorize("invoiceTemplates:update"), controller.setDefault);
router.post("/preview", authorize("invoiceTemplates:read"), controller.preview);
router.post("/import-excel", authorize("invoiceTemplates:create"), upload.single("template"), controller.importExcel);

module.exports = router;
