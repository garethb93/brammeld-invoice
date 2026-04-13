import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

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
        const errEl = document.getElementById('auth-error');
        errEl.classList.remove('hidden');
        errEl.innerText = "Login Failed: Check details.";
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
    addLineItem();
    setupCustomerSearch();
    lucide.createIcons();
}

window.setDocType = (type) => {
    currentDocType = type;
    document.getElementById('doc-title').innerText = type;
    document.getElementById('toggle-quote').classList.toggle('bg-white', type === 'QUOTE');
    document.getElementById('toggle-quote').classList.toggle('shadow-sm', type === 'QUOTE');
    document.getElementById('toggle-invoice').classList.toggle('bg-white', type === 'INVOICE');
    document.getElementById('toggle-invoice').classList.toggle('shadow-sm', type === 'INVOICE');
};

window.addLineItem = () => {
    const tbody = document.getElementById('line-items');
    const row = document.createElement('tr');
    row.className = "cost-row border-b border-gray-100";
    row.innerHTML = `
        <td class="p-2 cost-cell"><textarea class="w-full p-2 outline-none resize-none item-desc" rows="1" placeholder="Item description..."></textarea></td>
        <td class="p-2 cost-cell"><input type="number" class="w-full p-2 outline-none item-cost" value="0" oninput="calculateTotals()"></td>
        <td class="p-2 cost-cell"><input type="number" class="w-full p-2 outline-none item-qty" value="1" oninput="calculateTotals()"></td>
        <td class="p-2 cost-cell font-bold text-gray-700 line-total">£0.00</td>
        <td class="p-2 no-print text-center"><button onclick="this.closest('tr').remove(); calculateTotals();" class="text-red-400 hover:text-red-600">×</button></td>
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
    try {
        const snap = await getDocs(collection(db, "customers"));
        customersList = snap.docs.map(doc => doc.data());
    } catch (e) { console.error("Customer load error", e); }
}

function setupCustomerSearch() {
    const input = document.getElementById('cust-name');
    const tray = document.getElementById('suggestions');
    input.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase();
        tray.innerHTML = '';
        if (val.length < 2) { tray.classList.add('hidden'); return; }
        const matches = customersList.filter(c => c.name.toLowerCase().includes(val));
        if (matches.length > 0) {
            tray.classList.remove('hidden');
            matches.forEach(m => {
                const d = document.createElement('div');
                d.className = "p-3 hover:bg-orange-50 cursor-pointer text-sm border-b";
                d.innerText = m.name;
                d.onclick = () => {
                    input.value = m.name;
                    document.getElementById('cust-address').value = m.address;
                    tray.classList.add('hidden');
                };
                tray.appendChild(d);
            });
        } else { tray.classList.add('hidden'); }
    });
}

window.generatePDF = async () => {
    // 1. Logic: Save customer if new to Firestore
    const name = document.getElementById('cust-name').value;
    const addr = document.getElementById('cust-address').value;
    if (name && !customersList.some(c => c.name === name)) {
        try {
            await addDoc(collection(db, "customers"), { name, address: addr });
        } catch(e) {}
    }

    // 2. Formatting: Rule B (Hide Empty) & Rule C (Table Layout)
    document.querySelectorAll('.cost-row').forEach(row => {
        if (!row.querySelector('.item-desc').value.trim()) row.classList.add('hidden-row');
    });
    document.getElementById('app-content').classList.add('pdf-table-mode');

    const opt = {
        margin: [10, 10],
        filename: `${currentDocType}_${name || 'Export'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(document.getElementById('app-content')).save();
    } finally {
        document.querySelectorAll('.hidden-row').forEach(r => r.classList.remove('hidden-row'));
        document.getElementById('app-content').classList.remove('pdf-table-mode');
    }
};
