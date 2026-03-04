# Bill Management Software

A lightweight billing app for creating invoices, calculating GST, saving invoice history, and exporting printable PDF invoices.

## Features

- Add multiple bill items (name, quantity, unit price)
- Edit or remove items before saving
- Optional GST with configurable rate
- Auto-calculated subtotal, tax, and final total
- Save invoices to SQLite database
- Search invoices by invoice number or date
- Edit and delete saved invoices
- Generate and view formatted PDF invoices
- Print latest invoice from the web panel

## Tech Stack

- Node.js
- Express.js
- SQLite (`better-sqlite3`)
- PDFKit
- HTML, CSS, JavaScript (vanilla frontend)

## Prerequisites

- Node.js 18+ (recommended Node.js 20 LTS)
- npm (comes with Node.js)
- Windows, macOS, or Linux

## Download and Setup

1. Clone the repository:

```bash
git clone https://github.com/Theanomicg/Bill-Management-Software.git
```

2. Go to the project folder:

```bash
cd Bill-Management-Software
```

3. Install dependencies:

```bash
npm install
```

4. Start the server:

```bash
node server.js
```

5. Open in browser:

```text
http://localhost:3000
```

## How to Use

1. Enter shop name, item name, quantity, and unit price.
2. Click `Add Item` for each line item.
3. Toggle `Apply GST` and set tax rate if needed.
4. Click `Save Invoice` to create and export PDF.
5. Use `Invoice History` to search, view PDF, edit, or delete invoices.
6. Click `Print Latest` to print the most recently saved invoice.

## Project Structure

```text
Bill-Management-Software/
  controllers/
  db/
  invoices/
  public/
  routes/
  utils/
  database.js
  server.js
  package.json
```

## API Endpoints

- `POST /api/invoices` - Create invoice
- `GET /api/invoices` - Get all invoices (supports `search` and `date` query params)
- `GET /api/invoices/:id` - Get invoice by ID
- `PUT /api/invoices/:id` - Update invoice
- `DELETE /api/invoices/:id` - Delete invoice

## Notes

- Generated invoice PDFs are saved in `invoices/`.
- SQLite database file is stored in `db/invoices.db`.
- `.gitignore` is configured to ignore local DB and generated PDFs.

## License

This project is currently unlicensed.
