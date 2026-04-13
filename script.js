import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, deleteDoc, query, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCz...",
  authDomain: "brammeld-invoice-a804f.firebaseapp.com",
  projectId: "brammeld-invoice-a804f"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserId = null;

const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid;
    loginSection.classList.add("hidden");
    appSection.classList.remove("hidden");
    loadQuotes();
  } else {
    loginSection.classList.remove("hidden");
    appSection.classList.add("hidden");
  }
});

loginBtn.onclick = async () => {
  await signInWithEmailAndPassword(auth, email.value, password.value);
};

logoutBtn.onclick = () => signOut(auth);

// ADD ITEM
window.addItem = function(desc="", qty=1, rate=0){
  const row = document.createElement("div");
  row.className = "flex gap-2 mt-2";

  row.innerHTML = `
    <input value="${desc}" class="border p-2 flex-1">
    <input type="number" value="${qty}" class="border p-2 w-20">
    <input type="number" value="${rate}" class="border p-2 w-24">
    <button>X</button>
  `;

  row.querySelector("button").onclick = () => {
    row.remove();
    updateTotal();
  };

  row.querySelectorAll("input").forEach(i => i.oninput = updateTotal);

  lineItems.appendChild(row);
  updateTotal();
};

// TOTAL
function updateTotal(){
  let total = 0;

  [...lineItems.children].forEach(row=>{
    const inputs = row.querySelectorAll("input");
    total += (inputs[1].value * inputs[2].value);
  });

  totalAmount.innerText = total.toFixed(2);
}

// PDF
window.generatePDF = function(){
  const type = docType.value;

  printDocType.innerText = type;
  printDate.innerText = invoiceDate.value;

  printCustomerName.innerText = customerName.value;
  printCustomerAddress.innerText = customerAddress.value;
  printJobDescription.innerText = jobDescription.value;
  printNotes.innerText = notes.value;

  if(type==="Invoice"){
    paymentTerms.innerText = "Payment due within 30 days";
    paymentDetails.style.display = "block";
  } else {
    paymentTerms.innerText = "";
    paymentDetails.style.display = "none";
  }

  window.print();
};

// SAVE
window.saveQuote = async function(){
  await addDoc(collection(db,"quotes"),{
    userId: currentUserId,
    customerName: customerName.value
  });
  loadQuotes();
};

// LOAD
async function loadQuotes(){
  savedQuotes.innerHTML="";
  const q=query(collection(db,"quotes"), where("userId","==",currentUserId));
  const snap=await getDocs(q);

  snap.forEach(d=>{
    const li=document.createElement("li");
    li.innerText=d.data().customerName;
    savedQuotes.appendChild(li);
  });
}

// START
addItem();
