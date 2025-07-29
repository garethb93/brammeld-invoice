let itemIndex = 0;
let currentNumber = null;

function addItem() {
  const container = document.getElementById("lineItems");
  const row = document.createElement("div");
  row.className = "flex gap-2";

  row.innerHTML = `
    <input type="text" placeholder="Description" class="flex-1 border p-2 rounded" id="desc-${itemIndex}">
    <input type="number" placeholder="Qty" class="w-20 border p-2 rounded" id="qty-${itemIndex}" value="1">
    <input type="number" placeholder="Rate" class="w-24 border p-2 rounded" id="rate-${itemIndex}" value="0">
    <button onclick="removeItem(this)" class="text-red-500 font-bold">X</button>
  `;
  container.appendChild(row);
  itemIndex++;
  updateTotal();
  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("input", updateTotal);
  });
}

function removeItem(button) {
  button.parentElement.remove();
  updateTotal();
}

function updateTotal() {
  let total = 0;
  let output = "";
  for (let i = 0; i < itemIndex; i++) {
    const descEl = document.getElementById(`desc-${i}`);
    const qtyEl = document.getElementById(`qty-${i}`);
    const rateEl = document.getElementById(`rate-${i}`);
    if (descEl && qtyEl && rateEl) {
      const desc = descEl.value.trim();
      const qty = parseFloat(qtyEl.value) || 0;
      const rate = parseFloat(rateEl.value) || 0;
      const lineTotal = qty * rate;
      total += lineTotal;
      output += `${desc} (x${qty} @ £${rate.toFixed(2)}) = £${lineTotal.toFixed(2)}\n`;
    }
  }
  document.getElementById("totalAmount").innerText = total.toFixed(2);
  document.getElementById("printLineItems").innerText = output.trim();
}

function togglePaymentDetails() {
  const docType = document.getElementById("docType").value;
  const display = `${docType === "invoice" ? "Invoice" : "Quote"} ${currentNumber ? `#${currentNumber}` : ""}`;
  document.getElementById("docTypeDisplay").innerText = display;
  document.getElementById("paymentDetails").classList.toggle("hidden", docType !== "invoice");
}

function generatePDF() {
  const docType = document.getElementById("docType").value;
  const customerName = document.getElementById("customerName").value.trim();
  const dateValue = document.getElementById("invoiceDate").value;

  // Generate random number if not already generated
  currentNumber = Math.floor(1000 + Math.random() * 9000);

  // Update all printable fields
  document.getElementById("printCustomerName").innerText = customerName;
  document.getElementById("printCustomerAddress").innerText = document.getElementById("customerAddress").value.trim();
  document.getElementById("printDate").innerText = dateValue;
  document.getElementById("printJobDetails").innerText = document.getElementById("jobDetails").value.trim();
  updateTotal();
  togglePaymentDetails();

  // Create filename: "Invoice - CustomerName - Date.pdf"
  const formattedDate = dateValue || new Date().toISOString().split("T")[0];
  const safeName = customerName || "Customer";
  const filename = `${docType === "invoice" ? "Invoice" : "Quote"}-${currentNumber}-${safeName}-${formattedDate}.pdf`;

  // Trigger print (browser's Save As PDF will show the filename)
  setTimeout(() => {
    document.title = filename; // sets default filename in print dialog
    window.print();
    document.title = "Brammeld Contracts - Invoice Builder"; // restore
  }, 200);
}

// Init first cost row
addItem();
