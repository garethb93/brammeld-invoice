import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, serverTimestamp, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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
let customerMemory = [];
let currentInvoiceNum = "";

// --- RANDOM INVOICE NUMBER GENERATOR ---
window.generateInvoiceNumber = function() {
    const d = new Date();
    const datePart = `${d.getDate().toString().padStart(2,'0')}${(d.getMonth()+1).toString().padStart(2,'0')}${d.getFullYear().toString().slice(-2)}`;
    const randPart = Math.floor(Math.random() * 90 + 10);
    currentInvoiceNum = `${datePart}-${randPart}`;
    const display = document.getElementById('invoiceIDDisplay');
    if(display) display.innerText = `#${currentInvoiceNum}`;
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");
    document.getElementById("invoiceDate").valueAsDate = new Date();
    loadQuotes();
    generateInvoiceNumber(); 
  } else {
    document.getElementById("loginSection").classList.remove("hidden");
    document.getElementById("appSection").classList.add("hidden");
  }
});

document.getElementById("loginBtn").onclick = async () => {
  const email = document.getElementById("email").value;
  const pass = document.getElementById("password").value;
  try {
    await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) {
    alert("Login Error: " + e.message);
  }
};

document.getElementById("logoutBtn").onclick = () => signOut(auth);

window.showCustomerMemories = (val) => {
    const container = document.getElementById('customer-memories');
    if (val.length < 1) { container.classList.add('hidden'); return; }
    const matches = customerMemory.filter(c => c.name.toLowerCase().includes(val.toLowerCase()));
    if (matches.length > 0) {
        container.innerHTML = matches.map(c => `
            <div class="p-4 bg-white hover:bg-orange-50 cursor-pointer text-sm font-bold border-b border-gray-100 transition" 
                 onclick="window.selectCustomer('${c.name.replace(/'/g, "\\'")}', '${(c.address || "").replace(/\n/g, "\\n").replace(/'/g, "\\")}')">
                ${c.name}
            </div>
        `).join('');
        container.classList.remove('hidden');
    } else { container.classList.add('hidden'); }
};

window.selectCustomer = (name, addr) => {
    document.getElementById('customerName').value = name;
    document.getElementById('customerAddress').value = addr;
    document.getElementById('customer-memories').classList.add('hidden');
};

window.addItem = function(desc="", qty=1, rate=0) {
  const row = document.createElement("div");
  row.className = "grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-xl border border-transparent mb-1";
  row.innerHTML = `
    <div class="col-span-8"><input class="w-full bg-transparent p-1 font-bold outline-none desc-in" value="${desc}" placeholder="Description"></div>
    <div class="col-span-1 text-center"><input type="number" class="w-full bg-transparent p-1 text-center font-bold outline-none qty-in" value="${qty}"></div>
    <div class="col-span-2 text-right"><input type="number" class="w-full bg-transparent p-1 text-right font-bold outline-none rate-in" value="${rate}"></div>
    <div class="col-span-1 text-right no-print"><button class="text-red-500 font-bold" type="button" onclick="this.parentElement.parentElement.remove(); window.updateTotal();">×</button></div>
  `;
  document.getElementById("lineItems").appendChild(row);
  row.querySelectorAll("input").forEach(i => i.oninput = window.updateTotal);
  window.updateTotal();
};

window.updateTotal = function() {
  let total = 0;
  const items = document.getElementById("lineItems").children;
  for (let row of items) {
    const q = row.querySelector(".qty-in").value || 0;
    const r = row.querySelector(".rate-in").value || 0;
    total += (parseFloat(q) * parseFloat(r));
  }
  document.getElementById("totalAmount").innerText = total.toFixed(2);
};

