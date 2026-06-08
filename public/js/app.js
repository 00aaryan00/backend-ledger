// ==================== STATE MANAGEMENT ====================
const state = {
  user: null,
  accounts: [],
  selectedAccountId: null,
  ledgerEntries: [] // Loaded from localStorage for demonstration of transaction history
};

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
  // Set date
  const dateEl = document.getElementById("today-date");
  if (dateEl) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    dateEl.textContent = new Date().toLocaleDateString('en-US', options);
  }

  setupEventListeners();
  checkAuth();
});

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Auth Form Toggle links
  document.getElementById("toggle-to-register").addEventListener("click", (e) => {
    e.preventDefault();
    toggleAuthForms("register");
  });

  document.getElementById("toggle-to-login").addEventListener("click", (e) => {
    e.preventDefault();
    toggleAuthForms("login");
  });

  // Auth Submissions
  document.getElementById("login-form").addEventListener("submit", handleLogin);
  document.getElementById("register-form").addEventListener("submit", handleRegister);
  document.getElementById("logout-btn").addEventListener("click", handleLogout);

  // Quick Action Submissions
  document.getElementById("create-account-btn").addEventListener("click", handleCreateAccount);
  document.getElementById("system-faucet-btn").addEventListener("click", handleUpgradeToSystemUser);
  document.getElementById("transfer-form").addEventListener("submit", handleTransfer);
  document.getElementById("faucet-form").addEventListener("submit", handleInjectInitialFunds);

  // Account Selections
  document.getElementById("transfer-from").addEventListener("change", (e) => {
    const accId = e.target.value;
    if (accId) {
      selectPrimaryAccount(accId);
    }
  });

  document.getElementById("ledger-account-select").addEventListener("change", (e) => {
    const accId = e.target.value;
    if (accId) {
      loadLedgerEntries(accId);
    }
  });
}

// ==================== AUTH FUNCTIONS ====================
function toggleAuthForms(view) {
  const loginForm = document.getElementById("login-form");
  const regForm = document.getElementById("register-form");
  const authTitle = document.getElementById("auth-title");
  const authSubtitle = document.getElementById("auth-subtitle");

  if (view === "register") {
    loginForm.classList.add("hidden");
    regForm.classList.remove("hidden");
    authTitle.textContent = "Create an Account";
    authSubtitle.textContent = "Join Aura Digital Banking Ledger";
  } else {
    loginForm.classList.remove("hidden");
    regForm.classList.add("hidden");
    authTitle.textContent = "Welcome Back";
    authSubtitle.textContent = "Access your secure digital banking ledger";
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;

  showLoading(true, "Registering secure ledger details...");
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
    const data = await res.json();
    showLoading(false);

    if (res.status === 201) {
      showToast("Registration successful!", "success");
      state.user = data.user;
      localStorage.setItem("user", JSON.stringify(data.user));
      enterDashboard();
    } else {
      showToast(data.message || "Registration failed", "error");
    }
  } catch (error) {
    showLoading(false);
    showToast("Server error during registration", "error");
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;

  showLoading(true, "Authenticating user details...");
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    showLoading(false);

    if (res.status === 200) {
      showToast("Access granted!", "success");
      state.user = data.user;
      localStorage.setItem("user", JSON.stringify(data.user));
      enterDashboard();
    } else {
      showToast(data.message || "Invalid credentials", "error");
    }
  } catch (error) {
    showLoading(false);
    showToast("Server communication error", "error");
  }
}

async function handleLogout() {
  showLoading(true, "Signing out...");
  try {
    await fetch("/api/auth/logout", { method: "POST" });
    showLoading(false);
    showToast("Signed out successfully", "info");
    state.user = null;
    state.accounts = [];
    state.selectedAccountId = null;
    localStorage.removeItem("user");
    exitDashboard();
  } catch (error) {
    showLoading(false);
    showToast("Logout request error", "error");
  }
}

