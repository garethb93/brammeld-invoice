// ✅ Firebase Setup
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  deleteDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyCzBuns8nHGN0sNjuTY5RIDZ85aUGx-THA",
  authDomain: "brammeld-invoice-a804f.firebaseapp.com",
  projectId: "brammeld-invoice-a804f",
  storageBucket: "brammeld-invoice-a804f.firebasestorage.app",
  messagingSenderId: "533156932511",
  appId: "1:533156932511:web:8fadd6e0d7a70e32bbabaa"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth();
const db = getFirestore();

let currentUserId = null;

// ✅ Elements
const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const quotesUl = document.getElementById("quotesUl");
const lineItems = document.getElementById("lineItems");

// ✅ Auth State
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    loginSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    loadQuotes();
  } else {
    currentUserId = null;
    loginSection.classList.remove("hidden");
    appSection.classList.add("hidden");
  }
});

// ✅ Login
loginBtn.addEventListener("click", async () => {
  document.getElementById("loginSpinner").classList.remove("hidden");
  document.getElementById("loginText").textContent = "Logging in...";
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
  document.getElementById("loginSpinner").classList.add("hidden");
  document.getElementById("loginText").textContent = "Login";
});

// ✅ Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// ✅ Add Item
function addItem(desc = "", qty = 1, rate = 0) {
  const row = document.createElement("div");
  row.classList.add("itemRow");
  row.innerHTML = `
    <input placeholder="Description" value="${desc}">
    <input type="number" value="${qty}" min="1">
    <input type="number" value="${rate}" min="0">
    <button class="removeBtn">❌</button>
  `;
  lineItems.appendChild(row);
  row.querySelector(".removeBtn").addEventListener("click", () => {
    row.remove();
    updateTotal();
  });
  row.querySelectorAll("input").forEach(input =>
    input.addEventListener("input", updateTotal)
  );
  updateTotal();
}

// ✅ Update Total
function updateTotal() {
  let total = 0;
  let output = "";
  [...lineItems.children].forEach(row => {
    const [descEl, qtyEl, rateEl] = row.querySelectorAll("input");
    const desc = descEl.value;
    const qty = parseFloat(qtyEl.value) || 0;
    const rate = parseFloat(rateEl.value) || 0;
    const subtotal = qty * rate;
    total += subtotal;
    output += `${desc} (x${qty} @ £${rate.toFixed(2)}) = £${subtotal.toFixed(2)}\n`;
  });
  document.getElementById("printLineItems").innerText = output.trim();
  document.getElementById("totalAmount").innerText = total.toFixed(2);
}

// ✅ Format Number
function formatNumber(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(-2);
  const rand = String(Math.floor(Math.random() * 90 + 10));
  return `${dd}${mm}${yy}-${rand}`;
}

// ✅ Toggle payment details if invoice selected
function setDocTypeDisplay() {
  const docType = document.getElementById("docType").value;
  const paymentDetails = document.getElementById("paymentDetails");
  paymentDetails.classList.toggle("hidden", docType !== "invoice");
}

document.getElementById("docType").addEventListener("change", setDocTypeDisplay);

// ✅ Generate PDF
window.generatePDF = () => {
  const docType = document.getElementById("docType").value;
  const customerName = document.getElementById("customerName").value.trim();
  const address = document.getElementById("customerAddress").value.trim();
  const job = document.getElementById("jobDetails").value.trim();
  const notes = document.getElementById("notes").value.trim();
  const date = document.getElementById("invoiceDate").value.trim();
  const number = formatNumber(date);

  document.getElementById("docTypeDisplay").innerText = `${docType} #${number}`;
  document.getElementById("printDate").innerText = date;
  document.getElementById("printCustomerName").innerText = customerName;
  document.getElementById("printCustomerAddress").innerText = address;
  document.getElementById("printJobDetails").innerText = job;
  document.getElementById("printNotes").innerText = notes;

  document.body.classList.add("print-view");

  setTimeout(() => {
    window.print();
    document.body.classList.remove("print-view");
  }, 200);
};

// ✅ Get Form Data
function getFormData() {
  const items = [...lineItems.children].map(row => {
    const [descEl, qtyEl, rateEl] = row.querySelectorAll("input");
    return {
      description: descEl.value,
      quantity: qtyEl.value,
      rate: rateEl.value
    };
  });

  return {
    type: document.getElementById("docType").value,
    date: document.getElementById("invoiceDate").value.trim(),
    customerName: document.getElementById("customerName").value.trim(),
    customerAddress: document.getElementById("customerAddress").value.trim(),
    jobDescription: document.getElementById("jobDetails").value.trim(),
    items,
    total: document.getElementById("totalAmount").innerText,
    notes: document.getElementById("notes").value.trim()
  };
}

// ✅ Save Quote
window.saveQuote = async () => {
  const data = getFormData();
  data.userId = currentUserId;
  await addDoc(collection(db, "quotes"), data);
  alert("Quote saved!");
  loadQuotes();
};

// ✅ Load Quotes
async function loadQuotes() {
  quotesUl.innerHTML = "";
  const q = query(collection(db, "quotes"), where("userId", "==", currentUserId));
  const snapshot = await getDocs(q);
  snapshot.forEach(doc => {
    const li = document.createElement("li");
    li.innerHTML = `
      <button data-id="${doc.id}" class="openBtn">${doc.data().customerName || "Untitled"}</button>
      <button data-id="${doc.id}" class="deleteBtn">🗑️</button>
    `;
    quotesUl.appendChild(li);
  });

  // Attach listeners after render
  document.querySelectorAll(".openBtn").forEach(btn =>
    btn.addEventListener("click", () => confirmOpen(btn.dataset.id))
  );
  document.querySelectorAll(".deleteBtn").forEach(btn =>
    btn.addEventListener("click", () => confirmDelete(btn.dataset.id))
  );
}

// ✅ Confirm Open
function confirmOpen(id) {
  if (confirm("Open this quote? Unsaved changes will be lost.")) {
    openQuote(id);
  }
}

// ✅ Confirm Delete
async function confirmDelete(id) {
  if (confirm("Delete this quote permanently?")) {
    await deleteDoc(doc(db, "quotes", id));
    loadQuotes();
  }
}

// ✅ Open Saved Quote
async function openQuote(id) {
  const snap = await getDoc(doc(db, "quotes", id));
  if (snap.exists()) {
    const data = snap.data();
    document.getElementById("docType").value = data.type;
    document.getElementById("invoiceDate").value = data.date;
    document.getElementById("customerName").value = data.customerName;
    document.getElementById("customerAddress").value = data.customerAddress;
    document.getElementById("jobDetails").value = data.jobDescription;
    document.getElementById("notes").value = data.notes || "";

    lineItems.innerHTML = "";
    data.items.forEach(item =>
      addItem(item.description, item.quantity, item.rate)
    );
    updateTotal();
    setDocTypeDisplay();
  }
}

// ✅ Start
addItem();
setDocTypeDisplay();
