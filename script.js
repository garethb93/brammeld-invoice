import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, doc, getDoc, setDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyDFNBKaTviJNHp95gKqKgphwp3LHu9NCfs",
  authDomain: "brammeld-invoice.firebaseapp.com",
  projectId: "brammeld-invoice",
  storageBucket: "brammeld-invoice.firebasestorage.app",
  messagingSenderId: "380302735360",
  appId: "1:380302735360:web:f4efd9e4fd330a038640e5"
};

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let itemIndex = 0;
let currentNumber = null;
let editingId = null;
let currentUserId = null;

// UI elements
const loginSection = document.getElementById("loginSection");
const appSection = document.getElementById("appSection");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const quotesUl = document.getElementById("quotesUl");
const saveQuoteBtn = document.getElementById("saveQuoteBtn");

loginBtn.addEventListener("click", login);
logoutBtn.addEventListener("click", () => signOut(auth));
saveQuoteBtn.addEventListener("click", saveQuote);

// Firebase Auth
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (err) {
    alert("Login failed: " + err.message);
  }
}

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

// Firebase Quotes
async function loadQuotes() {
  quotesUl.innerHTML = "";
  const q = query(collection(db, "quotes"), where("userId", "==", currentUserId));
  const querySnapshot = await getDocs(q);
  querySnapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const li = document.createElement("li");
    li.className = "flex justify-between items-center p-1 border-b";
    li.innerHTML = `
      <span>${data.number} - ${data.customerName}</span>
      <button class="text-blue-600 text-sm" onclick="openQuote('${docSnap.id}')">Open</button>
    `;
    quotesUl.appendChild(li);
  });
}

window.openQuote = async function (id) {
  const docRef = doc(db, "quotes", id);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const data = docSnap.data();
    editingId = id;
    fillForm(data);
  }
};

async function saveQuote() {
  const data = getFormData();
  data.userId = currentUserId;
  if (editingId) {
    await setDoc(doc(db, "quotes", editingId), data);
  } else {
    await addDoc(collection(db, "quotes"), data);
  }
  editingId = null;
  loadQuotes();
  alert("Quote saved!");
}

function getFormData() {
  const items = [];
  for (let i = 0; i < itemIndex; i++) {
    const desc = document.getElementById(`desc-${i}`)?.value;
    const qty = document.getElementById(`qty-${i}`)?.value;
    const rate = document.getElementById(`rate-${i}`)?.value;
    if (desc) {
      items.push({ desc, qty, rate });
    }
  }
  return {
    number: currentNumber || formatNumber(document.getElementById("invoiceDate").value),
    type: document.getElementById("docType").value,
    date: document.getElementById("invoiceDate").value,
    customerName: document.getElementById("customerName").value,
    customerAddress: document.getElementById("customerAddress").value,
    jobDetails: document.getElementById("jobDetails").value,
    notes: document.getElementById("notes").value,
    items,
    total: document.getElementById("totalAmount").innerText
  };
}

function fillForm(data) {
  document.getElementById("docType").value = data.type;
  document.getElementById("invoiceDate").value = data.date;
  document.getElementById("customerName").value = data.customerName;
  document.getElementById("customerAddress").value = data.customerAddress;
  document.getElementById("jobDetails").value = data.jobDetails;
  document.getElementById("notes").value = data.notes;

  document.getElementById("lineItems").innerHTML = "";
  itemIndex = 0;
  data.items.forEach((item) => {
    addItem(item.desc, item.qty, item.rate);
  });
  document.getElementById("totalAmount").innerText = data.total;
}

function addItem(desc = "", qty = 1, rate = 0) {
  const container = document.getElementById("lineItems");
  const row = document.createElement("div");
  row.className = "flex gap-2";

  row.innerHTML = `
    <input type="text" placeholder="Description" class="flex-1 border p-2 rounded" id="desc-${itemIndex}" value="${desc}">
    <input type="number" placeholder="Qty" class="w-20 border p-2 rounded" id="qty-${itemIndex}" value="${qty}">
    <input type="number" placeholder="Rate" class="w-24 border p-2 rounded" id="rate-${itemIndex}" value="${rate}">
    <button onclick="removeItem(this)" class="text-red-500 font-bold">X</button>
  `;
  container.appendChild(row);
  itemIndex++;
  updateTotal();
}

window.removeItem = function (button) {
  button.parentElement.remove();
  updateTotal();
};

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

function formatNumber(dateStr) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yy = String(date.getFullYear()).slice(2);
  const random = Math.floor(Math.random() * 90 + 10);
  return `${dd}${mm}${yy}-${random}`;
}

function setDocTypeDisplay() {
  const docType = document.getElementById("docType").value;
  const numberText = currentNumber ? ` #${currentNumber}` : "";
  document.getElementById("docTypeDisplay").innerText =
    (docType === "invoice" ? "Invoice" : "Quote") + numberText;
  document.getElementById("paymentDetails").classList.toggle("hidden", docType !== "invoice");
}

window.generatePDF = function () {
  const docType = document.getElementById("docType").value;
  const customerName = document.getElementById("customerName").value.trim();
  const dateValue = document.getElementById("invoiceDate").value;

  currentNumber = formatNumber(dateValue);

  document.getElementById("printCustomerName").innerText = customerName;
  document.getElementById("printCustomerAddress").innerText = document.getElementById("customerAddress").value.trim();
  document.getElementById("printDate").innerText = dateValue;
  document.getElementById("printJobDetails").innerText = document.getElementById("jobDetails").value.trim();
  updateTotal();
  setDocTypeDisplay();

  const filename = `${docType === "invoice" ? "Invoice" : "Quote"}-${currentNumber}-${customerName || "Customer"}.pdf`;

  setTimeout(() => {
    document.title = filename;
    window.print();
    document.title = "Brammeld Contracts - Invoice Builder";
  }, 200);
};

// init
addItem();
