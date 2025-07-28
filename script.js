let itemIndex = 0;

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
  document.getElementById("paymentDetails").classList.toggle("hidden", docType !== "invoice");
  document.getElementById("docTypeDisplay").innerText = docType === "invoice" ? "Invoice" : "Quote";
}

function generatePDF() {
  document.getElementById("printCustomerName").innerText = document.getElementById("customerName").value;
  document.getElementById("printCustomerAddress").innerText = document.getElementById("customerAddress").value;
  document.getElementById("printDate").innerText = document.getElementById("invoiceDate").value;
  document.getElementById("printJobDetails").innerText = document.getElementById("jobDetails").value;
  updateTotal();
  togglePaymentDetails();
  window.print();
}

// Init
addItem();
