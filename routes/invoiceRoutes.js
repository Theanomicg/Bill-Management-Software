const express = require("express");
const router = express.Router();

const {
    createInvoice,
    getInvoices,
    getInvoice,
    updateInvoice,
    deleteInvoice
} = require("../controllers/invoiceController");

router.post("/", createInvoice);
router.get("/", getInvoices);
router.get("/:id", getInvoice);
router.put("/:id", updateInvoice);
router.delete("/:id", deleteInvoice);

module.exports = router;
