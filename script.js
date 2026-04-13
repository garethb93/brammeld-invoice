import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, query, limit } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

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

// --- Auth Handling ---
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
    if (window.lucide) lucide.createIcons();
}

// --- Toggle Logic ---
window.setDocType = (type) => {
    currentDocType = type;
    document.getElementById('doc-title').innerText = type;
    document.getElementById('toggle-quote').className = type === 'QUOTE' ? 'px-6 py-2 rounded-lg text-sm font-bold bg-white shadow-md' : 'px-6 py-2 rounded-lg text-sm font-bold text-slate-500';
    document.getElementById('toggle-invoice').className = type === 'INVOICE' ? 'px-6 py-2 rounded-lg text-sm font-bold bg-white shadow-md' : 'px-6 py-2 rounded-lg text-sm font-bold text-slate-500';
};

// --- Table Logic ---
window.addLineItem = (desc = '', rate = '0', qty = '1') => {
    const tbody = document.getElementById('line-items');
    const row = document.createElement('tr');
    row.className = "cost-row group";
    row.innerHTML = `
        <td class="p-2 cost-cell"><textarea class="w-full p-2 bg-transparent outline-none resize-none item-desc" rows="1">${desc}</textarea></td>
        <td class="p-2 cost-cell"><input type="number" class="w-full p-2 bg-transparent outline-none item-cost" value="${rate}" oninput="calculateTotals()"></td>
        <td class="p-2 cost-cell"><input type="number" class="w-full p-2 bg-transparent outline-none text-center item-qty" value="${qty}" oninput="calculateTotals()"></td>
        <td class="p-2 cost-cell font-black text-right line-total text-slate-700">£0.00</td>
        <td class="p-2 no-print text-center"><button onclick="this.closest('tr').remove(); calculateTotals();" class="text-slate-300 hover:text-red-500 transition">×</button></td>
    `;
    tbody.appendChild(row);
    calculateTotals();
};

window.calculateTotals = () => {
    let sub = 0;
    document.querySelectorAll('.cost-row').forEach(row => {
        const r = parseFloat(row.querySelector('.item-cost').value) || 0;
        const q = parseFloat(row.querySelector('.item-qty').value) || 0;
        const line = r * q;
        row.querySelector('.line-total').innerText = `£${line.toFixed(2)}`;
        sub += line;
    });
    document.getElementById('subtotal').innerText = `£${sub.toFixed(2)}`;
    document.getElementById('grand-total').innerText = `£${sub.toFixed(2)}`;
};

// --- History & Load Logic ---
window.loadDocumentIntoForm = (data) => {
    setDocType(data.type || 'QUOTE');
    document.getElementById('cust-name').value = data.customerName || '';
    document.getElementById('cust-address').value = data.customerAddress || '';
    document.getElementById('doc-date').value = data.date || '';
    document.getElementById('job-desc').value = data.jobDescription || '';
    
    const tbody = document.getElementById('line-items');
    tbody.innerHTML = '';
    if (data.items && Array.isArray(data.items)) {
        data.items.forEach(item => addLineItem(item.description, item.rate, item.quantity));
    } else { addLineItem(); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

async function loadHistory() {
    try {
        const snap = await getDocs(collection(db, "quotes"));
        const tbody = document.getElementById('history-list');
        tbody.innerHTML = '';
        
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                         .sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));

        docs.forEach(d => {
            const tr = document.createElement('tr');
            tr.className = "hover:bg-orange-50 cursor-pointer transition-colors group";
            tr.innerHTML = `
                <td class="p-4 text-slate-500 font-medium">${d.date || '---'}</td>
                <td class="p-4 font-bold text-slate-800">${d.customerName || 'No Name'}</td>
                <td class="p-4 text-xs font-black uppercase text-slate-400 group-hover:text-orange-600">${d.type || 'QUOTE'}</td>
                <td class="p-4 text-right font-black text-slate-700 italic">£${d.total || '0.00'}</td>
            `;
            tr.onclick = () => loadDocumentIntoForm(d);
            tbody.appendChild(tr);
        });
    } catch (e) { console.error("History fail:", e); }
}

// --- Customer Logic ---
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
            d.className = "p-3 hover:bg-orange-50 cursor-pointer border-b text-sm font-bold";
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

// --- Cloud Save ---
window.saveToCloud = async () => {
    const name = document.getElementById('cust-name').value;
    const addr = document.getElementById('cust-address').value;
    if(!name) return alert("Enter a Customer Name first.");

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
            customerAddress: addr,
            date: document.getElementById('doc-date').value,
            jobDescription: document.getElementById('job-desc').value,
            type: currentDocType,
            total: document.getElementById('grand-total').innerText.replace('£', ''),
            items: items,
            createdAt: serverTimestamp()
        });

        if (!customersList.some(c => c.customerName === name)) {
            await addDoc(collection(db, "customers"), { customerName: name, customerAddress: addr });
        }
        alert("Synced to Cloud History!");
        loadHistory();
        loadCustomers();
    } catch (e) { alert("Save failed: " + e.message); }
};

// --- PDF Rule Implementation ---
window.downloadPDF = async () => {
    const element = document.getElementById('document-to-print');
    
    // Rule B: Hide empty rows
    document.querySelectorAll('.cost-row').forEach(row => {
        if (!row.querySelector('.item-desc').value.trim()) row.classList.add('hidden-row');
    });

    // Rule C: Force Layout
    element.classList.add('pdf-table-mode', 'pdf-single-page');

    const opt = {
        margin: [0, 0],
        filename: `${currentDocType}_${document.getElementById('cust-name').value || 'Export'}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } finally {
        element.classList.remove('pdf-table-mode', 'pdf-single-page');
        document.querySelectorAll('.hidden-row').forEach(r => r.classList.remove('hidden-row'));
    }
};
