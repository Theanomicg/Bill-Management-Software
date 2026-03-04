const state = {
    items: [],
    invoices: [],
    editingInvoiceId: null,
    lastGeneratedInvoiceId: null
};

const refs = {
    name: document.getElementById("name"),
    quantity: document.getElementById("quantity"),
    price: document.getElementById("price"),
    shopName: document.getElementById("shopName"),
    addItemBtn: document.getElementById("addItemBtn"),
    saveInvoiceBtn: document.getElementById("saveInvoiceBtn"),
    clearBtn: document.getElementById("clearBtn"),
    printLatestBtn: document.getElementById("printLatestBtn"),
    itemsTableBody: document.querySelector("#itemsTable tbody"),
    historyTableBody: document.querySelector("#historyTable tbody"),
    subtotal: document.getElementById("subtotal"),
    tax: document.getElementById("tax"),
    total: document.getElementById("total"),
    status: document.getElementById("statusMessage"),
    formModeBadge: document.getElementById("formModeBadge"),
    applyTax: document.getElementById("applyTax"),
    taxRate: document.getElementById("taxRate"),
    searchInput: document.getElementById("searchInput"),
    dateFilter: document.getElementById("dateFilter"),
    searchBtn: document.getElementById("searchBtn"),
    resetFilterBtn: document.getElementById("resetFilterBtn")
};

function formatCurrency(value) {
    return `Rs ${Number(value).toFixed(2)}`;
}

function getTaxRate() {
    if (!refs.applyTax.checked) {
        return 0;
    }

    const value = Number(refs.taxRate.value);
    return Number.isFinite(value) && value >= 0 ? value : 0;
}

function calculateTotals() {
    const subtotal = state.items.reduce((sum, item) => sum + item.total, 0);
    const taxRate = getTaxRate();
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;

    return {
        subtotal: Number(subtotal.toFixed(2)),
        tax: Number(tax.toFixed(2)),
        total: Number(total.toFixed(2))
    };
}

function setStatus(message, isError = false) {
    refs.status.textContent = message;
    refs.status.classList.toggle("error", isError);
}

function resetEntryFields() {
    refs.name.value = "";
    refs.quantity.value = "";
    refs.price.value = "";
    refs.name.focus();
}

function addItem() {
    const name = refs.name.value.trim();
    const quantity = Number(refs.quantity.value);
    const unitPrice = Number(refs.price.value);

    if (!name) {
        setStatus("Item name is required.", true);
        return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
        setStatus("Quantity must be greater than 0.", true);
        return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        setStatus("Unit price cannot be negative.", true);
        return;
    }

    state.items.push({
        name,
        quantity,
        unitPrice,
        total: Number((quantity * unitPrice).toFixed(2))
    });

    renderItems();
    updateSummary();
    resetEntryFields();
    setStatus("Item added.");
}

