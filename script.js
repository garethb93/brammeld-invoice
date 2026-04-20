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

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");
    document.getElementById("invoiceDate").valueAsDate = new Date();
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
    description: row.querySelector(".desc-in").value,
    quantity: row.querySelector(".qty-in").value,
    rate: row.querySelector(".rate-in").value
  }));

  const data = {
    userId: currentUserId,
    customerName: name,
    customerAddress: document.getElementById("customerAddress").value,
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
    alert("Record Cloud Saved");
    loadQuotes();
  } catch(e) { alert("Save Failed"); }
};

window.deleteQuote = async function (id, e) {
  e.stopPropagation(); // Prevents the record from loading when clicking delete
  if (confirm("Are you sure you want to delete this record? This cannot be undone.")) {
    try {
      await deleteDoc(doc(db, "quotes", id));
      loadQuotes();
    } catch (error) {
      alert("Error deleting record");
    }
  }
};

async function loadQuotes() {
  const container = document.getElementById("savedQuotes");
  if (!container) return;
  container.innerHTML = "";
  
  try {
    const q = query(collection(db, "quotes"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);

    snap.forEach(docSnap => {
      const d = docSnap.data();
      const id = docSnap.id;
      const btn = document.createElement("div");
      btn.className = "group relative text-left p-4 bg-white border rounded-xl hover:border-orange-500 shadow-sm flex justify-between items-center cursor-pointer";
      
      btn.innerHTML = `
        <div class="flex-1">
          <p class="text-[10px] font-black brand-orange uppercase">${d.date || 'No Date'}</p>
          <p class="font-black">${d.customerName || 'Unnamed'}</p>
          <p class="text-xs text-gray-400 font-bold uppercase">${d.type || 'Quote'}</p>
        </div>
        <div class="flex items-center gap-4">
          <p class="font-black">£${d.total || '0.00'}</p>
          <button onclick="deleteQuote('${id}', event)" class="bg-gray-100 hover:bg-red-100 text-red-500 p-2 rounded-lg transition-colors no-print">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5 v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
          </button>
        </div>
      `;
      
      btn.onclick = () => {
          document.getElementById("customerName").value = d.customerName || "";
          document.getElementById("customerAddress").value = d.customerAddress || "";
          document.getElementById("jobDescription").value = d.jobDescription || "";
          document.getElementById("notes").value = d.notes || "Thank you for your business.";
          document.getElementById("docType").value = d.type || "Quote";
          document.getElementById("invoiceDate").value = d.date || "";
          
          document.getElementById("lineItems").innerHTML = "";
          if(d.items && Array.isArray(d.items)) {
            d.items.forEach(i => {
                addItem(i.description || "", i.quantity || 1, i.rate || 0);
            });
          } else {
            addItem();
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
      };
      container.appendChild(btn);
    });
  } catch (e) {
    console.error("Error loading quotes: ", e);
  }
}

addItem();