window.generatePDF = function() {
  const type = document.getElementById("docType").value;
  document.getElementById("printDocType").innerText = type.toUpperCase();
  document.getElementById("printDate").innerText = document.getElementById("invoiceDate").value;
  document.getElementById("printCustomerName").innerText = document.getElementById("customerName").value;
  document.getElementById("printCustomerAddress").innerText = document.getElementById("customerAddress").value;
  document.getElementById("printJobDescription").innerText = document.getElementById("jobDescription").value;
  document.getElementById("printNotes").innerText = document.getElementById("notes").value;
  document.getElementById("invoiceIDDisplay").innerText = `#${currentInvoiceNum}`;
  document.getElementById("paymentTerms").innerText = (type === "Invoice") ? "PAYMENT DUE WITHIN 30 DAYS" : "";
  document.getElementById("paymentDetails").style.display = (type === "Invoice") ? "block" : "none";
  window.print();
};

window.saveQuote = async function () {
  const name = document.getElementById("customerName").value;
  if (!name) return alert("Missing Customer Name");
  const items = [...document.getElementById("lineItems").children].map(row => ({
    description: row.querySelector(".desc-in").value,
    quantity: row.querySelector(".qty-in").value,
    rate: row.querySelector(".rate-in").value
  }));
  const data = {
    userId: currentUserId,
    invoiceNumber: currentInvoiceNum,
    customerName: name,
    address: document.getElementById("customerAddress").value,
    jobDescription: document.getElementById("jobDescription").value,
    notes: document.getElementById("notes").value,
    total: document.getElementById("totalAmount").innerText,
    items: items,
    type: document.getElementById("docType").value,
    date: document.getElementById("invoiceDate").value,
    createdAt: serverTimestamp()
  };
  try {
    await addDoc(collection(db, "quotes"), data);
    alert("Record Saved Successfully");
    window.generateInvoiceNumber(); 
    loadQuotes();
  } catch(e) { alert("Save Failed: " + e.message); }
};

window.deleteQuote = async function (id, e) {
  e.stopPropagation(); 
  if (confirm("Are you sure you want to delete this record?")) {
    try { await deleteDoc(doc(db, "quotes", id)); loadQuotes(); } 
    catch (error) { alert("Error deleting record"); }
  }
};

async function loadQuotes() {
  const container = document.getElementById("savedQuotes");
  if (!container) return;
  container.innerHTML = "";
  customerMemory = []; 
  const uniqueNames = new Set();
  try {
    const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      if (d.customerName && !uniqueNames.has(d.customerName)) {
        uniqueNames.add(d.customerName);
        customerMemory.push({ name: d.customerName, address: d.address || "" });
      }
      const btn = document.createElement("div");
      btn.className = "group text-left p-4 bg-white border rounded-xl hover:border-orange-500 shadow-sm flex justify-between items-center cursor-pointer mb-2 transition";
      btn.innerHTML = `
        <div class="flex-1">
          <p class="text-[10px] font-black brand-orange uppercase">${d.invoiceNumber || 'No ID'}</p>
          <p class="font-black text-sm">${d.customerName || 'Unnamed'}</p>
          <p class="text-[10px] text-gray-400 font-bold uppercase">${d.date || ''}</p>
        </div>
        <div class="flex items-center gap-3">
          <p class="font-black text-sm">£${d.total || '0.00'}</p>
          <button onclick="deleteQuote('${id}', event)" class="bg-gray-100 hover:bg-red-500 hover:text-white text-red-500 px-3 py-1 text-[10px] rounded font-black no-print">DELETE</button>
        </div>
      `;
      btn.onclick = () => {
          currentInvoiceNum = d.invoiceNumber || "";
          document.getElementById('invoiceIDDisplay').innerText = `#${currentInvoiceNum}`;
          document.getElementById("customerName").value = d.customerName || "";
          document.getElementById("customerAddress").value = d.address || ""; 
          document.getElementById("jobDescription").value = d.jobDescription || "";
          document.getElementById("notes").value = d.notes || "";
          document.getElementById("docType").value = d.type || "Quote";
          document.getElementById("invoiceDate").value = d.date || "";
          document.getElementById("lineItems").innerHTML = "";
          if(d.items) d.items.forEach(i => addItem(i.description, i.quantity, i.rate));
          else addItem();
          window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      container.appendChild(btn);
    });
  } catch (e) { console.error(e); }
}

addItem();
window.generateInvoiceNumber();