function renderItems() {
    refs.itemsTableBody.innerHTML = "";

    if (state.items.length === 0) {
        refs.itemsTableBody.innerHTML = `<tr><td colspan="5" class="empty-row">No items added yet.</td></tr>`;
        return;
    }

    state.items.forEach((item, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td><input data-field="name" data-index="${index}" type="text" value="${item.name}"></td>
            <td><input data-field="quantity" data-index="${index}" type="number" min="1" step="1" value="${item.quantity}"></td>
            <td><input data-field="unitPrice" data-index="${index}" type="number" min="0" step="0.01" value="${item.unitPrice}"></td>
            <td>${formatCurrency(item.total)}</td>
            <td><button class="btn danger" data-action="remove" data-index="${index}">Remove</button></td>
        `;
        refs.itemsTableBody.appendChild(row);
    });
}

function updateSummary() {
    const totals = calculateTotals();
    refs.subtotal.textContent = `Subtotal: ${formatCurrency(totals.subtotal)}`;
    refs.tax.textContent = `Tax: ${formatCurrency(totals.tax)}`;
    refs.total.textContent = `Total: ${formatCurrency(totals.total)}`;
}

function sanitizeItemsForPayload() {
    return state.items.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice
    }));
}

async function saveInvoice() {
    if (state.items.length === 0) {
        setStatus("Add at least one item before saving.", true);
        return;
    }

    const payload = {
        shopName: refs.shopName.value.trim() || "Bill Maker Store",
        taxRate: getTaxRate(),
        items: sanitizeItemsForPayload()
    };

    const isEditing = state.editingInvoiceId !== null;
    const endpoint = isEditing ? `/api/invoices/${state.editingInvoiceId}` : "/api/invoices";
    const method = isEditing ? "PUT" : "POST";

    try {
        setStatus("Saving invoice...");
        const response = await fetch(endpoint, {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to save invoice.");
        }

        const invoice = result.invoice;
        state.lastGeneratedInvoiceId = invoice.id;
        setStatus(`Invoice #${invoice.id} ${isEditing ? "updated" : "created"} successfully.`);

        if (!isEditing) {
            window.open(invoice.pdfUrl, "_blank");
        }

        clearForm(false);
        await loadInvoices();
    } catch (error) {
        setStatus(error.message, true);
    }
}

function clearForm(clearStatus = true) {
    state.items = [];
    state.editingInvoiceId = null;
    refs.applyTax.checked = true;
    refs.taxRate.value = "5";
    refs.formModeBadge.textContent = "New";
    refs.saveInvoiceBtn.textContent = "Save Invoice";
    renderItems();
    updateSummary();
    resetEntryFields();

    if (clearStatus) {
        setStatus("");
    }
}

function startEditing(invoice) {
    state.editingInvoiceId = invoice.id;
    state.items = (invoice.items || []).map((item) => ({
        name: item.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice ?? item.price),
        total: Number((Number(item.quantity) * Number(item.unitPrice ?? item.price)).toFixed(2))
    }));
    refs.shopName.value = invoice.shopName || "Bill Maker Store";
    refs.applyTax.checked = Number(invoice.taxRate || 0) > 0;
    refs.taxRate.value = Number(invoice.taxRate || 0).toFixed(2);
    refs.formModeBadge.textContent = `Editing #${invoice.id}`;
    refs.saveInvoiceBtn.textContent = "Update Invoice";

    renderItems();
    updateSummary();
    setStatus(`Invoice #${invoice.id} loaded for editing.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderHistory() {
    refs.historyTableBody.innerHTML = "";

    if (state.invoices.length === 0) {
        refs.historyTableBody.innerHTML = `<tr><td colspan="4" class="empty-row">No invoices found.</td></tr>`;
        return;
    }

    state.invoices.forEach((invoice) => {
        const row = document.createElement("tr");
        const formattedDate = new Date(invoice.date).toLocaleString();
        row.innerHTML = `
            <td>${invoice.id}</td>
            <td>${formattedDate}</td>
            <td>${formatCurrency(invoice.total)}</td>
            <td>
                <div class="history-actions">
                    <button class="btn ghost" data-action="view" data-id="${invoice.id}">View PDF</button>
                    <button class="btn ghost" data-action="edit" data-id="${invoice.id}">Edit</button>
                    <button class="btn danger" data-action="delete" data-id="${invoice.id}">Delete</button>
                </div>
            </td>
        `;
        refs.historyTableBody.appendChild(row);
    });
}

async function loadInvoices() {
    const search = refs.searchInput.value.trim();
    const date = refs.dateFilter.value;
    const params = new URLSearchParams();

    if (search) {
        params.set("search", search);
    }

    if (date) {
        params.set("date", date);
    }

    const url = params.toString() ? `/api/invoices?${params.toString()}` : "/api/invoices";

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error("Failed to load invoices.");
        }

        state.invoices = await response.json();
        renderHistory();
    } catch (error) {
        setStatus(error.message, true);
    }
}

async function deleteInvoice(invoiceId) {
    const confirmed = window.confirm(`Delete invoice #${invoiceId}? This cannot be undone.`);

    if (!confirmed) {
        return;
    }

    try {
        const response = await fetch(`/api/invoices/${invoiceId}`, { method: "DELETE" });
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Failed to delete invoice.");
        }

        setStatus(`Invoice #${invoiceId} deleted.`);
        if (state.editingInvoiceId === invoiceId) {
            clearForm();
        }

        await loadInvoices();
    } catch (error) {
        setStatus(error.message, true);
    }
}

function printLatestInvoice() {
    if (!state.lastGeneratedInvoiceId) {
        setStatus("Save an invoice first to print it.", true);
        return;
    }

    const pdfUrl = `/invoices/invoice_${state.lastGeneratedInvoiceId}.pdf`;
    const printWindow = window.open(pdfUrl, "_blank");

    if (!printWindow) {
        setStatus("Popup blocked. Allow popups to print invoices.", true);
        return;
    }

    printWindow.addEventListener("load", () => {
        printWindow.print();
    });
}

refs.addItemBtn.addEventListener("click", addItem);
refs.saveInvoiceBtn.addEventListener("click", saveInvoice);
refs.clearBtn.addEventListener("click", () => clearForm());
refs.printLatestBtn.addEventListener("click", printLatestInvoice);
refs.searchBtn.addEventListener("click", loadInvoices);
refs.resetFilterBtn.addEventListener("click", async () => {
    refs.searchInput.value = "";
    refs.dateFilter.value = "";
    await loadInvoices();
});
refs.applyTax.addEventListener("change", updateSummary);
refs.taxRate.addEventListener("input", updateSummary);

refs.itemsTableBody.addEventListener("input", (event) => {
    const index = Number(event.target.dataset.index);
    const field = event.target.dataset.field;

    if (!Number.isInteger(index) || !field || !state.items[index]) {
        return;
    }

    if (field === "name") {
        state.items[index].name = event.target.value.trim();
    }

    if (field === "quantity" || field === "unitPrice") {
        const numericValue = Number(event.target.value);

        if (!Number.isFinite(numericValue)) {
            return;
        }

        state.items[index][field] = numericValue;
        state.items[index].total = Number((state.items[index].quantity * state.items[index].unitPrice).toFixed(2));
    }

    updateSummary();
});

refs.itemsTableBody.addEventListener("click", (event) => {
    if (event.target.dataset.action !== "remove") {
        return;
    }

    const index = Number(event.target.dataset.index);

    if (!Number.isInteger(index)) {
        return;
    }

    state.items.splice(index, 1);
    renderItems();
    updateSummary();
});

refs.historyTableBody.addEventListener("click", async (event) => {
    const button = event.target.closest("button");

    if (!button) {
        return;
    }

    const action = button.dataset.action;
    const invoiceId = Number(button.dataset.id);
    const invoice = state.invoices.find((item) => item.id === invoiceId);

    if (!invoice) {
        return;
    }

    if (action === "view") {
        window.open(invoice.pdfUrl, "_blank");
    }

    if (action === "edit") {
        startEditing(invoice);
    }

    if (action === "delete") {
        await deleteInvoice(invoiceId);
    }
});

renderItems();
updateSummary();
loadInvoices();
