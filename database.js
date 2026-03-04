const Database = require("better-sqlite3");

const db = new Database("./db/invoices.db");

db.prepare(`
CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    items TEXT,
    subtotal REAL,
    tax REAL,
    total REAL,
    tax_rate REAL DEFAULT 0,
    shop_name TEXT DEFAULT 'Bill Maker Store'
)
`).run();

const existingColumns = db
    .prepare("PRAGMA table_info(invoices)")
    .all()
    .map((column) => column.name);

if (!existingColumns.includes("tax_rate")) {
    db.prepare("ALTER TABLE invoices ADD COLUMN tax_rate REAL DEFAULT 0").run();
}

if (!existingColumns.includes("shop_name")) {
    db.prepare("ALTER TABLE invoices ADD COLUMN shop_name TEXT DEFAULT 'Bill Maker Store'").run();
}

module.exports = db;
