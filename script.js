import { initializeApp } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp, deleteDoc, doc, query, where, orderBy } from "https://www.gstatic.com/firebasejs/9.18.0/firebase-firestore.js";

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
let currentDocType = 'QUOTE', currentUser = null;

window.handleLogin = async () => {
    const e = document.getElementById('email').value, p = document.getElementById('password').value;
    try { await signInWithEmailAndPassword(auth, e, p); } catch (err) { document.getElementById('auth-error').classList.remove('hidden'); }
};

onAuthStateChanged(auth, (user) => {
    if (user) { currentUser = user; document.getElementById('auth-overlay').classList.add('hidden'); document.getElementById('app-content').classList.remove('hidden'); initApp(); }
});

function initApp() { document.getElementById('doc-date').valueAsDate = new Date(); loadHistory(); addLineItem(); }

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
        <td class="p-3"><input type="number" class="w-full bg-transparent item-cost" value="${rate}" oninput="calculateTotals()"></td>
        <td class="p-3"><input type="number" class="w-full bg-transparent text-center item-qty" value="${qty}" oninput="calculateTotals()"></td>
        <td class="p-3 font-black text-right line-total">£0.00</td>
        <td class="p-3 no-print action-cell text-center"><button onclick="this.closest('tr').remove(); calculateTotals();" class="text-red-500 font-bold">×</button></td>
    `;
    tbody.appendChild(row);
    calculateTotals();
};

window.calculateTotals = () => {
    let sub = 0;
    document.querySelectorAll('.cost-row').forEach(row => {
        const r = parseFloat(row.querySelector('.item-cost').value) || 0, q = parseFloat(row.querySelector('.item-qty').value) || 0;
        row.querySelector('.line-total').innerText = `£${(r * q).toFixed(2)}`;
        sub += (r * q);
    });
    document.getElementById('grand-total').innerText = `£${sub.toFixed(2)}`;
};

window.saveToCloud = async () => {
    const name = document.getElementById('cust-name').value;
    if(!name) return alert("Name Required");
    const items = Array.from(document.querySelectorAll('.cost-row')).map(row => ({
        description: row.querySelector('.item-desc').value,
        rate: row.querySelector('.item-cost').value,
        quantity: row.querySelector('.item-qty').value
    }));
    try {
        await addDoc(collection(db, "quotes"), { userId: currentUser.uid, customerName: name, customerAddress: document.getElementById('cust-address').value, date: document.getElementById('doc-date').value, jobDescription: document.getElementById('job-desc').value, type: currentDocType, total: document.getElementById('grand-total').innerText.replace('£', ''), items: items, createdAt: serverTimestamp() });
        alert("Saved!"); loadHistory();
    } catch (e) { alert("Error: " + e.message); }
};

async function loadHistory() {
    if(!currentUser) return;
    const q = query(collection(db, "quotes"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const tbody = document.getElementById('history-list');
    tbody.innerHTML = '';
    snap.docs.forEach(d => {
        const data = d.data();
        const tr = document.createElement('tr');
        tr.className = "border-b border-slate-50 hover:bg-slate-50 cursor-pointer";
        tr.onclick = () => {
            document.getElementById('cust-name').value = data.customerName;
            document.getElementById('cust-address').value = data.customerAddress;
            document.getElementById('job-desc').value = data.jobDescription;
            document.getElementById('line-items').innerHTML = '';
            data.items.forEach(i => addLineItem(i.description, i.rate, i.quantity));
            setDocType(data.type); window.scrollTo({top: 0, behavior: 'smooth'});
        };
        tr.innerHTML = `
            <td class="p-4 text-slate-500 text-xs">${data.date}</td>
            <td class="p-4 font-bold">${data.customerName}</td>
            <td class="p-4 text-right font-black">£${data.total}</td>
            <td class="p-4 text-center">
                <button onclick="event.stopPropagation(); if(confirm('Delete?')) deleteDoc(doc(db, 'quotes', '${d.id}')).then(loadHistory)" class="text-red-500">×</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// FULL RESET OF PDF LOGIC
window.downloadPDF = async () => {
    const element = document.getElementById('document-to-print');
    const inputs = element.querySelectorAll('input, textarea');
    const replacements = [];

    // 1. Swap inputs for static text to keep padding clean
    inputs.forEach(input => {
        const replacement = document.createElement('div');
        replacement.className = 'pdf-replacement-text font-bold';
        if (input.classList.contains('item-cost') || input.classList.contains('item-qty')) {
            replacement.style.textAlign = 'right';
        }
        replacement.innerText = input.value;
        input.style.display = 'none';
        input.parentNode.insertBefore(replacement, input);
        replacements.push({ div: replacement, input: input });
    });

    element.classList.add('force-pdf-layout');

    const opt = {
        margin: [10, 10, 10, 10], // Force 10mm margin on ALL sides
        filename: `${currentDocType}_${document.getElementById('cust-name').value || 'Brammeld'}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
            scale: 3, 
            useCORS: true,
            windowWidth: 800, // Forces the capture to think the screen is small (prevents right shift)
            scrollY: 0
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } finally {
        replacements.forEach(item => {
            item.input.style.display = 'block';
            item.div.remove();
        });
        element.classList.remove('force-pdf-layout');
    }
};
