import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

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
let customersList = [];

// --- Auth ---
window.handleLogin = async () => {
    const e = document.getElementById('email').value;
    const p = document.getElementById('password').value;
    try { await signInWithEmailAndPassword(auth, e, p); } 
    catch (err) { document.getElementById('auth-error').classList.remove('hidden'); }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-overlay').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        initApp();
    }
});

function initApp() {
    document.getElementById('doc-date').valueAsDate = new Date();
    loadCustomers();
    loadHistory();
    addLineItem();
    setupCustomerSearch();
}

// --- Logic ---
window.setDocType = (type) => {
    currentDocType = type;
    document.getElementById('doc-title').innerText = type;
    document.getElementById('toggle-quote').className = type === 'QUOTE' ? 'px-4 py-1 rounded-md text-sm font-bold bg-white shadow-sm' : 'px-4 py-1 rounded-md text-sm font-bold';
    document.getElementById('toggle-invoice').className = type === 'INVOICE' ? 'px-4 py-1 rounded-md text-sm font-bold bg-white shadow-sm' : 'px-4 py-1 rounded-md text-sm font-bold';
};

window.addLineItem = (desc = '', rate = '0', qty = '1') => {
    const tbody = document.getElementById('line-items');
    const row = document.createElement('tr');
    row.className = "cost-row border-b border-slate-50";
    row.innerHTML = `
        <td class="p-2"><textarea class="w-full bg-transparent outline-none item-desc" rows="1">${desc}</textarea></td>
        <td class="p-2"><input type="number" class="w-full bg-transparent outline-none item-cost" value="${rate}" oninput="calculateTotals()"></td>
        <td class="p-2"><input type="number" class="w-full bg-transparent outline-none text-center item-qty" value="${qty}" oninput="calculateTotals()"></td>
        <td class="p-2 font-bold text-right line-total text-slate-700">£0.00</td>
        <td class="p-2 no-print text-center"><button onclick="this.closest('tr').remove(); calculateTotals();" class="text-red-400 font-black px-2">×</button></td>
    `;
    tbody.appendChild(row);
    calculateTotals();
};

window.calculateTotals = () => {
    let total = 0;
    document.querySelectorAll('.cost-row').forEach(row => {
        const r = parseFloat(row.querySelector('.item-cost').value) || 0;
        const q = parseFloat(row.querySelector('.item-qty').value) || 0;
        const line = r * q;
        row.querySelector('.line-total').innerText = `£${line.toFixed(2)}`;
        total += line;
    });
    document.getElementById('grand-total').innerText = `£${total.toFixed(2)}`;
};

// --- History & Delete ---
window.deleteQuote = async (id, event) => {
    event.stopPropagation(); 
    // Manual confirmation alert
    const confirmed = window.confirm("ARE YOU SURE?\nThis will permanently delete this record from the database.");
    
    if (confirmed) {
        try {
            await deleteDoc(doc(db, "quotes", id));
            loadHistory();
        } catch (e) { alert("Delete failed: " + e.message); }
    }
};

window.loadDocumentIntoForm = (data) => {
    setDocType(data.type?.toUpperCase() || 'QUOTE');
    document.getElementById('cust-name').value = data.customerName || '';
    document.getElementById('cust-address').value = data.customerAddress || '';
    document.getElementById('doc-date').value = data.date || '';
    document.getElementById('job-desc').value = data.jobDescription || '';
    document.getElementById('line-items').innerHTML = '';
    if (data.items) data.items.forEach(i => addLineItem(i.description, i.rate, i.quantity));
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

async function loadHistory() {
    try {
        const snap = await getDocs(collection(db, "quotes"));
        const tbody = document.getElementById('history-list');
        tbody.innerHTML = '';
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
                         .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        docs.forEach(d => {
            const tr = document.createElement('tr');
            tr.className = "active:bg-slate-100 transition-colors";
            tr.onclick = () => loadDocumentIntoForm(d);
            tr.innerHTML = `
                <td class="p-3 text-slate-500 text-xs">${d.date || '---'}</td>
                <td class="p-3 font-bold text-slate-800">${d.customerName || 'No Name'}</td>
                <td class="p-3 text-right font-black text-slate-600">£${d.total || '0.00'}</td>
                <td class="p-3 text-center">
                    <button onclick="deleteQuote('${d.id}', event)" class="delete-tap-area text-red-600 mx-auto">
                        <i data-lucide="trash-2" class="w-5 h-5"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
        if (window.lucide) lucide.createIcons();
    } catch (e) { console.error(e); }
}

// --- Save & Search ---
window.saveToCloud = async () => {
    const name = document.getElementById('cust-name').value;
    if(!name) return alert("Enter Customer Name");
    const items = [];
    document.querySelectorAll('.cost-row').forEach(row => {
        items.push({
            description: row.querySelector('.item-desc').value,
            rate: row.querySelector('.item-cost').value,
            quantity: row.querySelector('.item-qty').value
        });
    });

    try {
        await addDoc(collection(db, "quotes"), {
            customerName: name,
            customerAddress: document.getElementById('cust-address').value,
            date: document.getElementById('doc-date').value,
            jobDescription: document.getElementById('job-desc').value,
            type: currentDocType,
            total: document.getElementById('grand-total').innerText.replace('£', ''),
            items: items,
            createdAt: serverTimestamp()
        });
        alert("Document Saved Successfully");
        loadHistory();
    } catch (e) { alert("Error saving: " + e.message); }
};

async function loadCustomers() {
    const snap = await getDocs(collection(db, "customers"));
    customersList = snap.docs.map(doc => doc.data());
}

function setupCustomerSearch() {
    const input = document.getElementById('cust-name');
    const tray = document.getElementById('suggestions');
    input.addEventListener('input', () => {
        const val = input.value.toLowerCase();
        tray.innerHTML = '';
        if (val.length < 2) { tray.classList.add('hidden'); return; }
        const matches = customersList.filter(c => c.customerName?.toLowerCase().includes(val));
        matches.forEach(m => {
            const d = document.createElement('div');
            d.className = "p-3 hover:bg-orange-50 border-b text-sm font-bold";
            d.innerText = m.customerName;
            d.onclick = () => { 
                input.value = m.customerName; 
                document.getElementById('cust-address').value = m.customerAddress; 
                tray.classList.add('hidden'); 
            };
            tray.appendChild(d);
        });
        tray.classList.toggle('hidden', matches.length === 0);
    });
}

window.downloadPDF = async () => {
    const element = document.getElementById('document-to-print');
    element.classList.add('pdf-table-mode', 'pdf-single-page');
    const opt = {
        margin: 0,
        filename: `${currentDocType}_${document.getElementById('cust-name').value}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    try { await html2pdf().set(opt).from(element).save(); } 
    finally { element.classList.remove('pdf-table-mode', 'pdf-single-page'); }
};
