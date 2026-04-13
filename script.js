import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc, query, where } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

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

let currentDocType = 'QUOTE';
let currentUser = null;

window.handleLogin = async () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    try { await signInWithEmailAndPassword(auth, e, p); } 
    catch (err) { document.getElementById('auth-error').classList.remove('hidden'); }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-overlay').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        initApp();
    }
});

function initApp() {
    document.getElementById('doc-date').valueAsDate = new Date();
    addLineItem();
}

window.setDocType = (type) => {
    currentDocType = type;
    document.getElementById('doc-title').innerText = type;
    document.getElementById('toggle-quote').className = type === 'QUOTE' ? 'px-5 py-1.5 rounded-md text-sm font-bold bg-white shadow-sm' : 'px-5 py-1.5 rounded-md text-sm font-bold';
    document.getElementById('toggle-invoice').className = type === 'INVOICE' ? 'px-5 py-1.5 rounded-md text-sm font-bold bg-white shadow-sm' : 'px-5 py-1.5 rounded-md text-sm font-bold';
};

window.addLineItem = (desc = '', rate = '0', qty = '1') => {
    const tbody = document.getElementById('line-items');
    const row = document.createElement('tr');
    row.className = "cost-row border-b border-slate-50";
    row.innerHTML = `
        <td class="p-3"><textarea class="w-full bg-transparent outline-none item-desc resize-none" rows="1">${desc}</textarea></td>
        <td class="p-3"><input type="number" class="w-full bg-transparent outline-none item-cost" value="${rate}" oninput="calculateTotals()"></td>
        <td class="p-3"><input type="number" class="w-full bg-transparent outline-none text-center item-qty" value="${qty}" oninput="calculateTotals()"></td>
        <td class="p-3 font-black text-right line-total text-slate-700">£0.00</td>
        <td class="p-3 no-print text-center action-cell"><button onclick="this.closest('tr').remove(); calculateTotals();" class="text-red-400 font-black">×</button></td>
    `;
    tbody.appendChild(row);
    calculateTotals();
};

window.calculateTotals = () => {
    let sub = 0;
    document.querySelectorAll('.cost-row').forEach(row => {
        const r = parseFloat(row.querySelector('.item-cost').value) || 0;
        const q = parseFloat(row.querySelector('.item-qty').value) || 0;
        row.querySelector('.line-total').innerText = `£${(r * q).toFixed(2)}`;
        sub += (r * q);
    });
    document.getElementById('grand-total').innerText = `£${sub.toFixed(2)}`;
};

window.saveToCloud = async () => {
    const items = Array.from(document.querySelectorAll('.cost-row')).map(row => ({
        description: row.querySelector('.item-desc').value,
        rate: row.querySelector('.item-cost').value,
        quantity: row.querySelector('.item-qty').value
    }));

    try {
        await addDoc(collection(db, "quotes"), {
            userId: currentUser.uid,
            customerName: document.getElementById('cust-name').value,
            customerAddress: document.getElementById('cust-address').value,
            date: document.getElementById('doc-date').value,
            jobDescription: document.getElementById('job-desc').value,
            type: currentDocType,
            total: document.getElementById('grand-total').innerText.replace('£', ''),
            items: items,
            createdAt: serverTimestamp()
        });
        alert("Document Saved to Cloud");
    } catch (e) { alert("Save Error: " + e.message); }
};

// PDF FIX: Removes UI strictly and forces single-page layout width
window.downloadPDF = async () => {
    const element = document.getElementById('document-to-print');
    const toggle = document.getElementById('toggle-container');
    const actionCells = document.querySelectorAll('.action-cell');
    const actionHeader = document.getElementById('th-action');
    
    // Hide UI elements
    toggle.style.display = 'none';
    actionHeader.style.display = 'none';
    actionCells.forEach(c => c.style.display = 'none');
    
    element.classList.add('pdf-export-mode');

    const opt = {
        margin: [10, 10],
        filename: `${currentDocType}_${document.getElementById('cust-name').value || 'Doc'}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
            scale: 3, 
            useCORS: true,
            windowWidth: 800 // Forces the layout to be consistent
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } finally {
        // Restore UI
        toggle.style.display = 'flex';
        actionHeader.style.display = 'table-cell';
        actionCells.forEach(c => c.style.display = 'table-cell');
        element.classList.remove('pdf-export-mode');
    }
};
