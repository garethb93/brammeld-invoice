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
  for (let i = 0; i < itemIndex; i++) {
    const qtyEl = document.getElementById(`qty-${i}`);
    const rateEl = document.getElementById(`rate-${i}`);
    if (qtyEl && rateEl) {
      const qty = parseFloat(qtyEl.value) || 0;
      const rate = parseFloat(rateEl.value) || 0;
      total += qty * rate;
    }
  }
  document.getElementById("totalAmount").innerText = total.toFixed(2);
}

function togglePaymentDetails() {
  const docType = document.getElementById("docType").value;
  document.getElementById("paymentDetails").classList.toggle("hidden", docType !== "invoice");
  document.getElementById("docTypeDisplay").innerText = docType === "invoice" ? "Invoice" : "Quote";
}

function generatePDF() {
  // Update print-friendly text
  document.getElementById("printCustomerName").innerText = document.getElementById("customerName").value;
  document.getElementById("printCustomerAddress").innerText = document.getElementById("customerAddress").value;
  togglePaymentDetails();

  // Expand any overflowing textareas
  ["jobDetails", "customerAddress", "notes"].forEach(id => {
    const el = document.getElementById(id);
    el.setAttribute("readonly", true);
    el.style.height = el.scrollHeight + "px";
  });

  window.print();

  setTimeout(() => {
    ["jobDetails", "customerAddress", "notes"].forEach(id => {
      const el = document.getElementById(id);
      el.removeAttribute("readonly");
      el.style.height = null;
    });
  }, 500);
}
