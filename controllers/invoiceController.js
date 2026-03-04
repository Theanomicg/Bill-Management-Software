const db = require("../database");
const fs = require("fs");
const path = require("path");
const generatePDF = require("../utils/pdfGenerator");

function roundCurrency(value) {
    return Number(value.toFixed(2));
}

function normalizeItems(items) {
    if (!Array.isArray(items) || items.length === 0) {
        throw new Error("At least one item is required.");
    }

    return items.map((item, index) => {
        const name = String(item.name || "").trim();
        const quantity = Number(item.quantity);
        const unitPrice = Number(item.unitPrice ?? item.price);

        if (!name) {
            throw new Error(`Item ${index + 1}: name is required.`);
        }

        if (!Number.isFinite(quantity) || quantity <= 0) {
            throw new Error(`Item ${index + 1}: quantity must be greater than 0.`);
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new Error(`Item ${index + 1}: unit price cannot be negative.`);
        }

        const total = roundCurrency(quantity * unitPrice);

        return { name, quantity, unitPrice, total };
    });
}

function calculateTotals(items, taxRate) {
    const safeTaxRate = Number.isFinite(Number(taxRate)) && Number(taxRate) >= 0
        ? Number(taxRate)
        : 0;

    const subtotal = roundCurrency(items.reduce((sum, item) => sum + item.total, 0));
    const tax = roundCurrency((subtotal * safeTaxRate) / 100);
    const total = roundCurrency(subtotal + tax);

    return { subtotal, tax, total, taxRate: safeTaxRate };
}

function parseInvoice(invoice) {
    if (!invoice) {
        return null;
    }

    let parsedItems = [];

    try {
        parsedItems = JSON.parse(invoice.items || "[]");
    } catch (error) {
        parsedItems = [];
    }

    return {
        ...invoice,
        items: parsedItems,
        subtotal: Number(invoice.subtotal || 0),
        tax: Number(invoice.tax || 0),
        total: Number(invoice.total || 0),
        taxRate: Number(invoice.tax_rate || 0),
        shopName: invoice.shop_name || "Bill Maker Store",
        pdfUrl: `/invoices/invoice_${invoice.id}.pdf`
    };
}

exports.createInvoice = (req, res) => {
    try {
        const items = normalizeItems(req.body.items);
        const shopName = String(req.body.shopName || "Bill Maker Store").trim() || "Bill Maker Store";
        const { subtotal, tax, total, taxRate } = calculateTotals(items, req.body.taxRate);
        const date = new Date().toISOString();

        const result = db.prepare(`
            INSERT INTO invoices (date, items, subtotal, tax, total, tax_rate, shop_name)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(date, JSON.stringify(items), subtotal, tax, total, taxRate, shopName);

        const invoiceId = result.lastInsertRowid;
        const invoice = {
            id: invoiceId,
            date,
            items: JSON.stringify(items),
            subtotal,
            tax,
            total,
            tax_rate: taxRate,
            shop_name: shopName
        };

        generatePDF(parseInvoice(invoice));

        res.status(201).json({
            message: "Invoice created",
            invoiceId,
            invoice: parseInvoice(invoice)
        });
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

exports.getInvoices = (req, res) => {
    const clauses = [];
    const params = [];

    if (req.query.search) {
        const term = `%${String(req.query.search).trim()}%`;
        clauses.push("(CAST(id AS TEXT) LIKE ? OR date LIKE ?)");
        params.push(term, term);
    }

    if (req.query.date) {
        clauses.push("date(date) = date(?)");
        params.push(req.query.date);
    }

    let query = "SELECT * FROM invoices";

    if (clauses.length > 0) {
        query += ` WHERE ${clauses.join(" AND ")}`;
    }

    query += " ORDER BY id DESC";

    const invoices = db.prepare(query).all(...params).map(parseInvoice);

    res.json(invoices);
};

exports.getInvoice = (req, res) => {
    const invoice = db.prepare(`
        SELECT * FROM invoices WHERE id = ?
    `).get(req.params.id);

    if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
    }

    return res.json(parseInvoice(invoice));
};

exports.updateInvoice = (req, res) => {
    const invoiceId = Number(req.params.id);
    const existingInvoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(invoiceId);

    if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
    }

    try {
        const items = normalizeItems(req.body.items);
        const shopName = String(req.body.shopName || existingInvoice.shop_name || "Bill Maker Store").trim() || "Bill Maker Store";
        const { subtotal, tax, total, taxRate } = calculateTotals(items, req.body.taxRate);

        db.prepare(`
            UPDATE invoices
            SET items = ?, subtotal = ?, tax = ?, total = ?, tax_rate = ?, shop_name = ?
            WHERE id = ?
        `).run(JSON.stringify(items), subtotal, tax, total, taxRate, shopName, invoiceId);

        const updatedInvoice = db.prepare("SELECT * FROM invoices WHERE id = ?").get(invoiceId);
        generatePDF(parseInvoice(updatedInvoice));

        return res.json({
            message: "Invoice updated",
            invoice: parseInvoice(updatedInvoice)
        });
    } catch (error) {
        return res.status(400).json({ message: error.message });
    }
};

exports.deleteInvoice = (req, res) => {
    const invoiceId = Number(req.params.id);

    const result = db.prepare("DELETE FROM invoices WHERE id = ?").run(invoiceId);

    if (result.changes === 0) {
        return res.status(404).json({ message: "Invoice not found" });
    }

    const invoicePath = path.join(__dirname, "..", "invoices", `invoice_${invoiceId}.pdf`);

    if (fs.existsSync(invoicePath)) {
        fs.unlinkSync(invoicePath);
    }

    return res.json({ message: "Invoice deleted" });
};
