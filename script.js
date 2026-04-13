import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

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

// Auth Logic
window.handleLogin = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        document.getElementById('auth-error').classList.remove('hidden');
    }
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
    let subtotal = 0;
    document.querySelectorAll('.cost-row').forEach(row => {
        const cost = parseFloat(row.querySelector('.item-cost').value) || 0;
        const qty = parseFloat(row.querySelector('.item-qty').value) || 0;
        const total = cost * qty;
        row.querySelector('.line-total').innerText = `£${total.toFixed(2)}`;
        subtotal += total;
    });
    document.getElementById('subtotal').innerText = `£${subtotal.toFixed(2)}`;
    document.getElementById('grand-total').innerText = `£${subtotal.toFixed(2)}`;
};

async function loadCustomers() {
    const snap = await getDocs(collection(db, "customers"));
    customersList = snap.docs.map(doc => doc.data());
}

async function loadHistory() {
    const q = query(collection(db, "documents"), orderBy("createdAt", "desc"), limit(10));
    const snap = await getDocs(q);
    const tbody = document.getElementById('history-list');
    tbody.innerHTML = '';
    snap.forEach(doc => {
        const d = doc.data();
        const tr = document.createElement('tr');
        tr.className = "border-b";
        tr.innerHTML = `<td class="p-3">${d.date}</td><td class="p-3 font-bold">${d.customerName}</td><td class="p-3">${d.type}</td><td class="p-3 font-bold text-orange-600">${d.total}</td>`;
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
        if (matches.length > 0) {
            tray.classList.remove('hidden');
            matches.forEach(m => {
                const d = document.createElement('div');
                d.className = "p-2 hover:bg-orange-50 cursor-pointer border-b text-sm";
                d.innerText = m.name;
                d.onclick = () => { input.value = m.name; document.getElementById('cust-address').value = m.address; tray.classList.add('hidden'); };
                tray.appendChild(d);
            });
        }
    });
}

window.saveAndDownload = async () => {
    const name = document.getElementById('cust-name').value;
    const addr = document.getElementById('cust-address').value;
    const total = document.getElementById('grand-total').innerText;
    
    // Save to Firestore
    try {
        await addDoc(collection(db, "documents"), {
            type: currentDocType,
            customerName: name,
            total: total,
            date: document.getElementById('doc-date').value,
            createdAt: new Date()
        });
        if (name && !customersList.some(c => c.name === name)) {
            await addDoc(collection(db, "customers"), { name, address: addr });
        }
        loadHistory();
    } catch (e) { console.error(e); }

    // PDF Export with "Fit to Page" rules
    const element = document.getElementById('document-to-print');
    document.querySelectorAll('.cost-row').forEach(row => {
        if (!row.querySelector('.item-desc').value.trim()) row.classList.add('hidden-row');
    });
    element.classList.add('pdf-table-mode', 'pdf-single-page');

    const opt = {
        margin: 0,
        filename: `${currentDocType}_${name}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().set(opt).from(element).save();
    
    element.classList.remove('pdf-table-mode', 'pdf-single-page');
    document.querySelectorAll('.hidden-row').forEach(r => r.classList.remove('hidden-row'));
};
