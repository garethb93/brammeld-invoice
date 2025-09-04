// Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, doc, deleteDoc, query, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCzBuns8nHGN0sNjuTY5RIDZ85aUGx-THA",
  authDomain: "brammeld-invoice-a804f.firebaseapp.com",
  projectId: "brammeld-invoice-a804f",
  storageBucket: "brammeld-invoice-a804f.firebasestorage.app",
  messagingSenderId: "533156932511",
  appId: "1:533156932511:web:8fadd6e0d7a70e32bbabaa"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserId = null;

// DOM Elements
const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const quotesUl = document.getElementById("quotesUl");
const saveQuoteBtn = document.getElementById("saveQuoteBtn");
const lineItems = document.getElementById("lineItems");

loginBtn.addEventListener("click", async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value, passwordInput.value);
  } catch (err) {
    alert("Login failed: " + err.message);
  }
});

logoutBtn.addEventListener("click", () => signOut(auth));
saveQuoteBtn.addEventListener("click", saveQuote);

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

function formatNumber(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(2);
  const random = Math.floor(Math.random() * 90 + 10);
  return `${dd}${mm}${yy}-${random}`;
}

window.setDocTypeDisplay = function () {
  const docType = document.getElementById("docType").value;
  const paymentDetails = document.getElementById("paymentDetails");
  const display = document.getElementById("docTypeDisplay");
  display.innerText = docType.charAt(0).toUpperCase() + docType.slice(1);
  paymentDetails.classList.toggle("hidden", docType !== "invoice");
};

function addItem(desc = "", qty = 1, rate = 0) {
  const row = document.createElement("div");
  row.className = "flex gap-2";
  row.innerHTML = `
    <input type="text" class="flex-1 border p-2 rounded" placeholder="Description" value="${desc}">
    <input type="number" class="w-20 border p-2 rounded" placeholder="Qty" value="${qty}">
    <input type="number" class="w-24 border p-2 rounded" placeholder="Rate" value="${rate}">
    <button onclick="this.parentElement.remove(); updateTotal();" class="text-red-500 font-bold">X</button>
  `;
  lineItems.appendChild(row);
  row.querySelectorAll("input").forEach(input =>
    input.addEventListener("input", updateTotal)
  );
  updateTotal();
}

window.addItem = addItem;

function updateTotal() {
  let total = 0;
  let output = "";
  [...lineItems.children].forEach(row => {
    const [descEl, qtyEl, rateEl] = row.querySelectorAll("input");
    const desc = descEl.value;
    const qty = parseFloat(qtyEl.value) || 0;
    const rate = parseFloat(rateEl.value) || 0;
    const lineTotal = qty * rate;
    total += lineTotal;
    output += `${desc} (x${qty} @ £${rate.toFixed(2)}) = £${lineTotal.toFixed(2)}\n`;
  });
  document.getElementById("totalAmount").innerText = total.toFixed(2);
  document.getElementById("printLineItems").innerText = output.trim();
}

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
    date: document.getElementById("invoiceDate").value,
    customerName: document.getElementById("customerName").value,
    customerAddress: document.getElementById("customerAddress").value,
    jobDetails: document.getElementById("jobDetails").value,
    notes: document.getElementById("notes").value,
    total: document.getElementById("totalAmount").innerText,
    items
  };
}

async function saveQuote() {
  const data = getFormData();
  data.userId = currentUserId;
  await addDoc(collection(db, "quotes"), data);
  alert("Quote saved!");
  loadQuotes();
}

async function loadQuotes() {
  quotesUl.innerHTML = "";
  const q = query(collection(db, "quotes"), where("userId", "==", currentUserId));
  const snapshot = await getDocs(q);
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.className = "flex justify-between items-center p-1 border-b";
    li.innerHTML = `
      <span>${data.customerName}</span>
      <div class="space-x-2">
        <button onclick="openQuote('${docSnap.id}')">Open</button>
        <button onclick="confirmDelete('${docSnap.id}')">Delete</button>
      </div>
    `;
    quotesUl.appendChild(li);
  });
}

window.confirmDelete = async function (id) {
  if (confirm("Delete this quote permanently?")) {
    await deleteDoc(doc(db, "quotes", id));
    loadQuotes();
  }
};

window.openQuote = async function (id) {
  const snap = await getDoc(doc(db, "quotes", id));
  if (snap.exists()) {
    const data = snap.data();
    document.getElementById("docType").value = data.type;
    document.getElementById("invoiceDate").value = data.date;
    document.getElementById("customerName").value = data.customerName;
    document.getElementById("customerAddress").value = data.customerAddress;
    document.getElementById("jobDetails").value = data.jobDetails;
    document.getElementById("notes").value = data.notes || "";
    lineItems.innerHTML = "";
    data.items.forEach(item => addItem(item.description, item.quantity, item.rate));
    updateTotal();
    setDocTypeDisplay();
  }
};

window.generatePDF = () => {
  const docType = document.getElementById("docType").value;
  const customerName = document.getElementById("customerName").value;
  const date = document.getElementById("invoiceDate").value;

  document.getElementById("printCustomerName").innerText = customerName;
  document.getElementById("printCustomerAddress").innerText = document.getElementById("customerAddress").value;
  document.getElementById("printDate").innerText = date;
  document.getElementById("printJobDetails").innerText = document.getElementById("jobDetails").value;
  document.getElementById("printNotes").innerText = document.getElementById("notes").value;
  setDocTypeDisplay();
  updateTotal();

  setTimeout(() => {
    window.print();
  }, 200);
};

// Init
addItem();
