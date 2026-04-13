import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

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

// --- Authentication ---
window.handleLogin = async () => {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        document.getElementById('auth-error').classList.remove('hidden');
        document.getElementById('auth-error').innerText = "Invalid Credentials";
    }
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('auth-overlay').classList.add('hidden');
        document.getElementById('app-content').classList.remove('hidden');
        initApp();
    }
});

// --- Core App Logic ---
function initApp() {
    document.getElementById('doc-date').valueAsDate = new Date();
    loadCustomers();
    addLineItem(); // Start with one row
    setupCustomerSearch();
}

window.setDocType = (type) => {
    currentDocType = type;
    document.getElementById('doc-title').innerText = type;
    const qBtn = document.getElementById('toggle-quote');
    const iBtn = document.getElementById('toggle-invoice');
    
    if(type === 'QUOTE') {
        qBtn.classList.add('bg-white', 'shadow-sm');
        iBtn.classList.remove('bg-white', 'shadow-sm');
    } else {
        iBtn.classList.add('bg-white', 'shadow-sm');
        qBtn.classList.remove('bg-white', 'shadow-sm');
    }
};

window.addLineItem = () => {
    const tbody = document.getElementById('line-items');
    const row = document.createElement('tr');
    row.className = "cost-row border-b border-gray-100";
    row.innerHTML = `
        <td class="p-2 cost-cell"><textarea class="w-full p-2 outline-none resize-none item-desc" rows="1" placeholder="Item..."></textarea></td>
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

// --- Customer Memory ---
async function loadCustomers() {
    const snap = await getDocs(collection(db, "customers"));
    customersList = snap.docs.map(doc => doc.data());
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
            matches.forEach(match => {
                const div = document.createElement('div');
                div.className = "p-2 hover:bg-orange-50 cursor-pointer text-sm border-b";
                div.innerText = match.name;
                div.onclick = () => {
                    input.value = match.name;
                    document.getElementById('cust-address').value = match.address;
                    tray.classList.add('hidden');
                };
                tray.appendChild(div);
            });
        } else {
            tray.classList.add('hidden');
        }
    });
}

// --- Save & PDF ---
window.saveToFirestore = async () => {
    const docData = {
        type: currentDocType,
        customerName: document.getElementById('cust-name').value,
        address: document.getElementById('cust-address').value,
        date: document.getElementById('doc-date').value,
        description: document.getElementById('job-desc').value,
        total: document.getElementById('grand-total').innerText,
        createdAt: new Date()
    };

    try {
        await addDoc(collection(db, "documents"), docData);
        // Save customer if new
        const exists = customersList.some(c => c.name === docData.customerName);
        if (!exists && docData.customerName) {
            await addDoc(collection(db, "customers"), { name: docData.customerName, address: docData.address });
        }
        alert("Synced Successfully!");
    } catch (e) {
        console.error("Error saving: ", e);
    }
};

window.generatePDF = async () => {
    const element = document.body;
    
    // Rule B: Hide empty rows
    document.querySelectorAll('.cost-row').forEach(row => {
        const desc = row.querySelector('.item-desc').value;
        if (!desc.trim()) row.classList.add('hidden-row');
    });

    // Rule C: Force Table Layout
    document.getElementById('app-content').classList.add('pdf-table-mode');

    const opt = {
        margin: [10, 10],
        filename: `${currentDocType}_${document.getElementById('cust-name').value}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    await html2pdf().set(opt).from(element).save();

    // Clean up
    document.querySelectorAll('.hidden-row').forEach(r => r.classList.remove('hidden-row'));
    document.getElementById('app-content').classList.remove('pdf-table-mode');
};
