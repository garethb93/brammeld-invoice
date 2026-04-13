import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

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

// Auth
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
    lucide.createIcons();
}

window.setDocType = (type) => {
    currentDocType = type;
    document.getElementById('doc-title').innerText = type;
    document.getElementById('toggle-quote').className = type === 'QUOTE' ? 'px-4 py-1 rounded-md text-sm font-bold bg-white shadow-sm' : 'px-4 py-1 rounded-md text-sm font-bold';
    document.getElementById('toggle-invoice').className = type === 'INVOICE' ? 'px-4 py-1 rounded-md text-sm font-bold bg-white shadow-sm' : 'px-4 py-1 rounded-md text-sm font-bold';
};

window.addLineItem = () => {
    const tbody = document.getElementById('line-items');
    const row = document.createElement('tr');
    row.className = "cost-row border-b border-gray-100";
    row.innerHTML = `
        <td class="p-2 cost-cell"><textarea class="w-full p-1 outline-none item-desc" rows="1"></textarea></td>
        <td class="p-2 cost-cell"><input type="number" class="w-full p-1 item-cost" value="0" oninput="calculateTotals()"></td>
        <td class="p-2 cost-cell"><input type="number" class="w-full p-1 item-qty" value="1" oninput="calculateTotals()"></td>
        <td class="p-2 cost-cell font-bold line-total">£0.00</td>
        <td class="p-2 no-print"><button onclick="this.closest('tr').remove(); calculateTotals();" class="text-red-400">×</button></td>
    `;
    tbody.appendChild(row);
};

window.calculateTotals = () => {
    let total = 0;
    document.querySelectorAll('.cost-row').forEach(row => {
        const c = parseFloat(row.querySelector('.item-cost').value) || 0;
        const q = parseFloat(row.querySelector('.item-qty').value) || 0;
        const line = c * q;
        row.querySelector('.line-total').innerText = `£${line.toFixed(2)}`;
        total += line;
    });
    document.getElementById('subtotal').innerText = `£${total.toFixed(2)}`;
    document.getElementById('grand-total').innerText = `£${total.toFixed(2)}`;
};

async function loadCustomers() {
    const snap = await getDocs(collection(db, "customers"));
    customersList = snap.docs.map(doc => doc.data());
}

async function loadHistory() {
    // Simple fetch without ordering first to avoid index errors
    const snap = await getDocs(collection(db, "documents"));
    const tbody = document.getElementById('history-list');
    tbody.innerHTML = '';
    
    // Sort locally to ensure it works immediately
    const docs = snap.docs.map(d => d.data()).sort((a,b) => b.createdAt?.seconds - a.createdAt?.seconds);
    
    docs.slice(0, 10).forEach(d => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="p-4">${d.date}</td><td class="p-4 font-bold">${d.customerName}</td><td class="p-4">${d.type}</td><td class="p-4 text-right font-bold text-orange-600">${d.total}</td>`;
        tbody.appendChild(tr);
    });
}

function setupCustomerSearch() {
    const input = document.getElementById('cust-name');
    const tray = document.getElementById('suggestions');
    input.addEventListener('input', () => {
        const val = input.value.toLowerCase();
        tray.innerHTML = '';
        if (val.length < 2) { tray.classList.add('hidden'); return; }
        const matches = customersList.filter(c => c.name.toLowerCase().includes(val));
        matches.forEach(m => {
            const d = document.createElement('div');
            d.className = "p-3 hover:bg-orange-50 cursor-pointer border-b text-sm";
            d.innerText = m.name;
            d.onclick = () => { input.value = m.name; document.getElementById('cust-address').value = m.address; tray.classList.add('hidden'); };
            tray.appendChild(d);
        });
        tray.classList.toggle('hidden', matches.length === 0);
    });
}

window.saveToCloud = async () => {
    const name = document.getElementById('cust-name').value;
    if(!name) return alert("Enter Customer Name");

    try {
        await addDoc(collection(db, "documents"), {
            type: currentDocType,
            customerName: name,
            total: document.getElementById('grand-total').innerText,
            date: document.getElementById('doc-date').value,
            createdAt: serverTimestamp()
        });
        
        if (!customersList.some(c => c.name === name)) {
            await addDoc(collection(db, "customers"), { 
                name, 
                address: document.getElementById('cust-address').value 
            });
        }
        alert("Saved to History!");
        loadHistory();
        loadCustomers();
    } catch (e) { alert("Error saving"); }
};

window.downloadPDF = async () => {
    const element = document.getElementById('document-to-print');
    
    // Formatting: Hide Empty Rows & Force Table Mode
    document.querySelectorAll('.cost-row').forEach(row => {
        if (!row.querySelector('.item-desc').value.trim()) row.classList.add('hidden-row');
    });
    element.classList.add('pdf-table-mode', 'pdf-single-page');

    const opt = {
        margin: 0,
        filename: `${currentDocType}_${document.getElementById('cust-name').value || 'Export'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } finally {
        element.classList.remove('pdf-table-mode', 'pdf-single-page');
        document.querySelectorAll('.hidden-row').forEach(r => r.classList.remove('hidden-row'));
    }
};
