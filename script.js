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
    try { await signInWithEmailAndPassword(auth, e, p); } catch (err) { alert("Login Error"); }
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
    loadHistory(); 
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
        <td class="p-3"><input type="number" class="w-full bg-transparent text-right item-cost" value="${rate}" oninput="calculateTotals()"></td>
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
        const r = parseFloat(row.querySelector('.item-cost').value) || 0;
        const q = parseFloat(row.querySelector('.item-qty').value) || 0;
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
    } catch (e) { alert("Save Error"); }
};

async function loadHistory() {
    if(!currentUser) return;
    const q = query(collection(db, "quotes"), where("userId", "==", currentUser.uid), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    const container = document.getElementById('history-list');
    container.innerHTML = '';
    snap.docs.forEach(d => {
        const data = d.data();
        const div = document.createElement('div');
        div.className = "p-4 bg-white border rounded-xl flex justify-between items-center cursor-pointer hover:border-orange-500";
        div.onclick = () => {
            document.getElementById('cust-name').value = data.customerName;
            document.getElementById('cust-address').value = data.customerAddress;
            document.getElementById('job-desc').value = data.jobDescription;
            document.getElementById('line-items').innerHTML = '';
            data.items.forEach(i => addLineItem(i.description, i.rate, i.quantity));
            setDocType(data.type);
        };
        div.innerHTML = `<div><p class="text-xs font-bold text-slate-400">${data.date}</p><p class="font-black">${data.customerName}</p></div><p class="font-black text-orange-600">£${data.total}</p>`;
        container.appendChild(div);
    });
}

// NUCLEAR PDF FIX: CLONE AND LOCK WIDTH
window.downloadPDF = async () => {
    const original = document.getElementById('document-to-print');
    
    // 1. Create a "ghost" element that the user never sees
    const ghost = original.cloneNode(true);
    ghost.classList.add('pdf-capture-container');
    
    // 2. Clean UI elements out of the ghost
    ghost.querySelectorAll('.no-print').forEach(el => el.remove());
    const toggle = ghost.querySelector('#toggle-container'); if(toggle) toggle.remove();

    // 3. Force all inputs into static text blocks
    ghost.querySelectorAll('input, textarea').forEach((input, idx) => {
        const replacement = document.createElement('div');
        replacement.className = 'replacement-text';
        
        // Match existing value
        const val = input.value;
        
        // Handle specific styles
        if (input.id === 'cust-name') replacement.style.fontSize = '24px', replacement.style.fontWeight = 'bold';
        if (input.classList.contains('item-cost')) replacement.style.textAlign = 'right';
        if (input.classList.contains('item-qty')) replacement.style.textAlign = 'center';
        
        replacement.innerText = val;
        input.parentNode.insertBefore(replacement, input);
        input.remove();
    });

    // 4. Temporarily add to body (invisible) to capture
    ghost.style.position = 'absolute';
    ghost.style.left = '-9999px';
    ghost.style.top = '0';
    document.body.appendChild(ghost);

    const opt = {
        margin: [15, 15, 15, 15],
        filename: `${currentDocType}_${document.getElementById('cust-name').value || 'Brammeld'}.pdf`,
        image: { type: 'jpeg', quality: 1 },
        html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            width: 700 // CAPTURE AT THIS EXACT WIDTH
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(ghost).save();
    } finally {
        ghost.remove(); // Clean up memory
    }
};
