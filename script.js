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
  const jobDetails = document.getElementById("jobDetails");
  const customerAddress = document.getElementById("customerAddress");
  const customerName = document.getElementById("customerName");
  const notes = document.getElementById("notes");

  // Show document type
  togglePaymentDetails();

  // Show plain text for name/address
  document.querySelector(".printCustomerName").innerText = customerName.value;
  document.querySelector(".printCustomerAddress").innerText = customerAddress.value;

  // Expand textareas
  [jobDetails, customerAddress, notes].forEach(el => {
    el.setAttribute("readonly", true);
    el.style.height = el.scrollHeight + "px";
  });

  window.print();

  // Reset
  setTimeout(() => {
    [jobDetails, customerAddress, notes].forEach(el => {
      el.removeAttribute("readonly");
      el.style.height = null;
    });
  }, 1000);
}
