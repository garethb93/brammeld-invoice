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
    if(!name) return alert("Customer Name Required");
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
    const q = query(collection(db, "quotes"), where("userId", "==", currentUser.uid));
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
                <button onclick="event.stopPropagation(); if(confirm('Delete record?')) deleteDoc(doc(db, 'quotes', '${d.id}')).then(loadHistory)" class="text-red-500">
                    <i data-lucide="trash-2" class="w-4 h-4"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
    lucide.createIcons();
}

// PDF FIX: THE CLONING METHOD
window.downloadPDF = async () => {
    // 1. Clone the element to avoid UI interference
    const original = document.getElementById('document-to-print');
    const clone = original.cloneNode(true);
    
    // 2. Clean the clone (remove buttons/toggles)
    clone.querySelectorAll('.no-print').forEach(el => el.remove());
    clone.querySelector('#toggle-container').remove();
    clone.querySelector('#th-action').remove();
    clone.querySelectorAll('.action-cell').forEach(el => el.remove());

    // 3. Fix input values (cloning doesn't copy current input text)
    clone.querySelector('#cust-name').outerHTML = `<span>${document.getElementById('cust-name').value}</span>`;
    clone.querySelector('#doc-date').outerHTML = `<span>${document.getElementById('doc-date').value}</span>`;
    clone.querySelector('#cust-address').outerHTML = `<div style="white-space: pre-wrap">${document.getElementById('cust-address').value}</div>`;
    clone.querySelector('#job-desc').outerHTML = `<div style="white-space: pre-wrap; margin-bottom: 20px;">${document.getElementById('job-desc').value}</div>`;
    
    const originalItems = original.querySelectorAll('.cost-row');
    clone.querySelectorAll('.cost-row').forEach((row, index) => {
        const desc = originalItems[index].querySelector('.item-desc').value;
        const rate = originalItems[index].querySelector('.item-cost').value;
        const qty = originalItems[index].querySelector('.item-qty').value;
        const total = originalItems[index].querySelector('.line-total').innerText;
        
        row.innerHTML = `
            <td class="p-3">${desc}</td>
            <td class="p-3">£${rate}</td>
            <td class="p-3 text-center">${qty}</td>
            <td class="p-3 text-right font-bold">${total}</td>
        `;
    });

    // 4. Style the clone for PDF
    clone.style.width = "700px";
    clone.style.padding = "20px";
    clone.style.background = "white";

    const opt = {
        margin: 10,
        filename: `${currentDocType}_${document.getElementById('cust-name').value || 'Brammeld'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 5. Generate and Save
    await html2pdf().set(opt).from(clone).save();
};
