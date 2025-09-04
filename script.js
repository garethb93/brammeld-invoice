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

let itemIndex = 0;
let currentUserId = null;

// ✅ DOM
const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const quotesUl = document.getElementById("savedQuotes");

// ✅ Auth Listener
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
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
});

// ✅ Logout
logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
});

// ✅ Add Item
function addItem(desc = "", qty = 1, rate = 0) {
  const container = document.getElementById("lineItems");
  const row = document.createElement("div");
  row.innerHTML = `
    <input placeholder="Description" value="${desc}">
    <input type="number" value="${qty}" min="1">
    <input type="number" value="${rate}" min="0">
    <button onclick="removeItem(this)">❌</button>
  `;
  container.appendChild(row);
  itemIndex++;
  updateTotal();
}

// ✅ Remove Item
window.removeItem = function (el) {
  el.parentElement.remove();
  updateTotal();
};

// ✅ Update Total
function updateTotal() {
  let total = 0;
  let output = "";
  const container = document.getElementById("lineItems");
  [...container.children].forEach(row => {
    const [descEl, qtyEl, rateEl] = row.querySelectorAll("input");
    const desc = descEl.value;
    const qty = parseFloat(qtyEl.value);
    const rate = parseFloat(rateEl.value);
    const subtotal = qty * rate;
    total += subtotal;
    output += `${desc} (x${qty} @ £${rate.toFixed(2)}) = £${subtotal.toFixed(2)}\n`;
  });
  document.getElementById("printLineItems").innerText = output.trim();
  document.getElementById("totalAmount").innerText = total.toFixed(2);
}

// ✅ Generate Number
function formatNumber(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = String(date.getFullYear()).slice(-2);
  const rand = String(Math.floor(Math.random() * 90 + 10));
  return `${d}${m}${y}-${rand}`;
}

// ✅ Download PDF
window.generatePDF = () => {
  const docType = document.getElementById("docType").value;
  const customerName = document.getElementById("customerName").value.trim();
  const address = document.getElementById("customerAddress").value.trim();
  const job = document.getElementById("jobDescription").value.trim();
  const notes = document.getElementById("notes").value.trim();
  const date = document.getElementById("invoiceDate").value.trim();
  const number = formatNumber(date);

  document.getElementById("printDocType").innerText = `${docType} #${number}`;
  document.getElementById("printDate").innerText = date;
  document.getElementById("printCustomerName").innerText = customerName;
  document.getElementById("printCustomerAddress").innerText = address;
  document.getElementById("printJobDescription").innerText = job;
  document.getElementById("printNotes").innerText = notes;

  document.body.classList.add("print-view");

  setTimeout(() => {
    window.print();
    document.body.classList.remove("print-view");
  }, 200);
};

// ✅ Get Form Data
function getFormData() {
  const items = [];
  const container = document.getElementById("lineItems");
  [...container.children].forEach(row => {
    const [descEl, qtyEl, rateEl] = row.querySelectorAll("input");
    items.push({
      description: descEl.value,
      quantity: qtyEl.value,
      rate: rateEl.value
    });
  });

  return {
    type: document.getElementById("docType").value,
    date: document.getElementById("invoiceDate").value.trim(),
    customerName: document.getElementById("customerName").value.trim(),
    customerAddress: document.getElementById("customerAddress").value.trim(),
    jobDescription: document.getElementById("jobDescription").value.trim(),
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
      <button onclick="confirmOpen('${doc.id}')">${doc.data().customerName || "Untitled"}</button>
      <button onclick="confirmDelete('${doc.id}')">🗑️</button>
    `;
    quotesUl.appendChild(li);
  });
}

// ✅ Confirm Open
window.confirmOpen = function (id) {
  if (confirm("Open this quote? Unsaved changes will be lost.")) openQuote(id);
};

// ✅ Confirm Delete
window.confirmDelete = async function (id) {
  if (confirm("Are you sure you want to delete this quote?")) {
    await deleteDoc(doc(db, "quotes", id));
    loadQuotes();
  }
};

// ✅ Open Saved
async function openQuote(id) {
  const snap = await getDoc(doc(db, "quotes", id));
  if (snap.exists()) {
    const data = snap.data();
    document.getElementById("docType").value = data.type;
    document.getElementById("invoiceDate").value = data.date;
    document.getElementById("customerName").value = data.customerName;
    document.getElementById("customerAddress").value = data.customerAddress;
    document.getElementById("jobDescription").value = data.jobDescription;
    document.getElementById("notes").value = data.notes || "";

    const container = document.getElementById("lineItems");
    container.innerHTML = "";
    data.items.forEach(item => addItem(item.description, item.quantity, item.rate));
    updateTotal();
  }
}

// ✅ Add initial item
addItem();
