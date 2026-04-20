import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
let currentInvoiceID = "";

function generateID() {
    const random = Math.floor(1000 + Math.random() * 9000);
    currentInvoiceID = `BRAM-${random}`;
    document.getElementById("invoiceIDDisplay").innerText = `#${currentInvoiceID}`;
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");
    document.getElementById("invoiceDate").valueAsDate = new Date();
    generateID();
    loadQuotes();
  }
});

document.getElementById("loginBtn").onclick = async () => {
  try {
    await signInWithEmailAndPassword(auth, document.getElementById("email").value, document.getElementById("password").value);
  } catch (e) { alert("Login Error"); }
};

document.getElementById("logoutBtn").onclick = () => signOut(auth);

window.addItem = function(desc="", qty=1, rate=0) {
  const row = document.createElement("div");
  row.className = "grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-xl border border-transparent mb-1";
  row.innerHTML = `
    <div class="col-span-8"><input class="w-full bg-transparent p-1 font-bold outline-none desc-in" value="${desc}" placeholder="Description"></div>
    <div class="col-span-1 text-center"><input type="number" class="w-full bg-transparent p-1 text-center font-bold outline-none qty-in" value="${qty}"></div>
    <div class="col-span-2 text-right"><input type="number" class="w-full bg-transparent p-1 text-right font-bold outline-none rate-in" value="${rate}"></div>
    <div class="col-span-1 text-right no-print"><button class="text-red-500 font-bold delete-btn no-print" type="button">×</button></div>
  `;
  document.getElementById("lineItems").appendChild(row);
  row.querySelector("button").onclick = () => { row.remove(); updateTotal(); };
  row.querySelectorAll("input").forEach(i => i.oninput = updateTotal);
  updateTotal();
};

function updateTotal() {
  let total = 0;
  const rows = document.getElementById("lineItems").children;
  for (let row of rows) {
    const q = row.querySelector(".qty-in").value || 0;
    const r = row.querySelector(".rate-in").value || 0;
    total += (parseFloat(q) * parseFloat(r));
  }
  document.getElementById("totalAmount").innerText = total.toFixed(2);
}

window.generatePDF = function() {
  const type = document.getElementById("docType").value;
  document.getElementById("printDocType").innerText = type.toUpperCase();
  document.getElementById("printDate").innerText = document.getElementById("invoiceDate").value;
  document.getElementById("printCustomerName").innerText = document.getElementById("customerName").value;
  document.getElementById("printCustomerAddress").innerText = document.getElementById("customerAddress").value;
  document.getElementById("printJobDescription").innerText = document.getElementById("jobDescription").value;
  document.getElementById("printNotes").innerText = document.getElementById("notes").value;
  
  document.getElementById("paymentTerms").innerText = (type === "Invoice") ? "PAYMENT DUE WITHIN 30 DAYS" : "";
  document.getElementById("paymentDetails").style.display = (type === "Invoice") ? "block" : "none";

  window.print();
};

window.saveQuote = async function () {
  const name = document.getElementById("customerName").value;
  if (!name) return alert("Missing Customer Name");
  
  const items = [...document.getElementById("lineItems").children].map(row => ({
    desc: row.querySelector(".desc-in").value,
    qty: row.querySelector(".qty-in").value,
    rate: row.querySelector(".rate-in").value
  }));

  const data = {
    userId: currentUserId,
    customerName: name,
    invoiceID: currentInvoiceID,
    customerAddress: document.getElementById("customerAddress").value,
    jobDescription: document.getElementById("jobDescription").value,
    total: document.getElementById("totalAmount").innerText,
    items: items,
    type: document.getElementById("docType").value,
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "quotes"), data);
    alert("Record Cloud Saved");
    loadQuotes();
  } catch(e) { alert("Save Failed"); }
};

async function loadQuotes() {
  const container = document.getElementById("savedQuotes");
  if (!container) return;
  container.innerHTML = "";
  
  try {
    const q = query(collection(db, "quotes"), where("userId","==",currentUserId), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    snap.forEach(docSnap => {
      const d = docSnap.data();
      const btn = document.createElement("button");
      btn.className = "text-left p-4 bg-white border rounded-xl hover:border-orange-500 shadow-sm flex justify-between items-center";
      btn.innerHTML = `<div><p class="text-[10px] font-black brand-orange uppercase">${d.invoiceID || 'Record'}</p><p class="font-black">${d.customerName}</p></div><p class="font-black">£${d.total}</p>`;
      
      btn.onclick = () => {
          document.getElementById("customerName").value = d.customerName || "";
          document.getElementById("customerAddress").value = d.customerAddress || "";
          document.getElementById("jobDescription").value = d.jobDescription || "";
          document.getElementById("docType").value = d.type || "Quote";
          currentInvoiceID = d.invoiceID || "N/A";
          document.getElementById("invoiceIDDisplay").innerText = `#${currentInvoiceID}`;
          document.getElementById("lineItems").innerHTML = "";
          if(d.items) {
            d.items.forEach(i => addItem(i.desc, i.qty, i.rate));
          } else {
            addItem();
          }
      };
      container.appendChild(btn);
    });
  } catch (e) {
    console.error("Error loading quotes: ", e);
  }
}

addItem();
