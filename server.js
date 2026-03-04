const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const path = require("path");

const invoiceRoutes = require("./routes/invoiceRoutes");

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
app.use("/invoices", express.static(path.join(__dirname, "invoices")));

app.use("/api/invoices", invoiceRoutes);

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
