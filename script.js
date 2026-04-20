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
const quotesUl = document.getElementById("savedQuotes");
const lineItemsContainer = document.getElementById("lineItems");

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
  } catch (e) { alert("Login failed"); }
};

document.getElementById("logoutBtn").onclick = () => signOut(auth);

window.addItem = function(desc="", qty=1, rate=0) {
  const row = document.createElement("div");
  row.className = "grid grid-cols-12 gap-2 items-center bg-gray-50 p-2 rounded-xl border border-transparent hover:border-orange-200 transition mb-2";
  row.innerHTML = `
    <div class="col-span-7"><input class="w-full bg-transparent p-2 font-bold outline-none desc-in" value="${desc}" placeholder="Description"></div>
    <div class="col-span-2"><input type="number" class="w-full bg-transparent p-2 text-center font-bold outline-none qty-in" value="${qty}"></div>
    <div class="col-span-2"><input type="number" class="w-full bg-transparent p-2 text-right font-bold outline-none rate-in" value="${rate}"></div>
    <div class="col-span-1 text-right"><button class="text-red-400 font-bold hover:text-red-600">×</button></div>
  `;
  lineItemsContainer.appendChild(row);
  row.querySelector("button").onclick = () => { row.remove(); updateTotal(); };
  row.querySelectorAll("input").forEach(i => i.oninput = updateTotal);
  updateTotal();
};

function updateTotal() {
  let total = 0;
  [...lineItemsContainer.children].forEach(row => {
    const q = row.querySelector(".qty-in").value;
    const r = row.querySelector(".rate-in").value;
    total += (parseFloat(q) * parseFloat(r));
  });
  document.getElementById("totalAmount").innerText = total.toFixed(2);
}

window.generatePDF = function() {
  const type = document.getElementById("docType").value;
  // Sync screen inputs to print fields
  document.getElementById("printDocType").innerText = type.toUpperCase();
  document.getElementById("printDate").innerText = document.getElementById("invoiceDate").value;
  document.getElementById("printCustomerName").innerText = document.getElementById("customerName").value;
  document.getElementById("printCustomerAddress").innerText = document.getElementById("customerAddress").value;
  document.getElementById("printJobDescription").innerText = document.getElementById("jobDescription").value;
  document.getElementById("printNotes").innerText = document.getElementById("notes").value;
  
  if (type === "Invoice") {
    document.getElementById("paymentTerms").innerText = "PAYMENT DUE WITHIN 30 DAYS";
    document.getElementById("paymentDetails").style.display = "block";
  } else {
    document.getElementById("paymentTerms").innerText = "";
    document.getElementById("paymentDetails").style.display = "none";
  }

  window.print();
};

window.saveQuote = async function () {
  const name = document.getElementById("customerName").value;
  if (!name) return alert("Enter Customer Name");
  
  const items = [...lineItemsContainer.children].map(row => ({
    desc: row.querySelector(".desc-in").value,
    qty: row.querySelector(".qty-in").value,
    rate: row.querySelector(".rate-in").value
  }));

  const data = {
    userId: currentUserId,
    customerName: name,
    customerAddress: document.getElementById("customerAddress").value,
    jobDescription: document.getElementById("jobDescription").value,
    total: document.getElementById("totalAmount").innerText,
    items: items,
    type: document.getElementById("docType").value,
    createdAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, "quotes"), data);
    alert("Record Saved to Cloud");
    loadQuotes();
  } catch(e) { alert("Error saving"); }
};

async function loadQuotes() {
  quotesUl.innerHTML = "";
  const q = query(collection(db, "quotes"), where("userId","==",currentUserId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const d = docSnap.data();
    const btn = document.createElement("button");
    btn.className = "text-left p-4 bg-white border rounded-xl hover:border-orange-500 transition shadow-sm flex justify-between items-center";
    btn.innerHTML = `
        <div>
            <p class="text-[10px] font-black text-gray-400 uppercase">${d.type || 'Quote'}</p>
            <p class="font-black">${d.customerName}</p>
        </div>
        <p class="brand-orange font-black">£${d.total}</p>
    `;
    btn.onclick = () => {
        document.getElementById("customerName").value = d.customerName;
        document.getElementById("customerAddress").value = d.customerAddress;
        document.getElementById("jobDescription").value = d.jobDescription;
        document.getElementById("docType").value = d.type || "Quote";
        lineItemsContainer.innerHTML = "";
        d.items.forEach(i => addItem(i.desc, i.qty, i.rate));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    quotesUl.appendChild(btn);
  });
}

addItem();