function checkAuth() {
  const cachedUser = localStorage.getItem("user");
  if (cachedUser) {
    state.user = JSON.parse(cachedUser);
    enterDashboard();
  } else {
    exitDashboard();
  }
}

function enterDashboard() {
  document.getElementById("auth-section").classList.add("hidden");
  document.getElementById("dashboard-section").classList.remove("hidden");

  // Load profile display
  document.getElementById("user-display-name").textContent = state.user.name;
  document.getElementById("user-display-email").textContent = state.user.email;
  document.getElementById("primary-card-holder-name").textContent = state.user.name.toUpperCase();
  document.getElementById("user-avatar").textContent = state.user.name.charAt(0).toUpperCase();

  // Show badge if user is systemUser (we fetch profile updates to confirm system status)
  fetchUserProfileStatus();
  loadUserAccounts();
}

function exitDashboard() {
  document.getElementById("auth-section").classList.remove("hidden");
  document.getElementById("dashboard-section").classList.add("hidden");
  document.getElementById("login-form").reset();
  document.getElementById("register-form").reset();
}

async function fetchUserProfileStatus() {
  // We can see if the user is a system user by fetching profiles or looking up system badge info.
  // We check the system status state.user.systemUser
  if (state.user && state.user.systemUser) {
    document.getElementById("system-badge-container").classList.remove("hidden");
    document.getElementById("system-faucet-btn").classList.add("hidden"); // already admin
  } else {
    document.getElementById("system-badge-container").classList.add("hidden");
    document.getElementById("system-faucet-btn").classList.remove("hidden");
  }
}

