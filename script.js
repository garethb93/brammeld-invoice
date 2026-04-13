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

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const quotesUl = document.getElementById("savedQuotes");
const lineItems = document.getElementById("lineItems");

// AUTH
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    document.getElementById("loginSection").classList.add("hidden");
    document.getElementById("appSection").classList.remove("hidden");
    loadQuotes();
  }
});

loginBtn.onclick = async () => {
  await signInWithEmailAndPassword(auth,
    document.getElementById("email").value,
    document.getElementById("password").value
  );
};

logoutBtn.onclick = () => signOut(auth);

// ITEMS
window.addItem = function(desc="", qty=1, rate=0) {
  const row = document.createElement("div");
  row.innerHTML = `
    <input value="${desc}">
    <input type="number" value="${qty}">
    <input type="number" value="${rate}">
    <button>X</button>
  `;

  lineItems.appendChild(row);

  row.querySelector("button").onclick = () => {
    row.remove();
    updateTotal();
  };

  row.querySelectorAll("input").forEach(i =>
    i.oninput = updateTotal
  );

  updateTotal();
};

function updateTotal() {
  let total = 0;
  [...lineItems.children].forEach(row => {
    const [d,q,r] = row.querySelectorAll("input");
    total += (q.value * r.value);
  });
  document.getElementById("totalAmount").innerText = total.toFixed(2);
}

// PDF
window.generatePDF = function() {
  const type = document.getElementById("docType").value;

  document.getElementById("printDocType").innerText = type;

  if (type === "Invoice") {
    document.getElementById("paymentTerms").innerText = "Payment due within 30 days";
    document.getElementById("paymentDetails").style.display = "block";
  } else {
    document.getElementById("paymentTerms").innerText = "";
    document.getElementById("paymentDetails").style.display = "none";
  }

  window.print();
};

// SAVE
window.saveQuote = async function () {
  const data = {
    userId: currentUserId,
    customerName: document.getElementById("customerName").value
  };

  await addDoc(collection(db, "quotes"), data);
  alert("Saved");
  loadQuotes();
};

// LOAD
async function loadQuotes() {
  quotesUl.innerHTML = "";
  const q = query(collection(db, "quotes"), where("userId","==",currentUserId));
  const snap = await getDocs(q);

  snap.forEach(docSnap => {
    const li = document.createElement("li");
    li.innerText = docSnap.data().customerName;
    quotesUl.appendChild(li);
  });
}

// INIT
addItem();