// ==================== UPGRADE USER (DEVELOPER HELPER) ====================
async function handleUpgradeToSystemUser() {
  showLoading(true, "Upgrading user credentials to system admin...");
  try {
    const res = await fetch("/api/auth/make-system-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    showLoading(false);

    if (res.status === 200) {
      showToast(data.message, "success");
      state.user.systemUser = true;
      localStorage.setItem("user", JSON.stringify(state.user));
      fetchUserProfileStatus();
      loadUserAccounts();
    } else {
      showToast(data.message || "Failed to elevate permissions", "error");
    }
  } catch (error) {
    showLoading(false);
    showToast("Server elevation error", "error");
  }
}

// ==================== ACCOUNT OPERATIONS ====================
async function loadUserAccounts() {
  try {
    const res = await fetch("/api/accounts");
    const data = await res.json();

    if (res.status === 200) {
      state.accounts = data.accounts;
      renderAccounts();
    }
  } catch (error) {
    showToast("Error retrieving accounts", "error");
  }
}

async function handleCreateAccount() {
  showLoading(true, "Configuring new ledger vault...");
  try {
    const res = await fetch("/api/accounts", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    const data = await res.json();
    showLoading(false);

    if (res.status === 201) {
      showToast("Ledger account created successfully!", "success");
      await loadUserAccounts();
      // Pre-fill faucet target input with the newly created account ID for convenience!
      document.getElementById("faucet-to").value = data.account._id;
    } else {
      showToast(data.message || "Failed to create account", "error");
    }
  } catch (error) {
    showLoading(false);
    showToast("Account creation server error", "error");
  }
}

function renderAccounts() {
  const tbody = document.getElementById("accounts-table-body");
  const selectFrom = document.getElementById("transfer-from");
  const selectLedger = document.getElementById("ledger-account-select");

  // Keep selected values if any
  const prevFrom = selectFrom.value;
  const prevLedger = selectLedger.value;

  // Clear selections
  selectFrom.innerHTML = '<option value="" disabled selected>Select Source Account</option>';
  selectLedger.innerHTML = '<option value="" disabled selected>Filter by Account</option>';

  document.getElementById("account-count").textContent = state.accounts.length;

  if (state.accounts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center text-secondary">No active accounts. Create one to begin.</td></tr>';
    resetPrimaryCard();
    return;
  }

  tbody.innerHTML = "";

  state.accounts.forEach((acc) => {
    // Add selectors options
    const optFrom = document.createElement("option");
    optFrom.value = acc._id;
    optFrom.textContent = `${acc._id} (${acc.currency})`;
    selectFrom.appendChild(optFrom);

    const optLedger = document.createElement("option");
    optLedger.value = acc._id;
    optLedger.textContent = `${acc._id} (${acc.currency})`;
    selectLedger.appendChild(optLedger);

    // Append to Table
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><span class="card-number">${acc._id}</span></td>
      <td><strong>${acc.currency}</strong></td>
      <td><span class="status-chip status-active">${acc.status}</span></td>
      <td id="balance-cell-${acc._id}">Loading...</td>
      <td>
        <button class="btn btn-secondary select-acc-btn" style="padding: 4px 10px; font-size: 0.8rem;" data-id="${acc._id}">
          Select
        </button>
      </td>
    `;
    tbody.appendChild(tr);

    // Trigger balance fetch
    fetchAccountBalance(acc._id);
  });

  // Attach buttons events
  document.querySelectorAll(".select-acc-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const id = e.target.getAttribute("data-id");
      selectPrimaryAccount(id);
    });
  });

  // Re-apply previous values or pick first
  if (state.accounts.find((a) => a._id === prevFrom)) selectFrom.value = prevFrom;
  if (state.accounts.find((a) => a._id === prevLedger)) selectLedger.value = prevLedger;

  if (!state.selectedAccountId) {
    selectPrimaryAccount(state.accounts[0]._id);
  } else {
    // Refresh selected
    selectPrimaryAccount(state.selectedAccountId);
  }
}

async function fetchAccountBalance(accId) {
  try {
    const res = await fetch(`/api/accounts/balance/${accId}`);
    const data = await res.json();
    if (res.status === 200) {
      // Find account in state
      const acc = state.accounts.find((a) => a._id === accId);
      if (acc) {
        acc.balance = data.balance;
      }
      // Update cell in table
      const cell = document.getElementById(`balance-cell-${accId}`);
      if (cell) {
        cell.innerHTML = `<strong>₹${data.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>`;
      }
      // Update primary card balance if selected
      if (state.selectedAccountId === accId) {
        animateBalanceCounter(data.balance);
      }
    }
  } catch (error) {
    console.error("Error fetching balance:", error);
  }
}

function selectPrimaryAccount(accId) {
  state.selectedAccountId = accId;
  const selectFrom = document.getElementById("transfer-from");
  const selectLedger = document.getElementById("ledger-account-select");

  selectFrom.value = accId;
  selectLedger.value = accId;

  const acc = state.accounts.find((a) => a._id === accId);
  if (acc) {
    document.getElementById("primary-card-id").textContent = acc._id.match(/.{1,4}/g).join("  ");
    document.getElementById("primary-card-currency").textContent = acc.currency;
    if (acc.balance !== undefined) {
      animateBalanceCounter(acc.balance);
    } else {
      document.getElementById("primary-card-balance").textContent = "₹0.00";
    }
    loadLedgerEntries(accId);
  }
}

function resetPrimaryCard() {
  document.getElementById("primary-card-id").textContent = "•••• •••• •••• ••••";
  document.getElementById("primary-card-currency").textContent = "INR";
  document.getElementById("primary-card-balance").textContent = "₹0.00";
  state.selectedAccountId = null;
  const tbody = document.getElementById("ledger-table-body");
  tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary">Select an account to view ledger history.</td></tr>';
}

function animateBalanceCounter(targetVal) {
  const el = document.getElementById("primary-card-balance");
  const startVal = parseFloat(el.textContent.replace(/[₹,]/g, "")) || 0;
  const duration = 800; // ms
  const startTime = performance.now();

  function updateCounter(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    // EaseOutQuad formula
    const easeProgress = progress * (2 - progress);
    const currentVal = startVal + (targetVal - startVal) * easeProgress;
    
    el.textContent = "₹" + currentVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    if (progress < 1) {
      requestAnimationFrame(updateCounter);
    } else {
      el.textContent = "₹" + targetVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }

  requestAnimationFrame(updateCounter);
}

// ==================== TRANSACTION OPERATIONS ====================
async function handleTransfer(e) {
  e.preventDefault();
  const fromAccount = document.getElementById("transfer-from").value;
  const toAccount = document.getElementById("transfer-to").value;
  const amount = Number(document.getElementById("transfer-amount").value);
  const idempotencyKey = "tx_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();

  showLoading(true, "Initiating secure ledger transfer...");

  try {
    const res = await fetch("/api/transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fromAccount, toAccount, amount, idempotencyKey })
    });
    const data = await res.json();
    showLoading(false);

    if (res.status === 201) {
      showToast("Transfer completed successfully!", "success");
      document.getElementById("transfer-form").reset();
      
      // Refresh balances & ledger logs
      await loadUserAccounts();
    } else {
      showToast(data.message || "Transfer failed", "error");
    }
  } catch (error) {
    showLoading(false);
    showToast("Server transfer error", "error");
  }
}

async function handleInjectInitialFunds(e) {
  e.preventDefault();
  const toAccount = document.getElementById("faucet-to").value;
  const amount = Number(document.getElementById("faucet-amount").value);
  const idempotencyKey = "init_" + Math.random().toString(36).substring(2, 9) + "_" + Date.now();

  showLoading(true, "Injecting test funds...");
  try {
    const res = await fetch("/api/transactions/system/initial-funds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toAccount, amount, idempotencyKey })
    });
    const data = await res.json();
    showLoading(false);

    if (res.status === 201) {
      showToast("Initial funds injected successfully!", "success");
      document.getElementById("faucet-form").reset();
      
      // Refresh balances & ledger logs
      await loadUserAccounts();
    } else {
      showToast(data.message || "Failed to inject funds", "error");
    }
  } catch (error) {
    showLoading(false);
    showToast("Faucet injection server error", "error");
  }
}

// ==================== LEDGER REGISTRY LOGS ====================
async function loadLedgerEntries(accountId) {
  const tbody = document.getElementById("ledger-table-body");
  
  try {
    const res = await fetch(`/api/accounts/ledger/${accountId}`);
    const data = await res.json();

    if (res.status !== 200 || !data.ledgers || data.ledgers.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center text-secondary">No ledger logs found on this account.</td></tr>';
      return;
    }

    tbody.innerHTML = "";
    data.ledgers.forEach((log) => {
      const tr = document.createElement("tr");
      const typeClass = log.type === "CREDIT" ? "type-credit" : "type-debit";
      
      const txId = log.transaction?._id || log.transaction || 'N/A';
      const key = log.transaction?.idempotencyKey || 'N/A';

      tr.innerHTML = `
        <td><span class="type-chip ${typeClass}">${log.type}</span></td>
        <td><strong>₹${log.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></td>
        <td><span class="card-number">${txId}</span></td>
        <td><span class="text-secondary text-small">${key}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error("Error loading ledger logs:", error);
    tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Error loading ledger history.</td></tr>';
  }
}

// ==================== UI HELPER FUNCTIONS ====================
function showLoading(show, text = "Processing request...") {
  const overlay = document.getElementById("loading-overlay");
  const label = document.getElementById("loading-text");
  if (show) {
    label.textContent = text;
    overlay.classList.remove("hidden");
  } else {
    overlay.classList.add("hidden");
  }
}

function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  
  let icon = "";
  if (type === "success") {
    icon = `<svg style="width:20px;height:20px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`;
  } else if (type === "error") {
    icon = `<svg style="width:20px;height:20px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
  } else {
    icon = `<svg style="width:20px;height:20px" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
  }

  toast.innerHTML = `${icon} <span>${message}</span>`;
  container.appendChild(toast);

  // Auto remove
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease-in reverse";
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 4000);
}
