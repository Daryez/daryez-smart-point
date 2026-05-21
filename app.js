const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN"
});

const APP_NAME = "Daryez Smart Point";
const APP_VERSION = "1.1.0";
const APP_SCHEMA_VERSION = 3;
const BACKUP_FORMAT_VERSION = 3;
const BACKUP_COMPATIBLE_FROM = 1;
const STORAGE_KEY = "daryez-smart-point-v1";
const INSTALLATION_KEY = "daryez-smart-point-installation-v1";
const FRESH_INSTALLATION = !localStorage.getItem(STORAGE_KEY) && !localStorage.getItem(INSTALLATION_KEY);
const AUTO_BACKUP_INTERVAL_MS = 60 * 60 * 1000;
const MAX_BACKUP_HISTORY = 12;
const MAX_AUDIT_LOGS = 700;
const MAX_SYSTEM_LOGS = 300;

const ROLE_PERMISSIONS = {
  admin: ["*"],
  supervisor: [
    "view:dashboard", "view:pos", "view:customers", "view:products", "view:suppliers",
    "view:categories", "view:inventory", "view:credits", "view:history", "view:reports",
    "view:backup", "view:cash", "view:supplierInvoices", "view:invoiceDesigner", "sale:create", "cash:manage", "inventory:adjust",
    "catalog:write", "backup:export", "report:view", "invoice:edit", "return:create",
    "supplierInvoice:write", "invoiceDesign:write"
  ],
  cashier: [
    "view:pos", "view:history", "view:cash", "sale:create", "cash:manage",
    "credit:payment", "invoice:print"
  ],
  seller: [
    "view:pos", "view:history", "view:cash", "sale:create", "cash:manage",
    "credit:payment", "invoice:print"
  ]
};

const MODULE_REGISTRY = {
  dashboard: "Resumen operativo y alertas",
  auth: "Usuarios, roles y sesiones",
  sales: "Punto de venta, cobros y devoluciones",
  products: "Catalogo, precios e inventario",
  customers: "Clientes y creditos",
  suppliers: "Proveedores y clasificaciones",
  reports: "Analitica, filtros y exportacion",
  backups: "Respaldo, restauracion e integridad",
  settings: "Configuracion del negocio",
  printing: "Tickets, facturas y cortes"
};

const defaultState = {
  business: {
    name: APP_NAME,
    phone: "",
    address: "",
    ticketMessage: "Gracias por su compra",
    theme: "teal",
    ticketWidth: "58",
    ticketHeaderText: "Daryez Smart Point",
    ticketFooterText: "Gracias por su compra",
    ticketShowAddress: "yes",
    scanner: {
      enabled: "yes",
      autoAdd: "yes",
      suffix: "Enter",
      minLength: 6,
      focusOnSale: "yes",
      captureOnProduct: "yes",
      lastDetectedAt: "",
      hardwareStatus: "Sin verificacion",
      hidSupported: false
    },
    inventory: {
      lowStockAlertsEnabled: "yes",
      defaultMinStock: 5,
      autoInventoryOnCreate: "yes"
    },
    regional: {
      currency: "MXN",
      locale: "es-MX",
      taxName: "IVA",
      taxRate: 0,
      invoicePrefix: "DSP",
      themeMode: "light"
    },
    fiscal: {
      enabled: "no",
      issuerRnc: "",
      defaultType: "none",
      sequences: {
        B01: { name: "Credito fiscal", prefix: "B01", next: 1, end: 99999999 },
        B02: { name: "Consumidor final", prefix: "B02", next: 1, end: 99999999 },
        B14: { name: "Regimen especial", prefix: "B14", next: 1, end: 99999999 },
        B15: { name: "Gubernamental", prefix: "B15", next: 1, end: 99999999 }
      }
    },
    invoiceDesign: {
      title: "Factura",
      series: "A",
      showLogo: "yes",
      showQr: "yes",
      showTax: "yes",
      format: "thermal",
      legalText: "",
      mode: "standard",
      customHtml: "",
      customCss: "",
      logoDataUrl: "",
      excelTemplate: null
    }
  },
  cash: {
    openingAmount: 0,
    openedAt: "",
    cashier: "",
    notes: "",
    lastCut: null,
    currentSessionId: "",
    sessions: []
  },
  suppliers: [
    { code: "PROV-001", name: "Proveedor universal de productos", phone: "789 000 0000" }
  ],
  customers: [
    { code: "CLI-001", name: "Cliente general", taxId: "", phone: "", address: "" }
  ],
  paymentMethods: [
    { code: "cash", name: "Efectivo", needsChange: true },
    { code: "card", name: "Tarjeta", needsChange: false },
    { code: "transfer", name: "Transferencia", needsChange: false },
    { code: "credit", name: "Credito", needsChange: false }
  ],
  users: [
    { username: "admin", name: "Administrador", password: "admin", role: "admin", status: "active" },
    { username: "cajero", name: "Cajero", password: "1234", role: "cashier", status: "active" }
  ],
  categories: [
    { code: "CAT-001", name: "Computo" },
    { code: "CAT-002", name: "Papeleria" }
  ],
  products: [
    { code: "2000000000015", description: "Mouse optico USB", supplier: "PROV-001", category: "CAT-001", unit: "Pieza", cost: 85, price: 149, stock: 18, minStock: 5, service: false },
    { code: "2000000000022", description: "Teclado multimedia", supplier: "PROV-001", category: "CAT-001", unit: "Pieza", cost: 145, price: 249, stock: 11, minStock: 5, service: false },
    { code: "SERV-01", description: "Servicio de envio local", supplier: "PROV-001", category: "CAT-002", unit: "Servicio", cost: 0, price: 50, stock: 0, minStock: 0, service: true }
  ],
  inventory: [],
  supplierInvoices: [],
  sales: [],
  credits: [],
  returns: [],
  cart: [],
  payType: "cash",
  currentUser: null,
  activeSaleFolio: "",
  pendingSale: null,
  activeCut: null,
  audit: [],
  systemLogs: [],
  backups: {
    autoEnabled: "yes",
    lastAutoBackupAt: "",
    history: []
  },
  integrity: {
    lastVerifiedAt: "",
    status: "Pendiente",
    issues: []
  }
};

const $ = (id) => document.getElementById(id);

const state = loadState();
normalizeState();

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function sanitizeText(value, maxLength = 180) {
  return String(value ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function hashPassword(password) {
  if (!crypto?.subtle) return `local-${simpleChecksum(String(password))}`;
  const bytes = new TextEncoder().encode(String(password));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function verifyUserPassword(user, password) {
  if (!user || user.status !== "active") return false;
  const passwordHash = await hashPassword(password);
  if (user.passwordHash && user.passwordHash === passwordHash) return true;
  if (!user.passwordHash && user.password === password) {
    user.passwordHash = passwordHash;
    delete user.password;
    addSystemLog("security", `Contrasena migrada a hash para ${user.username}`);
    return true;
  }
  return false;
}

function rolePermissions(role) {
  return ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier;
}

function can(permission) {
  const permissions = rolePermissions(state.currentUser?.role);
  return permissions.includes("*") || permissions.includes(permission);
}

function canAccessView(viewId) {
  return can(`view:${viewId}`);
}

function requirePermission(permission, message = "No tienes permisos para esta accion.") {
  if (can(permission)) return true;
  showToast(message);
  addAudit("permission_denied", permission, { user: state.currentUser?.username || "sin_sesion" });
  return false;
}

function addAudit(action, entity, details = {}) {
  if (!state.audit) state.audit = [];
  state.audit.unshift({
    id: `AUD-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    action,
    entity,
    details,
    user: state.currentUser?.username || "sistema",
    userName: state.currentUser?.name || "Sistema",
    createdAt: new Date().toISOString()
  });
  state.audit = state.audit.slice(0, MAX_AUDIT_LOGS);
}

function addSystemLog(level, message, details = {}) {
  if (!state.systemLogs) state.systemLogs = [];
  state.systemLogs.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    level,
    message,
    details,
    createdAt: new Date().toISOString()
  });
  state.systemLogs = state.systemLogs.slice(0, MAX_SYSTEM_LOGS);
}

function snapshotForBackup() {
  const data = clone(state);
  data.currentUser = null;
  data.cart = [];
  data.pendingSale = null;
  data.activeCut = null;
  data.backups = {
    ...data.backups,
    history: []
  };
  return data;
}

function simpleChecksum(value) {
  const text = JSON.stringify(value);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16);
}

function createBackupRecord(reason = "auto") {
  const data = snapshotForBackup();
  return {
    id: `BKP-${new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14)}`,
    reason,
    createdAt: new Date().toISOString(),
    schemaVersion: APP_SCHEMA_VERSION,
    checksum: simpleChecksum(data),
    data
  };
}

function createAutoBackup(reason = "auto") {
  state.backups = { ...defaultState.backups, ...state.backups };
  if (state.backups.autoEnabled !== "yes") return;
  const now = Date.now();
  const last = state.backups.lastAutoBackupAt ? new Date(state.backups.lastAutoBackupAt).getTime() : 0;
  if (reason === "auto" && last && now - last < AUTO_BACKUP_INTERVAL_MS) return;
  const backup = createBackupRecord(reason);
  state.backups.history = [backup, ...(state.backups.history || [])].slice(0, MAX_BACKUP_HISTORY);
  state.backups.lastAutoBackupAt = backup.createdAt;
}

function validateBackupPayload(payload) {
  const unwrapped = unwrapBackupPayload(payload);
  if (!unwrapped.data || typeof unwrapped.data !== "object") {
    return { ok: false, message: "El backup no contiene datos restaurables." };
  }
  if (payload?.checksum && simpleChecksum(unwrapped.data) !== payload.checksum) {
    return { ok: false, message: "El backup no coincide con su verificacion de integridad." };
  }
  return { ok: true, data: unwrapped.data };
}

function verifyStateIntegrity() {
  const issues = [];
  const productCodes = new Set();
  (state.products || []).forEach((product) => {
    if (!product.code || !product.description) issues.push("Hay productos sin codigo o descripcion.");
    if (productCodes.has(product.code)) issues.push(`Producto duplicado: ${product.code}`);
    productCodes.add(product.code);
    if (Number(product.price) < 0 || Number(product.cost) < 0 || Number(product.stock) < 0) {
      issues.push(`Producto con valores negativos: ${product.code}`);
    }
  });
  const userNames = new Set();
  (state.users || []).forEach((user) => {
    if (userNames.has(user.username)) issues.push(`Usuario duplicado: ${user.username}`);
    userNames.add(user.username);
  });
  (state.sales || []).forEach((sale) => {
    if (!sale.folio || !Array.isArray(sale.items) || Number(sale.total) < 0) {
      issues.push(`Venta con datos inconsistentes: ${sale.folio || "sin folio"}`);
    }
  });
  state.integrity = {
    lastVerifiedAt: new Date().toISOString(),
    status: issues.length ? "Revisar" : "Correcto",
    issues: issues.slice(0, 25)
  };
  return state.integrity;
}

function cleanStateTemplate() {
  const clean = clone(defaultState);
  clean.suppliers = [];
  clean.customers = [];
  clean.categories = [];
  clean.products = [];
  clean.inventory = [];
  clean.supplierInvoices = [];
  clean.sales = [];
  clean.credits = [];
  clean.returns = [];
  clean.cart = [];
  clean.cash = clone(defaultState.cash);
  clean.users = [
    { username: "admin", name: "Administrador", password: "admin", role: "admin", status: "active" }
  ];
  clean.audit = [];
  clean.systemLogs = [];
  clean.backups = clone(defaultState.backups);
  clean.integrity = clone(defaultState.integrity);
  return clean;
}

function demoStateTemplate() {
  const now = new Date();
  const openedAt = new Date(now.getTime() - (3 * 60 * 60 * 1000)).toISOString();
  const saleOneAt = new Date(now.getTime() - (2 * 60 * 60 * 1000)).toISOString();
  const saleTwoAt = new Date(now.getTime() - (75 * 60 * 1000)).toISOString();
  const paymentAt = new Date(now.getTime() - (35 * 60 * 1000)).toISOString();
  const sessionId = `CAJA-${todayISODate()}-001`;
  const demo = cleanStateTemplate();
  demo.business.phone = "591 70000000";
  demo.business.address = "Zona Comercial, Centro";
  demo.business.ticketHeaderText = APP_NAME;
  demo.business.ticketFooterText = "Gracias por preferirnos";
  demo.suppliers = [
    { code: "PROV-001", name: "Distribuidora Central", phone: "70001001" },
    { code: "PROV-002", name: "Mayorista Andino", phone: "70001002" }
  ];
  demo.customers = [
    { code: "CLI-001", name: "Cliente general", taxId: "", phone: "", address: "" },
    { code: "CLI-002", name: "Maria Lopez", taxId: "7845123", phone: "71111111", address: "Av. Libertad 123" },
    { code: "CLI-003", name: "Tecno Servicios", taxId: "NIT-445566", phone: "72222222", address: "Zona Sur" }
  ];
  demo.users = [
    { username: "admin", name: "Administrador", password: "admin", role: "admin", status: "active" },
    { username: "supervisor", name: "Supervisor", password: "1234", role: "supervisor", status: "active" },
    { username: "cajero", name: "Cajero", password: "1234", role: "cashier", status: "active" }
  ];
  demo.categories = [
    { code: "CAT-001", name: "Computo" },
    { code: "CAT-002", name: "Accesorios" },
    { code: "CAT-003", name: "Servicios" }
  ];
  demo.products = [
    { code: "2000000000015", description: "Mouse optico USB", supplier: "PROV-001", category: "CAT-001", unit: "Pieza", cost: 85, price: 149, stock: 14, minStock: 5, service: false },
    { code: "2000000000022", description: "Teclado multimedia", supplier: "PROV-001", category: "CAT-001", unit: "Pieza", cost: 145, price: 249, stock: 8, minStock: 4, service: false },
    { code: "2000000000039", description: "Memoria USB 64GB", supplier: "PROV-002", category: "CAT-002", unit: "Pieza", cost: 55, price: 99, stock: 3, minStock: 4, service: false },
    { code: "SERV-01", description: "Instalacion de software", supplier: "PROV-002", category: "CAT-003", unit: "Servicio", cost: 0, price: 120, stock: 0, minStock: 0, service: true }
  ];
  demo.inventory = [
    { product: "2000000000015", description: "Mouse optico USB", quantity: 20, notes: "Alta inicial de producto" },
    { product: "2000000000022", description: "Teclado multimedia", quantity: 12, notes: "Alta inicial de producto" },
    { product: "2000000000039", description: "Memoria USB 64GB", quantity: 6, notes: "Alta inicial de producto" }
  ];
  demo.supplierInvoices = [
    {
      id: "FACPROV-000001",
      provider: "PROV-001",
      providerName: "Distribuidora Central",
      number: "F-10294",
      entryDate: todayISODate(),
      dueDate: new Date(Date.now() + (5 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10),
      amount: 1240,
      status: "pending",
      notes: "Factura de reposicion de inventario",
      createdAt: new Date().toISOString(),
      createdBy: "admin"
    }
  ];
  demo.cash = {
    openingAmount: 500,
    openedAt,
    cashier: "Vendedor",
    notes: "Turno de prueba",
    lastCut: null,
    currentSessionId: sessionId,
    sessions: [{
      id: sessionId,
      openedAt,
      closedAt: "",
      openingAmount: 500,
      cashier: "Vendedor",
      notes: "Turno de prueba",
      openedBy: "vendedor",
      salesCount: 2,
      cashSales: 398,
      creditSales: 249,
      paidCredits: 100,
      drawerTotal: 998
    }]
  };
  demo.sales = [
    {
      folio: "DSP-000001",
      type: "cash",
      paymentMethod: "cash",
      amountReceived: 400,
      initialPayment: 398,
      changeDue: 2,
      paymentReference: "",
      total: 398,
      items: [
        { code: "2000000000015", description: "Mouse optico USB", price: 149, quantity: 2 },
        { code: "2000000000039", description: "Memoria USB 64GB", price: 99, quantity: 1 }
      ],
      customerCode: "CLI-002",
      customer: "Maria Lopez",
      taxId: "7845123",
      notes: "",
      status: "Vigente",
      returns: [],
      sessionId,
      seller: "Vendedor",
      sellerUsername: "vendedor",
      createdAt: saleOneAt
    },
    {
      folio: "DSP-000002",
      type: "credit",
      paymentMethod: "credit",
      amountReceived: 150,
      initialPayment: 100,
      changeDue: 50,
      paymentReference: "Abono en efectivo",
      total: 249,
      items: [
        { code: "2000000000022", description: "Teclado multimedia", price: 249, quantity: 1 }
      ],
      customerCode: "CLI-003",
      customer: "Tecno Servicios",
      taxId: "NIT-445566",
      notes: "Cliente frecuente",
      status: "Vigente",
      returns: [],
      sessionId,
      seller: "Vendedor",
      sellerUsername: "vendedor",
      createdAt: saleTwoAt
    }
  ];
  demo.credits = [
    {
      id: "DSP-000002",
      customer: "Tecno Servicios",
      total: 249,
      paid: 100,
      balance: 149,
      payments: [
        { amount: 100, sessionId, createdAt: paymentAt }
      ]
    }
  ];
  demo.activeSaleFolio = "DSP-000002";
  demo.activeCut = null;
  return demo;
}

function overwriteState(nextState) {
  Object.keys(state).forEach((key) => delete state[key]);
  Object.assign(state, clone(nextState));
  normalizeState();
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return clone(defaultState);
    return migrateStateSnapshot(unwrapBackupPayload(saved).data);
  } catch {
    return clone(defaultState);
  }
}

function unwrapBackupPayload(value) {
  if (value && typeof value === "object" && !Array.isArray(value) && value.data && typeof value.data === "object") {
    return {
      metadata: {
        app: value.app || APP_NAME,
        appVersion: value.appVersion || "Desconocida",
        schemaVersion: Number(value.schemaVersion || 0),
        exportedAt: value.exportedAt || ""
      },
      data: value.data
    };
  }
  return { metadata: null, data: value };
}

function migrateStateSnapshot(rawSnapshot) {
  const saved = clone(rawSnapshot || {});
  if (saved.business?.name === "Jotas Software Solutions") {
    saved.business.name = APP_NAME;
  }
  saved.sales = (saved.sales || []).map((sale) => ({
    status: "Vigente",
    customer: sale.customer || "Cliente general",
    taxId: sale.taxId || "",
    notes: sale.notes || "",
    returns: sale.returns || [],
    initialPayment: Number(sale.initialPayment ?? sale.total ?? 0),
    ...sale
  }));
  saved.products = (saved.products || defaultState.products).map((product) => ({
    minStock: product.service ? 0 : Number(product.minStock ?? saved.business?.inventory?.defaultMinStock ?? defaultState.business.inventory.defaultMinStock),
    ...product
  }));
  saved.users = (saved.users || defaultState.users).map((user) => ({
    ...user,
    role: user.role === "seller" ? "cashier" : user.role
  }));
  saved.credits = (saved.credits || []).map((credit) => ({
    payments: credit.payments || (credit.paid ? [{ amount: credit.paid, createdAt: new Date().toISOString() }] : []),
    ...credit
  }));
  saved.customers = saved.customers || defaultState.customers;
  saved.paymentMethods = saved.paymentMethods || defaultState.paymentMethods;
  return {
    ...clone(defaultState),
    ...saved,
    business: {
      ...defaultState.business,
      ...saved.business,
      scanner: { ...defaultState.business.scanner, ...saved.business?.scanner },
      inventory: { ...defaultState.business.inventory, ...saved.business?.inventory },
      regional: { ...defaultState.business.regional, ...saved.business?.regional },
      invoiceDesign: { ...defaultState.business.invoiceDesign, ...saved.business?.invoiceDesign }
    },
    cash: { ...defaultState.cash, ...saved.cash },
    backups: { ...defaultState.backups, ...saved.backups, history: saved.backups?.history || [] },
    integrity: { ...defaultState.integrity, ...saved.integrity }
  };
}

function normalizeState() {
  state.currentUser = null;
  state.cash.sessions = state.cash.sessions || [];
  state.business.inventory = { ...defaultState.business.inventory, ...state.business.inventory };
  state.business.scanner = { ...defaultState.business.scanner, ...state.business.scanner };
  state.business.regional = { ...defaultState.business.regional, ...state.business.regional };
  state.business.fiscal = {
    ...defaultState.business.fiscal,
    ...state.business.fiscal,
    sequences: {
      ...defaultState.business.fiscal.sequences,
      ...(state.business.fiscal?.sequences || {})
    }
  };
  state.business.invoiceDesign = { ...defaultState.business.invoiceDesign, ...state.business.invoiceDesign };
  state.supplierInvoices = state.supplierInvoices || [];
  state.audit = state.audit || [];
  state.systemLogs = state.systemLogs || [];
  state.backups = { ...defaultState.backups, ...state.backups, history: state.backups?.history || [] };
  state.integrity = { ...defaultState.integrity, ...state.integrity };
  state.users = (state.users || defaultState.users).map((user) => ({
    ...user,
    role: user.role === "seller" ? "cashier" : user.role
  }));
  state.products = (state.products || []).map((product) => ({
    ...product,
    minStock: product.service ? 0 : Number(product.minStock ?? state.business.inventory.defaultMinStock)
  }));
  if (state.cash.openedAt && !state.cash.sessions.length) {
    const date = state.cash.openedAt.slice(0, 10);
    const legacySession = {
      id: `CAJA-${date}-001`,
      openedAt: state.cash.openedAt,
      closedAt: "",
      openingAmount: Number(state.cash.openingAmount || 0),
      cashier: state.cash.cashier || "Caja migrada",
      notes: state.cash.notes || "",
      openedBy: "legacy",
      salesCount: 0,
      cashSales: 0,
      creditSales: 0,
      paidCredits: 0,
      drawerTotal: Number(state.cash.openingAmount || 0)
    };
    state.cash.sessions.push(legacySession);
    state.cash.currentSessionId = legacySession.id;
  }
  if (state.cash.currentSessionId && !currentCashSession()) {
    state.cash.currentSessionId = "";
  }
  verifyStateIntegrity();
}

function persistState() {
  createAutoBackup();
  verifyStateIntegrity();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function markInstallation() {
  localStorage.setItem(INSTALLATION_KEY, JSON.stringify({
    createdAt: new Date().toISOString(),
    userAgent: navigator.userAgent || ""
  }));
}

function openModal(id) {
  $(id).classList.remove("hidden");
}

function closeModal(id) {
  $(id).classList.add("hidden");
}

function findSale(folio) {
  return state.sales.find((sale) => sale.folio === folio);
}

function currentCashSession() {
  return state.cash.sessions.find((session) => session.id === state.cash.currentSessionId && !session.closedAt);
}

function sessionSales(sessionId) {
  return state.sales.filter((sale) => sale.sessionId === sessionId);
}

function sessionCreditPayments(sessionId) {
  return state.credits.reduce((sum, credit) => sum + (credit.payments || [])
    .filter((payment) => payment.sessionId === sessionId)
    .reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0);
}

function nextCashSessionId(date = todayISODate()) {
  const count = state.cash.sessions.filter((session) => session.id.startsWith(`CAJA-${date}`)).length + 1;
  return `CAJA-${date}-${String(count).padStart(3, "0")}`;
}

function hasOpenCashToday() {
  const session = currentCashSession();
  return Boolean(session && session.openedAt.slice(0, 10) === todayISODate());
}

function roleLabel(role) {
  if (role === "admin") return "Administrador";
  if (role === "supervisor") return "Supervisor";
  if (role === "cashier" || role === "seller") return "Cajero";
  return "Usuario";
}

function productMinStock(product) {
  return Number(product.service ? 0 : (product.minStock ?? state.business.inventory.defaultMinStock ?? 0));
}

function lowStockProducts() {
  if (state.business.inventory.lowStockAlertsEnabled !== "yes") return [];
  return state.products.filter((product) => !product.service && product.stock <= productMinStock(product));
}

function notifyLowStockFromSale(sale) {
  if (state.business.inventory.lowStockAlertsEnabled !== "yes") return;
  const affected = sale.items
    .map((item) => state.products.find((product) => product.code === item.code))
    .filter((product) => product && !product.service && product.stock <= productMinStock(product));
  if (affected.length) {
    showToast(`Stock bajo: ${affected.map((product) => `${product.description} (${product.stock})`).join(", ")}`);
  }
}

function syncCreditPaymentFields() {
  const isCredit = $("paymentMethodSelect").value === "credit";
  $("creditInitialPaymentField").classList.toggle("hidden", !isCredit);
  $("creditCashReceivedField").classList.toggle("hidden", !isCredit);
  $("creditChangeField").classList.toggle("hidden", !isCredit);
}

async function detectBarcodeScanner() {
  if (!("hid" in navigator)) {
    state.business.scanner.hidSupported = false;
    state.business.scanner.hardwareStatus = "Este navegador no permite deteccion directa de hardware. Usa modo teclado.";
    $("scannerStatusText").textContent = state.business.scanner.hardwareStatus;
    persistState();
    return;
  }
  state.business.scanner.hidSupported = true;
  try {
    const devices = await navigator.hid.getDevices();
    if (devices.length) {
      const names = devices.map((device) => device.productName || "Dispositivo HID").join(", ");
      state.business.scanner.hardwareStatus = `Dispositivo HID detectado: ${names}`;
      $("scannerStatusText").textContent = state.business.scanner.hardwareStatus;
      persistState();
      return;
    }
    state.business.scanner.hardwareStatus = "Sin lector autorizado por HID. Prueba con el lector en modo teclado.";
    $("scannerStatusText").textContent = state.business.scanner.hardwareStatus;
    persistState();
  } catch {
    state.business.scanner.hardwareStatus = "No se pudo consultar HID. Usa la prueba por escaneo.";
    $("scannerStatusText").textContent = state.business.scanner.hardwareStatus;
    persistState();
  }
}

const VIEW_SUBTITLES = {
  dashboard: "Resumen general del negocio, caja e indicadores del dia.",
  pos: "Cobro rapido, lectura de codigos y control del carrito actual.",
  customers: "Registro de clientes para facturas, creditos y seguimiento.",
  products: "Catalogo maestro con precios, inventario y codigos de barras.",
  suppliers: "Control de proveedores y origen de mercancia.",
  categories: "Clasificaciones para ordenar el catalogo y reportes.",
  inventory: "Entradas y ajustes para mantener existencias correctas.",
  supplierInvoices: "Registro, vencimiento y seguimiento de facturas de proveedor.",
  credits: "Seguimiento de cuentas por cobrar y abonos.",
  history: "Consulta diaria de ventas, facturas y devoluciones.",
  reports: "Analisis por fecha, metodo de pago y productos vendidos.",
  invoiceDesigner: "Diseno, plantilla Excel y vista previa de factura comercial.",
  users: "Administradores y vendedores autorizados para operar el sistema.",
  backup: "Respaldo e importacion de la informacion del sistema.",
  cash: "Aperturas, cierres e historial de sesiones de caja.",
  settings: "Personalizacion del negocio, tickets y lector de codigos."
};

function activeViewId() {
  return document.querySelector(".nav-item.active")?.dataset.view || "dashboard";
}

function showToast(message) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.add("hidden"), 2600);
}

function handleGlobalError(message, details = {}) {
  const detailText = details?.error?.stack || details?.error?.message || details?.source || "";
  addSystemLog("error", sanitizeText(`${message}${detailText ? ` - ${detailText}` : ""}`, 320), details);
  showToast("Ocurrio un error inesperado. Se registro en logs del sistema.");
  persistState();
}

function showView(viewId) {
  if (!canAccessView(viewId)) {
    addAudit("permission_denied", `view:${viewId}`, {});
    viewId = "pos";
  }
  document.querySelectorAll(".view-section").forEach((section) => section.classList.add("hidden"));
  $(viewId).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewId);
  });
  $("viewTitle").textContent = document.querySelector(`[data-view="${viewId}"]`).textContent;
  renderAll();
  if (viewId === "pos" && state.business.scanner.focusOnSale === "yes") {
    window.setTimeout(() => $("productSearch").focus(), 0);
  }
}

function applyRoleView() {
  const isAdmin = state.currentUser?.role === "admin";
  document.querySelectorAll("[data-view]").forEach((item) => item.classList.toggle("hidden", !canAccessView(item.dataset.view)));
  $("currentUserBadge").textContent = state.currentUser ? `${state.currentUser.name} - ${roleLabel(state.currentUser.role)}` : "Sin sesion";
  document.body.classList.toggle("seller-mode", !isAdmin);
  document.body.classList.toggle("theme-dark", state.business.regional.themeMode === "dark");
  if (!canAccessView(activeViewId())) showView("pos");
}

function formatMoney(value) {
  return money.format(Number(value || 0));
}

function saleSubtotal() {
  return state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function saleTotal() {
  const discount = Number($("discountInput").value || 0);
  return Math.max(0, saleSubtotal() - discount);
}

function validateCartAvailability() {
  for (const item of state.cart) {
    const product = state.products.find((entry) => entry.code === item.code);
    if (!product) return `El producto ${item.code} ya no existe.`;
    if (!product.service && item.quantity > Number(product.stock || 0)) {
      return `${product.description} solo tiene ${product.stock} disponible(s).`;
    }
    if (Number(item.quantity) <= 0 || Number(item.price) < 0) {
      return `La partida ${product.description} tiene cantidad o precio invalido.`;
    }
  }
  return "";
}

function supplierName(code) {
  return state.suppliers.find((supplier) => supplier.code === code)?.name || code;
}

function categoryName(code) {
  return state.categories.find((category) => category.code === code)?.name || code;
}

function customerName(code) {
  return state.customers.find((customer) => customer.code === code)?.name || code || "Cliente general";
}

function paymentMethodName(code) {
  return state.paymentMethods.find((method) => method.code === code)?.name || code || "Efectivo";
}

function nextCode(prefix, list) {
  const max = list.reduce((current, item) => {
    const match = String(item.code || "").match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(3, "0")}`;
}

function ean13Checksum(firstTwelveDigits) {
  const digits = firstTwelveDigits.split("").map(Number);
  const sum = digits.reduce((total, digit, index) => total + digit * (index % 2 === 0 ? 1 : 3), 0);
  return String((10 - (sum % 10)) % 10);
}

function isValidEAN13(code) {
  return /^\d{13}$/.test(code) && ean13Checksum(code.slice(0, 12)) === code.slice(12);
}

function nextProductBarcode() {
  const numericCodes = state.products
    .map((product) => String(product.code))
    .filter((code) => /^20\d{11}$/.test(code))
    .map((code) => Number(code.slice(2, 12)));
  const next = (numericCodes.length ? Math.max(...numericCodes) : 0) + 1;
  const base = `20${String(next).padStart(10, "0")}`;
  return `${base}${ean13Checksum(base)}`;
}

function nextSaleFolio() {
  const prefix = state.business.regional.invoicePrefix || "DSP";
  const max = state.sales.reduce((current, sale) => {
    const match = String(sale.folio || "").match(new RegExp(`^${prefix}-(\\d+)$`));
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `${prefix}-${String(max + 1).padStart(6, "0")}`;
}

function fiscalTypeLabel(type) {
  if (!type || type === "none") return "Sin comprobante";
  return state.business.fiscal.sequences[type]?.name || type;
}

function previewFiscalNumber(type) {
  if (!type || type === "none") return "";
  const sequence = state.business.fiscal.sequences[type];
  if (!sequence) return "";
  return `${sequence.prefix}${String(Number(sequence.next || 1)).padStart(8, "0")}`;
}

function consumeFiscalNumber(type) {
  if (!type || type === "none") return "";
  const sequence = state.business.fiscal.sequences[type];
  if (!sequence) return "";
  const next = Number(sequence.next || 1);
  const end = Number(sequence.end || 99999999);
  if (next > end) {
    throw new Error(`Se agoto la secuencia fiscal ${type}.`);
  }
  const fiscalNumber = `${sequence.prefix}${String(next).padStart(8, "0")}`;
  sequence.next = next + 1;
  return fiscalNumber;
}

function fiscalRequiresCustomerId(type) {
  return ["B01", "B14", "B15"].includes(type);
}

function nextSupplierInvoiceId() {
  const max = state.supplierInvoices.reduce((current, invoice) => {
    const match = String(invoice.id || "").match(/^FACPROV-(\d+)$/);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);
  return `FACPROV-${String(max + 1).padStart(6, "0")}`;
}

function supplierInvoiceDaysLeft(invoice) {
  if (!invoice.dueDate) return null;
  const today = new Date(`${todayISODate()}T00:00:00`);
  const due = new Date(`${invoice.dueDate}T00:00:00`);
  return Math.ceil((due - today) / (24 * 60 * 60 * 1000));
}

function supplierInvoiceAlerts() {
  return state.supplierInvoices
    .filter((invoice) => invoice.status !== "paid")
    .map((invoice) => ({ ...invoice, daysLeft: supplierInvoiceDaysLeft(invoice) }))
    .filter((invoice) => invoice.daysLeft !== null && invoice.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

function renderDashboard() {
  const today = todayISODate();
  const todaySales = state.sales.filter((sale) => sale.createdAt.slice(0, 10) === today);
  const salesTotal = todaySales.reduce((sum, sale) => sum + sale.total, 0);
  const cashTotal = todaySales
    .filter((sale) => sale.type === "cash")
    .reduce((sum, sale) => sum + sale.total, 0);
  const paidCredits = state.credits.reduce((sum, credit) => sum + (credit.payments || [])
    .filter((payment) => payment.createdAt.slice(0, 10) === today)
    .reduce((paymentSum, payment) => paymentSum + payment.amount, 0), 0);
  $("salesMetric").textContent = formatMoney(salesTotal);
  $("productsMetric").textContent = state.products.length;
  $("creditsMetric").textContent = state.credits.filter((credit) => credit.balance > 0).length;
  const openSession = currentCashSession();
  $("cashMetric").textContent = formatMoney((openSession?.openingAmount || 0) + cashTotal + paidCredits);
  const averageTicket = todaySales.length ? salesTotal / todaySales.length : 0;
  const lowStock = lowStockProducts();
  const expiringInvoices = supplierInvoiceAlerts();
  $("dashboardHeroTitle").textContent = openSession
    ? `Caja activa ${openSession.id}`
    : "Operacion pendiente de apertura";
  $("dashboardHeroText").textContent = openSession
    ? `${state.currentUser?.name || "Usuario"} tiene la caja abierta desde ${new Date(openSession.openedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}.`
    : "Abre la caja del dia para habilitar ventas, abonos y seguimiento del turno.";
  $("dashboardHeroStats").innerHTML = `
    <span class="status-pill">${todaySales.length} venta(s) hoy</span>
    <span class="status-pill">${formatMoney(averageTicket)} ticket promedio</span>
    <span class="status-pill">${lowStock.length} producto(s) con stock bajo</span>
  `;
  $("dashboardAlerts").innerHTML = [
    openSession
      ? `<div class="compact-row emphasis"><div><strong>Caja abierta</strong><span>${openSession.cashier || "Sin asignar"} - ${formatMoney(openSession.openingAmount)} inicial</span></div><strong>${openSession.id}</strong></div>`
      : `<div class="compact-row emphasis"><div><strong>Caja pendiente</strong><span>No hay una caja activa para este turno.</span></div><strong>Abrir</strong></div>`,
    lowStock.length
      ? `<div class="compact-row"><div><strong>Stock bajo</strong><span>${lowStock.slice(0, 3).map((product) => `${product.description} (${product.stock}/${productMinStock(product)})`).join(" | ")}</span></div><strong>${lowStock.length}</strong></div>`
      : `<div class="compact-row"><div><strong>Inventario estable</strong><span>No hay productos criticos por debajo del minimo visual.</span></div><strong>OK</strong></div>`,
    `<div class="compact-row"><div><strong>Creditos abiertos</strong><span>${state.credits.filter((credit) => credit.balance > 0).length} cuenta(s) pendientes de cobro.</span></div><strong>${formatMoney(state.credits.reduce((sum, credit) => sum + credit.balance, 0))}</strong></div>`,
    expiringInvoices.length
      ? `<div class="compact-row"><div><strong>Facturas por expirar</strong><span>${expiringInvoices.slice(0, 2).map((invoice) => `${invoice.number} (${invoice.daysLeft} dia(s))`).join(" | ")}</span></div><strong>${expiringInvoices.length}</strong></div>`
      : `<div class="compact-row"><div><strong>Facturas de proveedor</strong><span>No hay vencimientos criticos en los proximos 7 dias.</span></div><strong>OK</strong></div>`
  ].join("");

  $("recentSales").innerHTML = state.sales.slice(-5).reverse().map((sale) => `
    <div class="compact-row">
      <div>
        <strong>${sale.folio}</strong>
        <span>${sale.type === "cash" ? "Efectivo" : "Credito"} - ${sale.status || "Vigente"}</span>
      </div>
      <strong>${formatMoney(sale.total)}</strong>
    </div>
  `).join("") || "<span>No hay ventas registradas.</span>";
  const activityPanel = $("recentActivity");
  if (activityPanel) {
    activityPanel.innerHTML = (state.audit || []).slice(0, 8).map((entry) => `
      <div class="compact-row">
        <div>
          <strong>${escapeHtml(entry.action.replace(/_/g, " "))}</strong>
          <span>${escapeHtml(entry.userName)} - ${new Date(entry.createdAt).toLocaleString("es-MX")}</span>
        </div>
        <strong>${escapeHtml(entry.entity)}</strong>
      </div>
    `).join("") || "<span>No hay actividad registrada.</span>";
  }
}

function renderChrome() {
  const viewId = activeViewId();
  const openSession = currentCashSession();
  const cartItems = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  const lowStockCount = lowStockProducts().length;
  $("viewSubtitle").textContent = VIEW_SUBTITLES[viewId] || "Operacion del sistema.";
  $("workspaceStatus").innerHTML = `
    <span class="workspace-chip ${openSession ? "ok" : "warn"}">${openSession ? `Caja ${openSession.id}` : "Caja cerrada"}</span>
    <span class="workspace-chip ${state.business.scanner.enabled === "yes" ? "ok" : ""}">${state.business.scanner.enabled === "yes" ? "Lector activo" : "Lector inactivo"}</span>
    <span class="workspace-chip ${lowStockCount ? "warn" : "ok"}">${lowStockCount ? `${lowStockCount} alertas de stock` : "Stock estable"}</span>
    <span class="workspace-chip">${cartItems} articulo(s) en carrito</span>
  `;
}

function renderOptions() {
  $("productSupplier").innerHTML = state.suppliers.map((supplier) => `<option value="${escapeHtml(supplier.code)}">${escapeHtml(supplier.name)}</option>`).join("");
  $("productCategory").innerHTML = state.categories.map((category) => `<option value="${escapeHtml(category.code)}">${escapeHtml(category.name)}</option>`).join("");
  $("inventoryProduct").innerHTML = state.products.map((product) => `<option value="${escapeHtml(product.code)}">${escapeHtml(product.description)}</option>`).join("");
  $("saleCustomerSelect").innerHTML = state.customers.map((customer) => `<option value="${escapeHtml(customer.code)}">${escapeHtml(customer.name)}</option>`).join("");
  $("cashCustomerSelect").innerHTML = `<option value="">Cliente rapido / sin registrar</option>${state.customers.map((customer) => `<option value="${escapeHtml(customer.code)}">${escapeHtml(customer.name)}</option>`).join("")}`;
  $("paymentCustomerSelect").innerHTML = state.customers.map((customer) => `<option value="${escapeHtml(customer.code)}">${escapeHtml(customer.name)}</option>`).join("");
  $("supplierInvoiceProvider").innerHTML = state.suppliers.map((supplier) => `<option value="${escapeHtml(supplier.code)}">${escapeHtml(supplier.name)}</option>`).join("");
  $("paymentMethodSelect").innerHTML = state.paymentMethods.map((method) => `<option value="${escapeHtml(method.code)}">${escapeHtml(method.name)}</option>`).join("");
  $("creditSelect").innerHTML = state.credits
    .filter((credit) => credit.balance > 0)
    .map((credit) => `<option value="${escapeHtml(credit.id)}">${escapeHtml(credit.customer)} - ${formatMoney(credit.balance)}</option>`)
    .join("");
}

function renderProducts() {
  $("productTable").innerHTML = state.products.map((product) => `
    <div class="table-row">
      <strong>${product.code}</strong>
      <div>
        <strong>${product.description}</strong>
        <span>${supplierName(product.supplier)} - ${categoryName(product.category)}</span>
      </div>
      <span>${product.service ? "Servicio" : `${product.stock} ${product.unit} / Min ${productMinStock(product)}`}</span>
      <div class="history-actions">
        <strong>${formatMoney(product.price)}</strong>
        <button class="mini-action" data-edit-product="${product.code}">Editar</button>
        <button class="mini-action warn" data-delete-product="${product.code}">Eliminar</button>
      </div>
    </div>
  `).join("");
}

function renderCustomers() {
  $("customerTable").innerHTML = state.customers.map((customer) => `
    <div class="table-row supplier">
      <strong>${customer.code}</strong>
      <div>
        <strong>${customer.name}</strong>
        <span>${customer.taxId || "Sin referencia fiscal"} - ${customer.address || "Sin direccion"}</span>
      </div>
      <div class="history-actions">
        <button class="mini-action" data-edit-customer="${customer.code}">Editar</button>
        <button class="mini-action warn" data-delete-customer="${customer.code}">Eliminar</button>
      </div>
    </div>
  `).join("");
}

function renderSuppliers() {
  $("supplierTable").innerHTML = state.suppliers.map((supplier) => `
    <div class="table-row supplier">
      <strong>${supplier.code}</strong>
      <span>${supplier.name}</span>
      <span>${supplier.phone || "Sin telefono"}</span>
    </div>
  `).join("");
}

function renderCategories() {
  $("categoryTable").innerHTML = state.categories.map((category) => `
    <div class="table-row category">
      <strong>${category.code}</strong>
      <span>${category.name}</span>
      <div class="history-actions">
        <button class="mini-action" data-edit-category="${category.code}">Editar</button>
        <button class="mini-action warn" data-delete-category="${category.code}">Eliminar</button>
      </div>
    </div>
  `).join("");
}

function renderProductResults() {
  const query = $("productSearch").value.trim().toLowerCase();
  const products = state.products.filter((product) => {
    if (!query) return true;
    return product.code.toLowerCase().includes(query) || product.description.toLowerCase().includes(query);
  }).slice(0, 8);

  $("productResults").innerHTML = products.map((product) => `
    <div class="product-card">
      <div>
        <strong>${product.description}</strong>
        <span>${product.code} - Existencia: ${product.service ? "N/A" : `${product.stock} / Min ${productMinStock(product)}`}</span>
      </div>
      <strong>${formatMoney(product.price)}</strong>
      <button class="secondary-action" data-add="${product.code}">Agregar</button>
    </div>
  `).join("") || "<span>No se encontraron productos.</span>";
}

function handleBarcodeScan(rawCode) {
  const code = rawCode.trim();
  if (state.business.scanner.enabled !== "yes") return false;
  if (code.length < Number(state.business.scanner.minLength || 3)) return false;
  const product = state.products.find((item) => String(item.code).toLowerCase() === code.toLowerCase());
  $("productSearch").value = code;
  renderProductResults();
  if (!product) {
    showToast("Codigo no encontrado en productos.");
    return false;
  }
  if (state.business.scanner.autoAdd === "yes") {
    addProductToCart(product.code);
    $("productSearch").value = "";
    renderProductResults();
    showToast(`${product.description} agregado.`);
  }
  return true;
}

function renderCart() {
  const isCredit = state.payType === "credit";
  $("cartItems").innerHTML = state.cart.map((item) => `
    <div class="cart-row">
      <div>
        <strong>${item.description}</strong>
        <span>${item.code}</span>
      </div>
      <input type="number" min="1" value="${item.quantity}" data-qty="${item.code}">
      <strong>${formatMoney(item.price * item.quantity)}</strong>
      <button class="icon-button" title="Quitar" data-remove="${item.code}">X</button>
    </div>
  `).join("") || "<span>Agrega productos para iniciar una venta.</span>";

  $("subtotalText").textContent = formatMoney(saleSubtotal());
  $("totalText").textContent = formatMoney(saleTotal());
  $("creditFields").classList.toggle("hidden", !isCredit);
  $("cashCustomerFields").classList.toggle("hidden", isCredit);
  const openSession = currentCashSession();
  const itemCount = state.cart.reduce((sum, item) => sum + item.quantity, 0);
  $("posStatusBar").innerHTML = `
    <span class="status-pill ${openSession ? "" : "warn"}">${openSession ? `Caja ${openSession.id}` : "Caja cerrada"}</span>
    <span class="status-pill">${itemCount} pieza(s) en venta</span>
    <span class="status-pill">${formatMoney(saleTotal())} total actual</span>
    <span class="status-pill">${state.payType === "credit" ? "Modo credito" : "Modo efectivo"}</span>
  `;
  $("finishSaleButton").disabled = !state.cart.length;
  $("closeCashFromPosButton").disabled = !openSession;
}

function renderInventory() {
  $("inventoryStockTable").innerHTML = state.products
    .filter((product) => !product.service)
    .slice()
    .sort((a, b) => a.description.localeCompare(b.description))
    .map((product) => `
      <div class="table-row supplier">
        <strong>${product.code}</strong>
        <div>
          <strong>${product.description}</strong>
          <span>${categoryName(product.category)} - ${supplierName(product.supplier)}</span>
        </div>
        <strong>${product.stock} ${product.unit}</strong>
      </div>
    `).join("") || "<span>No hay productos inventariables.</span>";
  $("inventoryTable").innerHTML = state.inventory.slice().reverse().map((entry) => `
    <div class="table-row">
      <strong>${entry.product}</strong>
      <div>
        <strong>${entry.description}</strong>
        <span>Stock actual: ${state.products.find((product) => product.code === entry.product)?.stock ?? 0}</span>
      </div>
      <strong>+${entry.quantity}</strong>
      <span>${entry.notes || "Entrada"}</span>
    </div>
  `).join("") || "<span>No hay movimientos de inventario.</span>";
}

function renderSupplierInvoices() {
  const alerts = supplierInvoiceAlerts();
  $("supplierInvoiceAlerts").innerHTML = alerts.map((invoice) => `
    <div class="compact-row ${invoice.daysLeft < 0 ? "danger-row" : "warn"}">
      <div>
        <strong>${escapeHtml(invoice.number)} - ${escapeHtml(invoice.providerName)}</strong>
        <span>${invoice.daysLeft < 0 ? "Vencida hace" : "Expira en"} ${Math.abs(invoice.daysLeft)} dia(s), vence ${invoice.dueDate}</span>
      </div>
      <strong>${formatMoney(invoice.amount)}</strong>
    </div>
  `).join("") || "<span>No hay facturas proximas a vencer.</span>";

  $("supplierInvoiceTable").innerHTML = state.supplierInvoices.slice().reverse().map((invoice) => {
    const daysLeft = supplierInvoiceDaysLeft(invoice);
    const statusLabel = invoice.status === "paid" ? "Pagada" : daysLeft < 0 ? "Vencida" : "Pendiente";
    return `
      <div class="table-row supplier-invoice-row">
        <strong>${escapeHtml(invoice.number)}</strong>
        <div>
          <strong>${escapeHtml(invoice.providerName)}</strong>
          <span>Ingreso: ${invoice.entryDate || "Sin fecha"} | Expira: ${invoice.dueDate || "Sin fecha"}</span>
        </div>
        <span>${statusLabel}</span>
        <strong>${formatMoney(invoice.amount)}</strong>
        <div class="history-actions">
          <button class="mini-action" data-edit-supplier-invoice="${invoice.id}">Editar</button>
          <button class="mini-action warn" data-delete-supplier-invoice="${invoice.id}">Eliminar</button>
        </div>
      </div>
    `;
  }).join("") || "<span>No hay facturas de proveedor registradas.</span>";
}

function renderCredits() {
  $("creditsTable").innerHTML = state.credits.map((credit) => `
    <div class="table-row credit">
      <div>
        <strong>${credit.customer}</strong>
        <span>${credit.id}</span>
      </div>
      <strong>${formatMoney(credit.total)}</strong>
      <span>Abonado: ${formatMoney(credit.paid)}</span>
      <strong>${formatMoney(credit.balance)}</strong>
    </div>
  `).join("") || "<span>No hay creditos abiertos.</span>";
}

function renderHistory() {
  const date = $("historyDateInput").value || todayISODate();
  $("historyDateInput").value = date;
  const sales = state.sales.filter((sale) => sale.createdAt.slice(0, 10) === date);
  const total = sales.reduce((sum, sale) => sum + sale.total, 0);
  const returned = sales.reduce((sum, sale) => sum + (sale.returns || []).reduce((retSum, item) => retSum + item.amount, 0), 0);
  const averageTicket = sales.length ? total / sales.length : 0;
  $("historySummary").innerHTML = `
    <article class="metric"><span>Ventas del dia</span><strong>${sales.length}</strong></article>
    <article class="metric"><span>Total vendido</span><strong>${formatMoney(total)}</strong></article>
    <article class="metric"><span>Devoluciones</span><strong>${formatMoney(returned)}</strong></article>
    <article class="metric"><span>Ticket promedio</span><strong>${formatMoney(averageTicket)}</strong></article>
  `;
  $("historyTable").innerHTML = sales.slice().reverse().map((sale) => `
    <div class="table-row history">
      <strong>${sale.folio}</strong>
      <div>
        <strong>${sale.customer || "Cliente general"}</strong>
        <span>${new Date(sale.createdAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })} - ${paymentMethodName(sale.paymentMethod)} - ${sale.seller || "Sin vendedor"} - ${sale.status || "Vigente"}</span>
      </div>
      <span>${sale.items.length} partidas</span>
      <strong>${formatMoney(sale.total)}</strong>
      <div class="history-actions">
        <button class="mini-action" data-reprint="${sale.folio}">Factura</button>
        <button class="mini-action" data-edit-invoice="${sale.folio}">Editar</button>
        <button class="mini-action warn" data-return="${sale.folio}">Devolucion</button>
      </div>
    </div>
  `).join("") || "<span>No hay ventas en la fecha seleccionada.</span>";
}

function renderReports() {
  const date = $("reportDateInput").value || todayISODate();
  $("reportDateInput").value = date;
  const sales = state.sales.filter((sale) => sale.createdAt.slice(0, 10) === date);
  const total = sales.reduce((sum, sale) => sum + sale.total, 0);
  const returns = sales.reduce((sum, sale) => sum + (sale.returns || []).reduce((retSum, item) => retSum + item.amount, 0), 0);
  const credits = sales.filter((sale) => sale.type === "credit").reduce((sum, sale) => sum + sale.total, 0);
  const averageTicket = sales.length ? total / sales.length : 0;
  $("reportsSummary").innerHTML = `
    <article class="metric"><span>Total vendido</span><strong>${formatMoney(total)}</strong></article>
    <article class="metric"><span>Ventas</span><strong>${sales.length}</strong></article>
    <article class="metric"><span>Credito</span><strong>${formatMoney(credits)}</strong></article>
    <article class="metric"><span>Devoluciones</span><strong>${formatMoney(returns)}</strong></article>
    <article class="metric"><span>Ticket promedio</span><strong>${formatMoney(averageTicket)}</strong></article>
  `;
  const byPayment = {};
  sales.forEach((sale) => {
    const key = sale.paymentMethod || sale.type;
    byPayment[key] = (byPayment[key] || 0) + sale.total;
  });
  $("paymentReportTable").innerHTML = Object.entries(byPayment).map(([code, amount]) => `
    <div class="compact-row"><span>${paymentMethodName(code)}</span><strong>${formatMoney(amount)}</strong></div>
  `).join("") || "<span>No hay ventas.</span>";
  const byProduct = {};
  sales.forEach((sale) => sale.items.forEach((item) => {
    byProduct[item.code] = byProduct[item.code] || { description: item.description, quantity: 0, amount: 0 };
    byProduct[item.code].quantity += item.quantity;
    byProduct[item.code].amount += item.quantity * item.price;
  }));
  const products = Object.entries(byProduct).sort((a, b) => b[1].quantity - a[1].quantity);
  $("productReportTable").innerHTML = products.map(([code, item]) => `
    <div class="table-row">
      <strong>${code}</strong>
      <span>${item.description}</span>
      <span>${item.quantity} vendido(s)</span>
      <strong>${formatMoney(item.amount)}</strong>
    </div>
  `).join("") || "<span>No hay productos vendidos.</span>";
}

function renderInvoiceDesigner() {
  const design = state.business.invoiceDesign;
  $("invoiceDesignTitle").value = design.title;
  $("invoiceDesignSeries").value = design.series;
  $("invoiceDesignShowLogo").value = design.showLogo;
  $("invoiceDesignShowQr").value = design.showQr;
  $("invoiceDesignShowTax").value = design.showTax;
  $("invoiceDesignFormat").value = design.format;
  $("invoiceDesignMode").value = design.mode || "standard";
  $("invoiceDesignLegalText").value = design.legalText;
  $("invoiceCustomHtml").value = design.customHtml || defaultCustomInvoiceHtml();
  $("invoiceCustomCss").value = design.customCss || defaultCustomInvoiceCss();
  $("invoiceTemplateStatus").innerHTML = design.excelTemplate
    ? `<span class="workspace-chip ok">Excel: ${escapeHtml(design.excelTemplate.name)}</span><span class="workspace-chip">${Math.round((design.excelTemplate.size || 0) / 1024)} KB</span><span class="workspace-chip">${(design.excelTemplate.placeholders || []).length} campos detectados</span>${design.logoDataUrl ? `<span class="workspace-chip ok">Logo cargado</span>` : ""}`
    : `<span class="workspace-chip warn">Sin plantilla Excel importada</span>`;
  if ((design.mode || "standard") === "custom") {
    $("invoiceDesignPreview").innerHTML = renderCustomInvoiceTemplate(sampleInvoiceContext(), true);
    return;
  }
  if (design.excelTemplate?.sheets?.[0]?.rows?.length) {
    $("invoiceDesignPreview").innerHTML = renderImportedTemplatePreview(design.excelTemplate);
    return;
  }
  $("invoiceDesignPreview").innerHTML = `
    <div class="ticket-paper invoice-design-sample">
      <div class="invoice-head">
        <div>
          <strong>${escapeHtml(design.title || "Factura")}</strong>
          <div class="invoice-meta">${escapeHtml(state.business.name)}</div>
          <div class="invoice-meta">Serie ${escapeHtml(design.series || "A")} | ${state.business.regional.invoicePrefix}-000001</div>
        </div>
        <strong>${design.showLogo === "yes" ? "LOGO" : ""}</strong>
      </div>
      <div class="invoice-line"><span>Subtotal</span><strong>${formatMoney(120)}</strong></div>
      ${design.showTax === "yes" ? `<div class="invoice-line"><span>${escapeHtml(state.business.regional.taxName)} ${Number(state.business.regional.taxRate || 0) * 100}%</span><strong>${formatMoney(120 * Number(state.business.regional.taxRate || 0))}</strong></div>` : ""}
      <div class="invoice-total"><span>Total</span><strong>${formatMoney(120 + (design.showTax === "yes" ? 120 * Number(state.business.regional.taxRate || 0) : 0))}</strong></div>
      <div class="invoice-meta">${escapeHtml(design.legalText || state.business.ticketFooterText || "Gracias por su compra")}</div>
      ${design.showQr === "yes" ? `<div class="qr-placeholder">QR</div>` : ""}
    </div>
  `;
}

function defaultCustomInvoiceHtml() {
  return `<div class="custom-invoice">
  <header class="custom-header">
    <div>{{logo}}</div>
    <div>
      <h1>{{empresa}}</h1>
      <p>{{direccion}}</p>
      <p>{{telefono}}</p>
    </div>
    <div class="invoice-number">
      <strong>Factura</strong>
      <span>{{factura}}</span>
      <span>{{ncf}}</span>
      <small>{{comprobante_fiscal}}</small>
      <small>{{fecha}}</small>
    </div>
  </header>

  <section class="client-box">
    <strong>Cliente</strong>
    <span>{{cliente}}</span>
    <span>{{metodo_pago}}</span>
  </section>

  {{productos_tabla}}

  <section class="totals-box">
    <div><span>Subtotal</span><strong>{{subtotal}}</strong></div>
    <div><span>Impuesto</span><strong>{{itbis}}</strong></div>
    <div class="grand-total"><span>Total</span><strong>{{total}}</strong></div>
  </section>

  <footer>{{nota}}</footer>
</div>`;
}

function defaultCustomInvoiceCss() {
  return `.custom-invoice { font-family: Arial, sans-serif; color: #111827; padding: 24px; }
.custom-header { display: grid; grid-template-columns: 110px 1fr 160px; gap: 16px; align-items: start; border-bottom: 2px solid #111827; padding-bottom: 16px; }
.custom-header h1 { margin: 0 0 6px; font-size: 24px; }
.custom-header p { margin: 2px 0; color: #4b5563; }
.invoice-number { text-align: right; display: grid; gap: 4px; }
.invoice-logo { max-width: 96px; max-height: 96px; object-fit: contain; }
.client-box { display: grid; gap: 4px; margin: 18px 0; padding: 12px; border: 1px solid #d1d5db; }
.items-table { width: 100%; border-collapse: collapse; margin-top: 12px; }
.items-table th, .items-table td { border-bottom: 1px solid #e5e7eb; padding: 10px; text-align: left; }
.items-table th:last-child, .items-table td:last-child { text-align: right; }
.totals-box { width: 260px; margin: 18px 0 0 auto; display: grid; gap: 8px; }
.totals-box div { display: flex; justify-content: space-between; }
.grand-total { border-top: 2px solid #111827; padding-top: 10px; font-size: 18px; }
footer { margin-top: 28px; color: #4b5563; }`;
}

function sampleInvoiceContext() {
  return {
    logo: state.business.invoiceDesign.logoDataUrl ? `<img class="invoice-logo" src="${state.business.invoiceDesign.logoDataUrl}" alt="Logo">` : "",
    cliente: "Cliente de ejemplo",
    fecha: new Date().toLocaleDateString("es-MX"),
    productos: "2 x Cafe Premium - $300.00\n1 x Azucar - $75.00",
    productos_tabla: renderProductsTable([
      { quantity: 2, description: "Cafe Premium", price: 150 },
      { quantity: 1, description: "Azucar", price: 75 }
    ]),
    subtotal: formatMoney(375),
    itbis: formatMoney(67.5),
    impuesto: formatMoney(67.5),
    total: formatMoney(442.5),
    metodo_pago: "Efectivo",
    telefono: state.business.phone || "809-000-0000",
    direccion: state.business.address || "Direccion del negocio",
    empresa: state.business.name || "Daryez Smart Point",
    factura: `${state.business.regional.invoicePrefix}-000001`,
    serie: state.business.invoiceDesign.series || "A",
    ncf: previewFiscalNumber(state.business.fiscal.defaultType),
    comprobante_fiscal: fiscalTypeLabel(state.business.fiscal.defaultType),
    tipo_comprobante: state.business.fiscal.defaultType || "none",
    rnc_empresa: state.business.fiscal.issuerRnc || "",
    rnc_cliente: "000000000",
    cajero: state.currentUser?.name || state.currentUser?.username || "Administrador"
  };
}

function renderImportedTemplatePreview(template) {
  const rows = template.sheets[0].rows.slice(0, 18);
  return `
    <div class="ticket-paper invoice-design-sample imported-template-sample">
      <div class="invoice-meta">Vista previa desde Excel: ${escapeHtml(template.sheets[0].name || "Hoja 1")}</div>
      ${renderTemplateRows(rows, sampleInvoiceContext(), { preview: true })}
    </div>
  `;
}

function invoiceTemplateContext(sale, subtotal, taxAmount) {
  const products = sale.items.map((item) => `${item.quantity} x ${item.description} - ${formatMoney(item.price * item.quantity)}`);
  return {
    logo: state.business.invoiceDesign.logoDataUrl ? `<img class="invoice-logo" src="${state.business.invoiceDesign.logoDataUrl}" alt="Logo">` : "",
    cliente: sale.customer || "Cliente general",
    fecha: new Date(sale.createdAt).toLocaleString("es-MX"),
    productos: products.join("\n"),
    productos_tabla: renderProductsTable(sale.items),
    subtotal: formatMoney(subtotal),
    itbis: formatMoney(taxAmount),
    impuesto: formatMoney(taxAmount),
    total: formatMoney(sale.total),
    metodo_pago: paymentMethodName(sale.paymentMethod),
    telefono: state.business.phone || "",
    direccion: state.business.address || "",
    empresa: state.business.name || "Daryez Smart Point",
    factura: sale.folio,
    serie: state.business.invoiceDesign.series || "A",
    ncf: sale.fiscalNumber || "",
    comprobante_fiscal: sale.fiscalReceiptName || fiscalTypeLabel(sale.fiscalReceiptType),
    tipo_comprobante: sale.fiscalReceiptType || "none",
    rnc_empresa: sale.fiscalIssuerId || state.business.fiscal.issuerRnc || "",
    rnc_cliente: sale.taxId || "",
    cajero: sale.cashier || state.currentUser?.name || state.currentUser?.username || "",
    rnc: state.business.taxId || sale.taxId || "",
    nota: sale.notes || state.business.invoiceDesign.legalText || state.business.ticketFooterText || ""
  };
}

function renderProductsTable(items) {
  return `
    <table class="items-table">
      <thead>
        <tr><th>Cant.</th><th>Descripcion</th><th>Precio</th><th>Total</th></tr>
      </thead>
      <tbody>
        ${items.map((item) => `
          <tr>
            <td>${escapeHtml(item.quantity)}</td>
            <td>${escapeHtml(item.description)}</td>
            <td>${formatMoney(item.price)}</td>
            <td>${formatMoney(item.price * item.quantity)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function sanitizeTemplateHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "")
    .replace(/javascript:/gi, "");
}

function renderRichTemplateValue(value, context) {
  return sanitizeTemplateHtml(value).replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
    const resolved = context[key] ?? "";
    if (key === "logo" || key === "productos_tabla") return String(resolved);
    return escapeHtml(String(resolved)).replace(/\n/g, "<br>");
  });
}

function renderCustomInvoiceTemplate(context, preview = false) {
  const design = state.business.invoiceDesign;
  const html = renderRichTemplateValue(design.customHtml || defaultCustomInvoiceHtml(), context);
  const css = sanitizeTemplateHtml(design.customCss || defaultCustomInvoiceCss());
  return `
    <div class="ticket-paper custom-invoice-paper ${preview ? "invoice-design-sample" : ""}">
      <style>${css}</style>
      ${html}
    </div>
  `;
}

function renderTemplateValue(value, context) {
  return escapeHtml(value || "").replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
    const resolved = context[key] ?? "";
    return escapeHtml(String(resolved)).replace(/\n/g, "<br>");
  });
}

function renderTemplateRows(rows, context, options = {}) {
  const renderedRows = [];
  rows.forEach((row) => {
    const normalized = row.map((cell) => String(cell || "").trim());
    if (normalized.some((cell) => /^{{\s*productos\s*}}$/i.test(cell))) {
      const productLines = String(context.productos || "").split("\n").filter(Boolean);
      productLines.forEach((line) => {
        renderedRows.push(`<tr><td colspan="${Math.max(row.length, 1)}">${escapeHtml(line)}</td></tr>`);
      });
      return;
    }
    if (!options.preview && normalized.every((cell) => !cell)) return;
    renderedRows.push(`<tr>${row.map((cell) => `<td>${renderTemplateValue(cell, context)}</td>`).join("")}</tr>`);
  });
  return `<table class="imported-invoice-table">${renderedRows.join("")}</table>`;
}

function renderImportedInvoiceTemplate(sale, subtotal, taxAmount) {
  const template = state.business.invoiceDesign.excelTemplate;
  const sheet = template?.sheets?.[0];
  if (!sheet?.rows?.length) return false;
  const context = invoiceTemplateContext(sale, subtotal, taxAmount);
  $("invoicePreview").innerHTML = `
    <div class="ticket-paper imported-invoice-paper">
      ${renderTemplateRows(sheet.rows, context)}
    </div>
  `;
  return true;
}

function renderCustomInvoiceForSale(sale, subtotal, taxAmount) {
  if ((state.business.invoiceDesign.mode || "standard") !== "custom") return false;
  $("invoicePreview").innerHTML = renderCustomInvoiceTemplate(invoiceTemplateContext(sale, subtotal, taxAmount));
  return true;
}

function findZipEnd(buffer) {
  const view = new DataView(buffer);
  for (let offset = buffer.byteLength - 22; offset >= 0; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  throw new Error("El archivo Excel no parece ser un .xlsx valido.");
}

async function inflateRaw(bytes) {
  if (!("DecompressionStream" in window)) {
    throw new Error("Tu navegador no soporta lectura directa de .xlsx. Usa Chrome o Edge actualizado.");
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntries(buffer) {
  const view = new DataView(buffer);
  const endOffset = findZipEnd(buffer);
  const entriesCount = view.getUint16(endOffset + 10, true);
  let centralOffset = view.getUint32(endOffset + 16, true);
  const decoder = new TextDecoder();
  const entries = {};

  for (let index = 0; index < entriesCount; index += 1) {
    if (view.getUint32(centralOffset, true) !== 0x02014b50) break;
    const compression = view.getUint16(centralOffset + 10, true);
    const compressedSize = view.getUint32(centralOffset + 20, true);
    const nameLength = view.getUint16(centralOffset + 28, true);
    const extraLength = view.getUint16(centralOffset + 30, true);
    const commentLength = view.getUint16(centralOffset + 32, true);
    const localOffset = view.getUint32(centralOffset + 42, true);
    const name = decoder.decode(new Uint8Array(buffer, centralOffset + 46, nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const compressed = new Uint8Array(buffer, dataStart, compressedSize);
    let data;
    if (compression === 0) {
      data = compressed;
    } else if (compression === 8) {
      data = await inflateRaw(compressed);
    } else {
      throw new Error(`Compresion no soportada dentro del Excel: ${compression}`);
    }
    entries[name] = decoder.decode(data);
    centralOffset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function parseXml(text) {
  return new DOMParser().parseFromString(text, "application/xml");
}

function columnIndex(cellRef) {
  const letters = String(cellRef || "").replace(/[0-9]/g, "");
  return letters.split("").reduce((sum, letter) => sum * 26 + letter.charCodeAt(0) - 64, 0) - 1;
}

function extractSharedStrings(entries) {
  const xml = entries["xl/sharedStrings.xml"];
  if (!xml) return [];
  return [...parseXml(xml).querySelectorAll("si")].map((item) => [...item.querySelectorAll("t")].map((node) => node.textContent || "").join(""));
}

function extractSheetNames(entries) {
  const workbook = entries["xl/workbook.xml"];
  if (!workbook) return ["Hoja 1"];
  return [...parseXml(workbook).querySelectorAll("sheet")].map((sheet) => sheet.getAttribute("name") || "Hoja");
}

function cellText(cell, sharedStrings) {
  const type = cell.getAttribute("t");
  if (type === "s") {
    const index = Number(cell.querySelector("v")?.textContent || 0);
    return sharedStrings[index] || "";
  }
  if (type === "inlineStr") {
    return [...cell.querySelectorAll("t")].map((node) => node.textContent || "").join("");
  }
  return cell.querySelector("v")?.textContent || "";
}

function parseWorksheet(xml, sharedStrings) {
  return [...parseXml(xml).querySelectorAll("sheetData row")].map((row) => {
    const values = [];
    [...row.querySelectorAll("c")].forEach((cell) => {
      const index = Math.max(columnIndex(cell.getAttribute("r")), values.length);
      values[index] = cellText(cell, sharedStrings);
    });
    return values.map((value) => value || "");
  }).filter((row) => row.some((cell) => String(cell || "").trim()));
}

function detectTemplatePlaceholders(rows) {
  const matches = JSON.stringify(rows).match(/{{\s*[\w.]+\s*}}/g) || [];
  return [...new Set(matches.map((item) => item.replace(/[{}]/g, "").trim()))];
}

async function parseXlsxTemplate(file) {
  if (!/\.xlsx$/i.test(file.name)) {
    throw new Error("Por ahora la lectura automatica usa .xlsx. Guarda tu factura como .xlsx e importala de nuevo.");
  }
  const entries = await readZipEntries(await file.arrayBuffer());
  const sharedStrings = extractSharedStrings(entries);
  const names = extractSheetNames(entries);
  const sheetKeys = Object.keys(entries).filter((key) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(key)).sort();
  const sheets = sheetKeys.map((key, index) => ({
    name: names[index] || `Hoja ${index + 1}`,
    rows: parseWorksheet(entries[key], sharedStrings)
  })).filter((sheet) => sheet.rows.length);
  if (!sheets.length) throw new Error("No se encontraron celdas utilizables en la plantilla.");
  return {
    sheets,
    placeholders: detectTemplatePlaceholders(sheets.map((sheet) => sheet.rows))
  };
}

function renderUsers() {
  $("usersTable").innerHTML = state.users.map((user) => `
    <div class="table-row supplier">
      <strong>${escapeHtml(user.username)}</strong>
      <div>
        <strong>${escapeHtml(user.name)}</strong>
        <span>${roleLabel(user.role)} - ${user.status === "active" ? "Activo" : "Inactivo"}</span>
      </div>
      <div class="history-actions">
        <button class="mini-action" data-edit-user="${escapeHtml(user.username)}">Editar</button>
        <button class="mini-action warn" data-delete-user="${escapeHtml(user.username)}">Eliminar</button>
      </div>
    </div>
  `).join("") || "<span>No hay usuarios registrados.</span>";
}

function renderCash() {
  const openSession = currentCashSession();
  const sales = openSession ? sessionSales(openSession.id) : [];
  const cashSales = sales.filter((sale) => sale.type === "cash");
  const creditSales = sales.filter((sale) => sale.type === "credit");
  const cashTotal = cashSales.reduce((sum, sale) => sum + sale.total, 0);
  const creditTotal = creditSales.reduce((sum, sale) => sum + sale.total, 0);
  const paidCredits = openSession ? sessionCreditPayments(openSession.id) : 0;
  const drawerTotal = (openSession?.openingAmount || 0) + cashTotal + paidCredits;
  $("openingCashInput").value = openSession?.openingAmount || state.cash.openingAmount || 0;
  $("cashierInput").value = openSession?.cashier || state.cash.cashier;
  $("cashNotesInput").value = openSession?.notes || state.cash.notes;
  $("cashSummary").innerHTML = `
    <div class="cash-card"><span>Estado</span><strong>${openSession ? "Abierta" : "Cerrada"}</strong></div>
    <div class="cash-card"><span>Monto inicial</span><strong>${formatMoney(openSession?.openingAmount || 0)}</strong></div>
    <div class="cash-card"><span>Ventas en efectivo</span><strong>${formatMoney(cashTotal)}</strong></div>
    <div class="cash-card"><span>Ventas a credito</span><strong>${formatMoney(creditTotal)}</strong></div>
    <div class="cash-card"><span>Abonos cobrados</span><strong>${formatMoney(paidCredits)}</strong></div>
    <div class="cash-card"><span>Notas de venta</span><strong>${sales.length}</strong></div>
    <div class="cash-card"><span>Productos vendidos</span><strong>${sales.reduce((sum, sale) => sum + sale.items.reduce((itemSum, item) => itemSum + item.quantity, 0), 0)}</strong></div>
    <div class="cash-card"><span>Total en caja</span><strong>${formatMoney(drawerTotal)}</strong></div>
    <div class="cash-card"><span>Responsable</span><strong>${openSession?.cashier || "Sin asignar"}</strong></div>
    <div class="cash-card"><span>Apertura</span><strong>${openSession?.openedAt ? new Date(openSession.openedAt).toLocaleString("es-MX") : "Pendiente"}</strong></div>
  `;
  $("cashSessionTable").innerHTML = state.cash.sessions.slice().reverse().map((session) => `
    <div class="table-row history">
      <strong>${session.id}</strong>
      <div>
        <strong>${session.cashier || "Sin asignar"}</strong>
        <span>${new Date(session.openedAt).toLocaleString("es-MX")} - ${session.closedAt ? new Date(session.closedAt).toLocaleString("es-MX") : "Abierta"}</span>
      </div>
      <span>${session.closedAt ? "Cerrada" : "Abierta"}</span>
      <strong>${formatMoney(session.drawerTotal ?? session.openingAmount)}</strong>
      <span>${session.notes || "Sin notas"}</span>
    </div>
  `).join("") || "<span>No hay cajas cerradas todavia.</span>";
  $("salesTable").innerHTML = sales.slice().reverse().map((sale) => `
    <div class="table-row sale">
      <strong>${sale.folio}</strong>
      <span>${new Date(sale.createdAt).toLocaleString("es-MX")}</span>
      <span>${paymentMethodName(sale.paymentMethod)}</span>
      <strong>${formatMoney(sale.total)}</strong>
    </div>
  `).join("") || "<span>No hay ventas en la caja abierta.</span>";
  $("saveOpeningCashButton").disabled = Boolean(openSession);
  $("closeCashButton").disabled = !openSession;
}

function renderInvoice(sale) {
  const design = state.business.invoiceDesign;
  const returns = (sale.returns || []).reduce((sum, item) => sum + item.amount, 0);
  const subtotal = sale.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxAmount = design.showTax === "yes" ? subtotal * Number(state.business.regional.taxRate || 0) : 0;
  if (renderCustomInvoiceForSale(sale, subtotal, taxAmount)) return;
  if ((design.mode || "standard") === "excel" && renderImportedInvoiceTemplate(sale, subtotal, taxAmount)) return;
  const ticketStyle = `max-width:${state.business.ticketWidth === "80" ? "320px" : "232px"}; margin:0 auto; font-size:${state.business.ticketWidth === "80" ? "13px" : "12px"};`;
  $("invoicePreview").innerHTML = `
    <div class="ticket-paper" style="${ticketStyle}">
    <div class="invoice-head">
      <div>
        <strong>${escapeHtml(design.title || state.business.ticketHeaderText || state.business.name)}</strong>
        <div class="invoice-meta">${state.business.name}</div>
        <div class="invoice-meta">Serie ${escapeHtml(design.series || "A")} | ${sale.folio}</div>
        <div class="invoice-meta">${state.business.ticketShowAddress === "yes" ? (state.business.address || "Direccion no configurada") : ""}</div>
        <div class="invoice-meta">${state.business.phone || ""}</div>
      </div>
      <strong>${design.showLogo === "yes" ? "DSP" : ""}</strong>
    </div>
    <div class="invoice-meta">
      Fecha: ${new Date(sale.createdAt).toLocaleString("es-MX")}<br>
      Cliente: ${sale.customer || "Cliente general"}<br>
      Referencia fiscal: ${sale.taxId || "Sin datos"}<br>
      ${sale.fiscalNumber ? `NCF: ${escapeHtml(sale.fiscalNumber)}<br>Tipo comprobante: ${escapeHtml(sale.fiscalReceiptName || fiscalTypeLabel(sale.fiscalReceiptType))}<br>RNC emisor: ${escapeHtml(sale.fiscalIssuerId || state.business.fiscal.issuerRnc || "Sin configurar")}<br>` : ""}
      Metodo pago: ${paymentMethodName(sale.paymentMethod)}<br>
      ${sale.type === "credit" ? `Abono inicial: ${formatMoney(sale.initialPayment || 0)}<br>` : ""}
      Recibido: ${formatMoney(sale.amountReceived || sale.total)} | Cambio: ${formatMoney(sale.changeDue || 0)}<br>
      Estado: ${sale.status || "Vigente"}
    </div>
    ${sale.items.map((item) => `
      <div class="invoice-line">
        <span>${item.quantity} x ${item.description}</span>
        <strong>${formatMoney(item.price * item.quantity)}</strong>
      </div>
    `).join("")}
    ${returns ? `<div class="invoice-line"><span>Devoluciones aplicadas</span><strong>-${formatMoney(returns)}</strong></div>` : ""}
    <div class="invoice-line"><span>Subtotal</span><strong>${formatMoney(subtotal)}</strong></div>
    ${design.showTax === "yes" ? `<div class="invoice-line"><span>${escapeHtml(state.business.regional.taxName)} ${Number(state.business.regional.taxRate || 0) * 100}%</span><strong>${formatMoney(taxAmount)}</strong></div>` : ""}
    <div class="invoice-total">
      <span>Total</span>
      <strong>${formatMoney(sale.total)}</strong>
    </div>
    <div class="invoice-meta">${escapeHtml(sale.notes || design.legalText || state.business.ticketFooterText || state.business.ticketMessage)}</div>
    ${design.showQr === "yes" ? `<div class="qr-placeholder">QR</div>` : ""}
    </div>
  `;
}

function renderCashCut(cut) {
  $("cashCutPreview").innerHTML = `
    <div class="invoice-head">
      <div>
        <strong>${state.business.name}</strong>
        <div class="invoice-meta">Corte de caja</div>
      </div>
      <strong>${cut.id || new Date(cut.closedAt).toLocaleDateString("es-MX")}</strong>
    </div>
    <div class="invoice-line"><span>Responsable</span><strong>${cut.cashier || "Sin asignar"}</strong></div>
    <div class="invoice-line"><span>Apertura</span><strong>${new Date(cut.openedAt).toLocaleString("es-MX")}</strong></div>
    <div class="invoice-line"><span>Cierre</span><strong>${new Date(cut.closedAt).toLocaleString("es-MX")}</strong></div>
    <div class="invoice-line"><span>Monto inicial</span><strong>${formatMoney(cut.openingAmount)}</strong></div>
    <div class="invoice-line"><span>Ventas en efectivo</span><strong>${formatMoney(cut.cashSales)}</strong></div>
    <div class="invoice-line"><span>Ventas a credito</span><strong>${formatMoney(cut.creditSales || 0)}</strong></div>
    <div class="invoice-line"><span>Abonos cobrados</span><strong>${formatMoney(cut.paidCredits)}</strong></div>
    <div class="invoice-line"><span>Ventas registradas</span><strong>${cut.salesCount}</strong></div>
    <div class="invoice-total"><span>Total en caja</span><strong>${formatMoney(cut.drawerTotal)}</strong></div>
  `;
}

function updateChangeDue() {
  const method = state.paymentMethods.find((entry) => entry.code === $("paymentMethodSelect").value);
  const total = saleTotal();
  const received = Number($("amountReceivedInput").value || 0);
  const isCredit = $("paymentMethodSelect").value === "credit";
  const creditInitialPayment = Math.max(0, Number($("creditInitialPaymentInput").value || 0));
  const creditCashReceived = Math.max(0, Number($("creditCashReceivedInput").value || 0));
  syncCreditPaymentFields();
  if (isCredit) {
    $("amountReceivedInput").value = 0;
    $("changeDueInput").value = formatMoney(0);
  } else {
    $("changeDueInput").value = formatMoney(method?.needsChange ? Math.max(0, received - total) : 0);
  }
  $("creditChangeDueInput").value = formatMoney(isCredit ? Math.max(0, creditCashReceived - creditInitialPayment) : 0);
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function buildBackupPayload(data) {
  const cleanData = data === state ? snapshotForBackup() : clone(data);
  return {
    app: APP_NAME,
    appVersion: APP_VERSION,
    schemaVersion: APP_SCHEMA_VERSION,
    backupFormatVersion: BACKUP_FORMAT_VERSION,
    compatibleFromSchemaVersion: BACKUP_COMPATIBLE_FROM,
    exportedAt: new Date().toISOString(),
    checksum: simpleChecksum(cleanData),
    data: cleanData
  };
}

function exportBackup() {
  if (!requirePermission("backup:export")) return;
  createAutoBackup("manual-export");
  const payload = JSON.stringify(buildBackupPayload(state), null, 2);
  $("backupTextArea").value = payload;
  addAudit("backup_exported", "manual", {});
  downloadTextFile(`daryez-smart-point-backup-${todayISODate()}.json`, payload);
  showToast("Backup .json generado y descargado.");
  persistState();
  renderBackup();
}

function exportDemoBackup() {
  if (!requirePermission("backup:export")) return;
  const payload = JSON.stringify(buildBackupPayload(demoStateTemplate()), null, 2);
  $("backupTextArea").value = payload;
  downloadTextFile(`daryez-smart-point-demo-${todayISODate()}.json`, payload);
  showToast("Demo lista para compartir por WhatsApp.");
}

function loadDemoState() {
  if (!requirePermission("backup:restore", "Solo administradores pueden restablecer la informacion.")) return;
  createAutoBackup("before-demo-reset");
  overwriteState(demoStateTemplate());
  addAudit("demo_loaded", "system", {});
  markInstallation();
  persistState();
  renderAll();
  showView("dashboard");
  showToast("Demo comercial cargada.");
}

function restoreBackupFromText(text) {
  if (!requirePermission("backup:restore", "Solo administradores pueden restaurar backups.")) return;
  try {
    const parsed = JSON.parse(text);
    const validation = validateBackupPayload(parsed);
    if (!validation.ok) {
      showToast(validation.message);
      return;
    }
    createAutoBackup("before-restore");
    const { metadata } = unwrapBackupPayload(parsed);
    const migrated = migrateStateSnapshot(validation.data);
    migrated.audit = [
      {
        id: `AUD-${Date.now()}`,
        action: "backup_restored",
        entity: metadata?.appVersion || "backup",
        details: {},
        user: state.currentUser?.username || "sistema",
        userName: state.currentUser?.name || "Sistema",
        createdAt: new Date().toISOString()
      },
      ...(migrated.audit || [])
    ].slice(0, MAX_AUDIT_LOGS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
    markInstallation();
    showToast(metadata ? `Backup restaurado desde ${metadata.appVersion || "version desconocida"}. Recarga la pagina para aplicar todo.` : "Backup restaurado. Recarga la pagina para aplicar todo.");
  } catch {
    showToast("El backup no es un JSON valido.");
  }
}

function renderBackup() {
  const status = $("backupStatus");
  if (status) {
    status.innerHTML = `
      <span class="workspace-chip ok">Automaticos: ${state.backups.autoEnabled === "yes" ? "activos" : "inactivos"}</span>
      <span class="workspace-chip">Ultimo: ${state.backups.lastAutoBackupAt ? new Date(state.backups.lastAutoBackupAt).toLocaleString("es-MX") : "sin respaldo"}</span>
      <span class="workspace-chip ${state.integrity.status === "Correcto" ? "ok" : "warn"}">Integridad: ${state.integrity.status}</span>
    `;
  }
  const table = $("backupHistoryTable");
  if (table) {
    table.innerHTML = (state.backups.history || []).map((backup) => `
      <div class="table-row history">
        <strong>${escapeHtml(backup.id)}</strong>
        <span>${new Date(backup.createdAt).toLocaleString("es-MX")}</span>
        <span>${escapeHtml(backup.reason)}</span>
        <strong>${escapeHtml(backup.checksum)}</strong>
      </div>
    `).join("") || "<span>No hay backups automaticos todavia.</span>";
  }
  const integrity = $("integrityIssues");
  if (integrity) {
    integrity.innerHTML = state.integrity.issues.length
      ? state.integrity.issues.map((issue) => `<div class="compact-row warn"><span>${escapeHtml(issue)}</span></div>`).join("")
      : "<span>La verificacion actual no encontro inconsistencias.</span>";
  }
  const logs = $("systemLogTable");
  if (logs) {
    logs.innerHTML = (state.systemLogs || []).slice(0, 8).map((log) => `
      <div class="table-row history">
        <strong>${escapeHtml(log.level)}</strong>
        <span>${new Date(log.createdAt).toLocaleString("es-MX")}</span>
        <span>${escapeHtml(log.message)}</span>
      </div>
    `).join("") || "<span>No hay logs del sistema.</span>";
  }
}

function renderSettings() {
  $("businessNameSide").textContent = state.business.name;
  $("sidebarVersionText").textContent = `v${APP_VERSION}`;
  $("loginVersionText").textContent = `Version ${APP_VERSION}`;
  $("systemVersionText").textContent = `v${APP_VERSION}`;
  $("systemSchemaText").textContent = `Esquema ${APP_SCHEMA_VERSION}`;
  $("backupCompatibilityText").textContent = `Backups compatibles desde esquema ${BACKUP_COMPATIBLE_FROM}`;
  $("updateGuideText").textContent = "Antes de actualizar: exporta backup, reemplaza archivos y luego restaura el backup en la nueva version.";
  document.title = `${state.business.name} - v${APP_VERSION}`;
  $("businessName").value = state.business.name;
  $("businessPhone").value = state.business.phone;
  $("businessAddress").value = state.business.address;
  $("ticketMessage").value = state.business.ticketMessage;
  $("brandTheme").value = state.business.theme;
  $("themeMode").value = state.business.regional.themeMode;
  $("currencyCode").value = state.business.regional.currency;
  $("taxName").value = state.business.regional.taxName;
  $("taxRate").value = Number(state.business.regional.taxRate || 0) * 100;
  $("invoicePrefix").value = state.business.regional.invoicePrefix;
  $("fiscalEnabled").value = state.business.fiscal.enabled;
  $("businessFiscalId").value = state.business.fiscal.issuerRnc;
  $("defaultFiscalType").value = state.business.fiscal.defaultType || "none";
  $("fiscalNextB01").value = state.business.fiscal.sequences.B01.next;
  $("fiscalNextB02").value = state.business.fiscal.sequences.B02.next;
  $("fiscalNextB14").value = state.business.fiscal.sequences.B14.next;
  $("fiscalNextB15").value = state.business.fiscal.sequences.B15.next;
  $("ticketWidth").value = state.business.ticketWidth;
  $("ticketHeaderText").value = state.business.ticketHeaderText;
  $("ticketFooterText").value = state.business.ticketFooterText;
  $("ticketShowAddress").value = state.business.ticketShowAddress;
  $("scannerEnabled").value = state.business.scanner.enabled;
  $("scannerAutoAdd").value = state.business.scanner.autoAdd;
  $("scannerSuffix").value = state.business.scanner.suffix;
  $("scannerMinLength").value = state.business.scanner.minLength;
  $("scannerFocusOnSale").value = state.business.scanner.focusOnSale;
  $("scannerCaptureOnProduct").value = state.business.scanner.captureOnProduct;
  $("lowStockAlertsEnabled").value = state.business.inventory.lowStockAlertsEnabled;
  $("defaultMinStock").value = state.business.inventory.defaultMinStock;
  $("autoInventoryOnCreate").value = state.business.inventory.autoInventoryOnCreate;
  $("scannerStatusText").textContent = state.business.scanner.lastDetectedAt
    ? `${state.business.scanner.hardwareStatus || "Lector verificado"} | Ultima prueba: ${new Date(state.business.scanner.lastDetectedAt).toLocaleString("es-MX")}`
    : (state.business.scanner.hardwareStatus || "Sin prueba registrada");
  document.body.classList.toggle("theme-blue", state.business.theme === "blue");
  document.body.classList.toggle("theme-red", state.business.theme === "red");
  document.body.classList.toggle("theme-dark", state.business.regional.themeMode === "dark");
}

function renderAll() {
  renderDashboard();
  renderChrome();
  renderOptions();
  renderProducts();
  renderCustomers();
  renderSuppliers();
  renderCategories();
  renderProductResults();
  renderCart();
  renderInventory();
  renderSupplierInvoices();
  renderCredits();
  renderHistory();
  renderReports();
  renderInvoiceDesigner();
  renderUsers();
  renderBackup();
  renderCash();
  renderSettings();
}

function addProductToCart(code) {
  const product = state.products.find((item) => item.code === code);
  if (!product) return;
  if (!product.service && product.stock <= 0) {
    showToast("Producto sin existencia disponible.");
    return;
  }
  const existing = state.cart.find((item) => item.code === code);
  if (existing) {
    if (!product.service && existing.quantity + 1 > product.stock) {
      showToast(`Solo hay ${product.stock} disponible(s).`);
      return;
    }
    existing.quantity += 1;
  } else {
    state.cart.push({ code: product.code, description: product.description, price: product.price, quantity: 1 });
  }
  renderCart();
}

function finishSale() {
  if (!hasOpenCashToday()) {
    showToast("Abre la caja del dia antes de cobrar.");
    promptOpeningCash();
    return;
  }
  if (!state.cart.length) {
    showToast("Agrega al menos un producto.");
    return;
  }
  const stockError = validateCartAvailability();
  if (stockError) {
    showToast(stockError);
    return;
  }
  const method = $("paymentMethodSelect").value || (state.payType === "credit" ? "credit" : "cash");
  $("paymentTotalText").textContent = formatMoney(saleTotal());
  $("amountReceivedInput").value = method === "cash" ? saleTotal() : 0;
  $("changeDueInput").value = formatMoney(0);
  $("paymentMethodSelect").value = state.payType === "credit" ? "credit" : method;
  $("paymentCustomerSelect").value = state.payType === "credit"
    ? $("saleCustomerSelect").value
    : ($("cashCustomerSelect").value || state.customers[0]?.code || "");
  const selectedCustomer = state.customers.find((entry) => entry.code === $("paymentCustomerSelect").value);
  $("fiscalReceiptTypeSelect").value = state.business.fiscal.enabled === "yes" ? (state.business.fiscal.defaultType || "none") : "none";
  $("fiscalCustomerIdInput").value = selectedCustomer?.taxId || "";
  $("paymentReferenceInput").value = "";
  $("creditInitialPaymentInput").value = state.payType === "credit" ? Math.min(saleTotal(), Number($("initialPaymentInput").value || 0)) : 0;
  $("creditCashReceivedInput").value = state.payType === "credit" ? Number($("initialPaymentInput").value || 0) : 0;
  updateChangeDue();
  openModal("paymentModal");
}

function confirmPayment() {
  const session = currentCashSession();
  if (!hasOpenCashToday() || !session) {
    closeModal("paymentModal");
    showToast("Abre la caja del dia antes de registrar ventas.");
    promptOpeningCash();
    return;
  }
  if (!state.cart.length) {
    closeModal("paymentModal");
    return;
  }
  const stockError = validateCartAvailability();
  if (stockError) {
    showToast(stockError);
    return;
  }
  const total = saleTotal();
  const discount = Number($("discountInput").value || 0);
  if (discount < 0 || discount > saleSubtotal()) {
    showToast("El descuento no puede ser negativo ni mayor al subtotal.");
    return;
  }
  const paymentMethod = $("paymentMethodSelect").value;
  const amountReceived = Number($("amountReceivedInput").value || 0);
  const creditInitialPayment = Math.max(0, Number($("creditInitialPaymentInput").value || 0));
  const creditCashReceived = Math.max(0, Number($("creditCashReceivedInput").value || 0));
  const method = state.paymentMethods.find((entry) => entry.code === paymentMethod);
  if (method?.needsChange && amountReceived < total) {
    showToast("El monto recibido no cubre el total.");
    return;
  }
  if (paymentMethod === "credit" && creditCashReceived < creditInitialPayment) {
    showToast("El efectivo recibido para el abono no cubre el abono inicial.");
    return;
  }
  const customerCode = paymentMethod === "credit"
    ? ($("paymentCustomerSelect").value || $("saleCustomerSelect").value)
    : ($("paymentCustomerSelect").value || $("cashCustomerSelect").value);
  const customer = state.customers.find((entry) => entry.code === customerCode) || state.customers[0];
  const quickCustomerName = sanitizeText($("cashCustomerNameInput").value, 120);
  const fiscalType = state.business.fiscal.enabled === "yes" ? $("fiscalReceiptTypeSelect").value : "none";
  const fiscalCustomerId = sanitizeText($("fiscalCustomerIdInput").value || customer?.taxId || "", 40);
  if (fiscalRequiresCustomerId(fiscalType) && !fiscalCustomerId) {
    showToast("Este comprobante fiscal requiere RNC / ID fiscal del cliente.");
    return;
  }
  let fiscalNumber = "";
  try {
    fiscalNumber = consumeFiscalNumber(fiscalType);
  } catch (error) {
    showToast(error.message);
    return;
  }
  const effectiveReceived = paymentMethod === "credit" ? creditCashReceived : amountReceived;
  const effectiveChange = paymentMethod === "credit"
    ? Math.max(0, creditCashReceived - creditInitialPayment)
    : (method?.needsChange ? Math.max(0, amountReceived - total) : 0);
  const sale = {
    folio: nextSaleFolio(),
    type: paymentMethod === "credit" ? "credit" : "cash",
    paymentMethod,
    amountReceived: effectiveReceived,
    initialPayment: paymentMethod === "credit" ? Math.min(total, creditInitialPayment) : total,
    changeDue: effectiveChange,
    paymentReference: $("paymentReferenceInput").value.trim(),
    total,
    items: state.cart.map((item) => ({ ...item })),
    customerCode: customerCode || "",
    customer: paymentMethod === "credit" ? (customer?.name || "Cliente general") : (quickCustomerName || customer?.name || "Cliente general"),
    taxId: fiscalCustomerId || (paymentMethod === "credit" ? (customer?.taxId || "") : (customerCode ? (customer?.taxId || "") : "")),
    fiscalReceiptType: fiscalType,
    fiscalReceiptName: fiscalTypeLabel(fiscalType),
    fiscalNumber,
    fiscalIssuerId: state.business.fiscal.issuerRnc || "",
    notes: "",
    status: "Vigente",
    returns: [],
    sessionId: session.id,
    seller: state.currentUser?.name || "",
    sellerUsername: state.currentUser?.username || "",
    createdAt: new Date().toISOString()
  };
  state.cart.forEach((item) => {
    const product = state.products.find((entry) => entry.code === item.code);
    if (product && !product.service) product.stock = Math.max(0, product.stock - item.quantity);
  });
  state.sales.push(sale);
  addAudit("sale_created", sale.folio, { total: sale.total, items: sale.items.length, paymentMethod });
  if (paymentMethod === "credit") {
    const paid = Math.min(total, creditInitialPayment);
    state.credits.push({
      id: sale.folio,
      customer: sale.customer,
      total,
      paid,
      balance: total - paid,
      payments: paid ? [{ amount: paid, sessionId: session.id, createdAt: sale.createdAt }] : []
    });
  }
  state.cart = [];
  $("discountInput").value = 0;
  $("initialPaymentInput").value = 0;
  $("cashCustomerNameInput").value = "";
  $("cashCustomerSelect").value = "";
  $("creditInitialPaymentInput").value = 0;
  $("creditCashReceivedInput").value = 0;
  closeModal("paymentModal");
  showToast(`Venta ${sale.folio} registrada.`);
  state.activeSaleFolio = sale.folio;
  notifyLowStockFromSale(sale);
  persistState();
  renderInvoice(sale);
  openModal("invoiceModal");
  renderAll();
}

function saveProduct() {
  if (!requirePermission("catalog:write")) return;
  const rawCode = $("productCode").value.trim();
  const stock = Number($("productStock").value || 0);
  const service = $("productIsService").checked;
  const product = {
    code: rawCode || nextProductBarcode(),
    description: sanitizeText($("productDescription").value, 120),
    supplier: $("productSupplier").value,
    category: $("productCategory").value,
    unit: sanitizeText($("productUnit").value, 40) || "Pieza",
    cost: Number($("productCost").value || 0),
    price: Number($("productPrice").value || 0),
    stock,
    minStock: service ? 0 : Math.max(0, Number($("productMinStock").value || state.business.inventory.defaultMinStock || 0)),
    service
  };
  if (!product.description) {
    showToast("Captura la descripcion del producto.");
    return;
  }
  if (!/^[A-Za-z0-9-]+$/.test(product.code)) {
    showToast("El codigo solo debe usar letras, numeros o guion.");
    return;
  }
  if (/^\d{13}$/.test(product.code) && !isValidEAN13(product.code)) {
    showToast("El EAN-13 capturado no tiene digito verificador valido.");
    return;
  }
  if (product.cost < 0 || product.price < 0 || product.stock < 0 || product.minStock < 0) {
    showToast("Costos, precios y existencias no pueden ser negativos.");
    return;
  }
  if (state.products.some((entry) => entry.code !== product.code && entry.description.toLowerCase() === product.description.toLowerCase())) {
    showToast("Ya existe un producto con esa descripcion.");
    return;
  }
  if (!product.service && product.price < product.cost) {
    showToast("El precio de venta es menor al costo. Revisa antes de guardar.");
    return;
  }
  const existingIndex = state.products.findIndex((entry) => entry.code === product.code);
  if (existingIndex >= 0) {
    const before = state.products[existingIndex];
    state.products[existingIndex] = product;
    addAudit("product_updated", product.code, { beforePrice: before.price, afterPrice: product.price, beforeStock: before.stock, afterStock: product.stock });
  } else {
    state.products.push(product);
    addAudit("product_created", product.code, { price: product.price, stock: product.stock });
    if (!product.service && product.stock > 0 && state.business.inventory.autoInventoryOnCreate === "yes") {
      state.inventory.push({
        product: product.code,
        description: product.description,
        quantity: product.stock,
        notes: "Alta inicial de producto"
      });
    }
  }
  ["productCode", "productDescription"].forEach((id) => $(id).value = "");
  $("productCost").value = 0;
  $("productPrice").value = 0;
  $("productStock").value = 0;
  $("productMinStock").value = state.business.inventory.defaultMinStock;
  $("productIsService").checked = false;
  showToast("Producto guardado.");
  persistState();
  renderAll();
}

function editProduct(code) {
  const product = state.products.find((entry) => entry.code === code);
  if (!product) return;
  $("productCode").value = product.code;
  $("productDescription").value = product.description;
  $("productSupplier").value = product.supplier;
  $("productCategory").value = product.category;
  $("productUnit").value = product.unit;
  $("productCost").value = product.cost;
  $("productPrice").value = product.price;
  $("productStock").value = product.stock;
  $("productMinStock").value = productMinStock(product);
  $("productIsService").checked = product.service;
  showView("products");
}

function deleteProduct(code) {
  if (!requirePermission("catalog:write")) return;
  if (state.sales.some((sale) => sale.items.some((item) => item.code === code))) {
    showToast("No se puede eliminar: el producto ya tiene ventas.");
    return;
  }
  state.products = state.products.filter((product) => product.code !== code);
  addAudit("product_deleted", code, {});
  persistState();
  renderAll();
  showToast("Producto eliminado.");
}

function clearProductForm() {
  $("productCode").value = nextProductBarcode();
  $("productDescription").value = "";
  $("productUnit").value = "Pieza";
  $("productCost").value = 0;
  $("productPrice").value = 0;
  $("productStock").value = 0;
  $("productMinStock").value = state.business.inventory.defaultMinStock;
  $("productIsService").checked = false;
}

function saveSupplier() {
  if (!requirePermission("catalog:write")) return;
  const supplier = {
    code: $("supplierCode").value.trim() || `PROV-${String(state.suppliers.length + 1).padStart(3, "0")}`,
    name: sanitizeText($("supplierName").value, 120),
    phone: sanitizeText($("supplierPhone").value, 40)
  };
  if (!supplier.name) {
    showToast("Captura el nombre del proveedor.");
    return;
  }
  if (state.suppliers.some((entry) => entry.code === supplier.code || entry.name.toLowerCase() === supplier.name.toLowerCase())) {
    showToast("Ya existe un proveedor con ese codigo o nombre.");
    return;
  }
  state.suppliers.push(supplier);
  addAudit("supplier_created", supplier.code, {});
  ["supplierCode", "supplierName", "supplierPhone"].forEach((id) => $(id).value = "");
  showToast("Proveedor guardado.");
  persistState();
  renderAll();
}

function saveCategory() {
  if (!requirePermission("catalog:write")) return;
  const category = {
    code: $("categoryCode").value.trim() || nextCode("CAT", state.categories),
    name: sanitizeText($("categoryName").value, 80)
  };
  if (!category.name) {
    showToast("Captura la clasificacion.");
    return;
  }
  if (state.categories.some((entry) => entry.code !== category.code && entry.name.toLowerCase() === category.name.toLowerCase())) {
    showToast("Ya existe una clasificacion con ese nombre.");
    return;
  }
  const existingIndex = state.categories.findIndex((entry) => entry.code === category.code);
  if (existingIndex >= 0) {
    state.categories[existingIndex] = category;
    addAudit("category_updated", category.code, {});
  } else {
    state.categories.push(category);
    addAudit("category_created", category.code, {});
  }
  ["categoryCode", "categoryName"].forEach((id) => $(id).value = "");
  showToast("Clasificacion guardada.");
  persistState();
  renderAll();
}

function editCategory(code) {
  const category = state.categories.find((entry) => entry.code === code);
  if (!category) return;
  $("categoryCode").value = category.code;
  $("categoryName").value = category.name;
  showView("categories");
}

function deleteCategory(code) {
  if (!requirePermission("catalog:write")) return;
  if (state.products.some((product) => product.category === code)) {
    showToast("No se puede eliminar: hay productos con esta clasificacion.");
    return;
  }
  state.categories = state.categories.filter((category) => category.code !== code);
  addAudit("category_deleted", code, {});
  persistState();
  renderAll();
  showToast("Clasificacion eliminada.");
}

function clearCategoryForm() {
  $("categoryCode").value = "";
  $("categoryName").value = "";
}

function saveCustomer() {
  if (!requirePermission("catalog:write")) return;
  const customer = {
    code: $("customerCode").value.trim() || nextCode("CLI", state.customers),
    name: sanitizeText($("customerName").value, 120),
    taxId: sanitizeText($("customerTaxId").value, 40),
    phone: sanitizeText($("customerPhone").value, 40),
    address: sanitizeText($("customerAddress").value, 180)
  };
  if (!customer.name) {
    showToast("Captura el nombre del cliente.");
    return;
  }
  if (state.customers.some((entry) => entry.code !== customer.code && entry.name.toLowerCase() === customer.name.toLowerCase())) {
    showToast("Ya existe un cliente con ese nombre.");
    return;
  }
  const existingIndex = state.customers.findIndex((entry) => entry.code === customer.code);
  if (existingIndex >= 0) {
    state.customers[existingIndex] = customer;
    addAudit("customer_updated", customer.code, {});
  } else {
    state.customers.push(customer);
    addAudit("customer_created", customer.code, {});
  }
  clearCustomerForm();
  persistState();
  renderAll();
  showToast("Cliente guardado.");
}

function editCustomer(code) {
  const customer = state.customers.find((entry) => entry.code === code);
  if (!customer) return;
  $("customerCode").value = customer.code;
  $("customerName").value = customer.name;
  $("customerTaxId").value = customer.taxId;
  $("customerPhone").value = customer.phone;
  $("customerAddress").value = customer.address;
  showView("customers");
}

function deleteCustomer(code) {
  if (!requirePermission("catalog:write")) return;
  if (code === "CLI-001" || state.sales.some((sale) => sale.customerCode === code)) {
    showToast("No se puede eliminar: el cliente tiene ventas o es el cliente general.");
    return;
  }
  state.customers = state.customers.filter((customer) => customer.code !== code);
  addAudit("customer_deleted", code, {});
  persistState();
  renderAll();
  showToast("Cliente eliminado.");
}

function clearCustomerForm() {
  ["customerCode", "customerName", "customerTaxId", "customerPhone", "customerAddress"].forEach((id) => $(id).value = "");
}

function clearUserForm() {
  $("userCodeInput").value = "";
  $("userNameInput").value = "";
  $("userPasswordInput").value = "";
  $("userRoleInput").value = "cashier";
  $("userStatusInput").value = "active";
}

function applyInstallChoice(mode) {
  if (state.currentUser && !requirePermission("backup:restore", "Solo administradores pueden restablecer el sistema.")) return;
  if (mode === "clean") {
    overwriteState(cleanStateTemplate());
    showToast("Sistema listo para iniciar limpio.");
  } else {
    overwriteState(defaultState);
    showToast("Sistema cargado con la base inicial.");
  }
  markInstallation();
  persistState();
  closeModal("installChoiceModal");
  closeModal("resetSystemModal");
  $("passwordInput").value = "admin";
  $("userInput").value = "admin";
  $("mainView").classList.add("hidden");
  $("loginView").classList.remove("hidden");
  renderAll();
}

async function saveUser() {
  if (!requirePermission("security:users", "Solo administradores pueden administrar usuarios.")) return;
  const username = $("userCodeInput").value.trim();
  const existing = state.users.find((entry) => entry.username === username);
  const password = $("userPasswordInput").value;
  const user = {
    username,
    name: sanitizeText($("userNameInput").value, 90),
    role: $("userRoleInput").value,
    status: $("userStatusInput").value
  };
  if (password) user.passwordHash = await hashPassword(password);
  else if (existing?.passwordHash) user.passwordHash = existing.passwordHash;
  else if (existing?.password) user.passwordHash = await hashPassword(existing.password);
  if (!user.username || !user.name || !user.passwordHash) {
    showToast("Completa usuario, nombre y contrasena.");
    return;
  }
  if (!ROLE_PERMISSIONS[user.role]) {
    showToast("Selecciona un rol valido.");
    return;
  }
  if (!/^[A-Za-z0-9._-]+$/.test(user.username)) {
    showToast("El usuario solo debe usar letras, numeros, punto, guion o guion bajo.");
    return;
  }
  const otherAdmins = state.users.filter((entry) => entry.username !== user.username && entry.role === "admin" && entry.status === "active");
  if (existing?.role === "admin" && user.role !== "admin" && !otherAdmins.length) {
    showToast("Debe quedar al menos un administrador activo.");
    return;
  }
  const existingIndex = state.users.findIndex((entry) => entry.username === user.username);
  if (existingIndex >= 0) {
    state.users[existingIndex] = user;
    addAudit("user_updated", user.username, { role: user.role, status: user.status });
  } else {
    state.users.push(user);
    addAudit("user_created", user.username, { role: user.role, status: user.status });
  }
  clearUserForm();
  persistState();
  renderAll();
  showToast("Usuario guardado.");
}

function editUser(username) {
  const user = state.users.find((entry) => entry.username === username);
  if (!user) return;
  $("userCodeInput").value = user.username;
  $("userNameInput").value = user.name;
  $("userPasswordInput").value = "";
  $("userRoleInput").value = user.role;
  $("userStatusInput").value = user.status;
  showView("users");
}

function deleteUser(username) {
  if (!requirePermission("security:users", "Solo administradores pueden administrar usuarios.")) return;
  const user = state.users.find((entry) => entry.username === username);
  if (!user) return;
  if (state.currentUser?.username === username) {
    showToast("No puedes eliminar la sesion activa.");
    return;
  }
  if (user.role === "admin" && state.users.filter((entry) => entry.username !== username && entry.role === "admin" && entry.status === "active").length === 0) {
    showToast("Debe quedar al menos un administrador activo.");
    return;
  }
  state.users = state.users.filter((entry) => entry.username !== username);
  addAudit("user_deleted", username, {});
  persistState();
  renderAll();
  showToast("Usuario eliminado.");
}

function saveInventory() {
  if (!requirePermission("inventory:adjust")) return;
  const code = $("inventoryProduct").value;
  const product = state.products.find((entry) => entry.code === code);
  const quantity = Number($("inventoryQuantity").value || 0);
  if (!product || quantity <= 0) {
    showToast("Selecciona un producto y cantidad valida.");
    return;
  }
  if (!product.service) product.stock += quantity;
  state.inventory.push({
    product: product.code,
    description: product.description,
    quantity,
    notes: sanitizeText($("inventoryNotes").value, 160)
  });
  addAudit("inventory_adjusted", product.code, { quantity });
  $("inventoryQuantity").value = 1;
  $("inventoryNotes").value = "";
  showToast("Entrada registrada.");
  persistState();
  renderAll();
}

function savePayment() {
  if (!requirePermission("credit:payment")) return;
  const session = currentCashSession();
  if (!hasOpenCashToday() || !session) {
    showToast("Abre la caja del dia antes de cobrar abonos.");
    promptOpeningCash();
    return;
  }
  const credit = state.credits.find((entry) => entry.id === $("creditSelect").value);
  const amount = Number($("paymentAmount").value || 0);
  if (!credit || amount <= 0) {
    showToast("Selecciona un credito y abono valido.");
    return;
  }
  const payment = Math.min(amount, credit.balance);
  credit.paid += payment;
  credit.balance -= payment;
  credit.payments = credit.payments || [];
  credit.payments.push({ amount: payment, sessionId: session.id, createdAt: new Date().toISOString() });
  addAudit("credit_payment", credit.id, { amount: payment });
  $("paymentAmount").value = 0;
  showToast("Abono registrado.");
  persistState();
  renderAll();
}

function clearSupplierInvoiceForm() {
  $("supplierInvoiceProvider").value = state.suppliers[0]?.code || "";
  $("supplierInvoiceNumber").value = "";
  $("supplierInvoiceEntryDate").value = todayISODate();
  $("supplierInvoiceDueDate").value = "";
  $("supplierInvoiceAmount").value = 0;
  $("supplierInvoiceStatus").value = "pending";
  $("supplierInvoiceNotes").value = "";
  state.activeSupplierInvoiceId = "";
}

function saveSupplierInvoice() {
  if (!requirePermission("supplierInvoice:write", "No tienes permisos para registrar facturas de proveedor.")) return;
  const provider = state.suppliers.find((entry) => entry.code === $("supplierInvoiceProvider").value);
  const number = sanitizeText($("supplierInvoiceNumber").value, 60);
  const entryDate = $("supplierInvoiceEntryDate").value || todayISODate();
  const dueDate = $("supplierInvoiceDueDate").value;
  const amount = Math.max(0, Number($("supplierInvoiceAmount").value || 0));
  if (!provider || !number || !dueDate || amount <= 0) {
    showToast("Completa proveedor, numero, vencimiento y monto valido.");
    return;
  }
  if (state.supplierInvoices.some((invoice) => invoice.id !== state.activeSupplierInvoiceId && invoice.provider === provider.code && invoice.number.toLowerCase() === number.toLowerCase())) {
    showToast("Ya existe una factura con ese numero para el proveedor.");
    return;
  }
  const invoice = {
    id: state.activeSupplierInvoiceId || nextSupplierInvoiceId(),
    provider: provider.code,
    providerName: provider.name,
    number,
    entryDate,
    dueDate,
    amount,
    status: $("supplierInvoiceStatus").value,
    notes: sanitizeText($("supplierInvoiceNotes").value, 180),
    createdAt: new Date().toISOString(),
    createdBy: state.currentUser?.username || ""
  };
  const index = state.supplierInvoices.findIndex((entry) => entry.id === invoice.id);
  if (index >= 0) {
    state.supplierInvoices[index] = { ...state.supplierInvoices[index], ...invoice };
    addAudit("supplier_invoice_updated", invoice.number, { provider: provider.name, amount });
  } else {
    state.supplierInvoices.push(invoice);
    addAudit("supplier_invoice_created", invoice.number, { provider: provider.name, amount });
  }
  clearSupplierInvoiceForm();
  persistState();
  renderAll();
  showToast("Factura de proveedor guardada.");
}

function editSupplierInvoice(id) {
  const invoice = state.supplierInvoices.find((entry) => entry.id === id);
  if (!invoice) return;
  state.activeSupplierInvoiceId = id;
  $("supplierInvoiceProvider").value = invoice.provider;
  $("supplierInvoiceNumber").value = invoice.number;
  $("supplierInvoiceEntryDate").value = invoice.entryDate;
  $("supplierInvoiceDueDate").value = invoice.dueDate;
  $("supplierInvoiceAmount").value = invoice.amount;
  $("supplierInvoiceStatus").value = invoice.status;
  $("supplierInvoiceNotes").value = invoice.notes || "";
  showView("supplierInvoices");
}

function deleteSupplierInvoice(id) {
  if (!requirePermission("supplierInvoice:write", "No tienes permisos para eliminar facturas de proveedor.")) return;
  const invoice = state.supplierInvoices.find((entry) => entry.id === id);
  if (!invoice) return;
  state.supplierInvoices = state.supplierInvoices.filter((entry) => entry.id !== id);
  addAudit("supplier_invoice_deleted", invoice.number, { provider: invoice.providerName });
  persistState();
  renderAll();
  showToast("Factura de proveedor eliminada.");
}

function saveOpeningCash() {
  if (!requirePermission("cash:manage")) return;
  const activeSession = currentCashSession();
  if (activeSession?.openedAt.slice(0, 10) === todayISODate()) {
    showToast("La caja de hoy ya esta abierta.");
    closeModal("openingCashModal");
    renderAll();
    return;
  }
  if (activeSession) {
    showToast("Cierra la caja anterior antes de abrir una nueva.");
    closeModal("openingCashModal");
    showView("cash");
    return;
  }
  const modalOpen = !$("openingCashModal").classList.contains("hidden");
  const openedAt = new Date().toISOString();
  const session = {
    id: nextCashSessionId(openedAt.slice(0, 10)),
    openedAt,
    closedAt: "",
    openingAmount: Number((modalOpen ? $("modalOpeningCashInput").value : $("openingCashInput").value) || 0),
    cashier: sanitizeText(modalOpen ? $("modalCashierInput").value : $("cashierInput").value, 80) || state.currentUser?.name || "",
    notes: sanitizeText(modalOpen ? $("modalCashNotesInput").value : $("cashNotesInput").value, 160),
    openedBy: state.currentUser?.username || "",
    salesCount: 0,
    cashSales: 0,
    creditSales: 0,
    paidCredits: 0,
    drawerTotal: 0
  };
  session.drawerTotal = session.openingAmount;
  state.cash.sessions.push(session);
  state.cash.currentSessionId = session.id;
  state.cash.openingAmount = session.openingAmount;
  state.cash.cashier = session.cashier;
  state.cash.notes = session.notes;
  state.cash.openedAt = session.openedAt;
  addAudit("cash_opened", session.id, { openingAmount: session.openingAmount });
  showToast("Caja abierta correctamente.");
  persistState();
  closeModal("openingCashModal");
  renderAll();
}

function closeCash() {
  if (!requirePermission("cash:manage")) return;
  const session = currentCashSession();
  if (!session) {
    showToast("No hay una caja abierta para cerrar.");
    return;
  }
  const sales = sessionSales(session.id);
  const cashSales = sales.filter((sale) => sale.type === "cash").reduce((sum, sale) => sum + sale.total, 0);
  const creditSales = sales.filter((sale) => sale.type === "credit").reduce((sum, sale) => sum + sale.total, 0);
  const paidCredits = sessionCreditPayments(session.id);
  const cut = {
    id: session.id,
    openedAt: session.openedAt,
    closedAt: new Date().toISOString(),
    cashier: session.cashier,
    openingAmount: session.openingAmount,
    cashSales,
    creditSales,
    paidCredits,
    drawerTotal: session.openingAmount + cashSales + paidCredits,
    salesCount: sales.length
  };
  Object.assign(session, cut);
  state.cash.lastCut = cut;
  state.cash.currentSessionId = "";
  state.cash.openingAmount = 0;
  state.cash.openedAt = "";
  state.cash.cashier = "";
  state.cash.notes = "";
  state.activeCut = cut;
  addAudit("cash_closed", cut.id, { drawerTotal: cut.drawerTotal, salesCount: cut.salesCount });
  renderCashCut(cut);
  openModal("cashCutModal");
  showToast(`Corte generado: ${formatMoney(cut.drawerTotal)} en caja.`);
  persistState();
  renderAll();
}

function promptOpeningCash() {
  const activeSession = currentCashSession();
  if (activeSession?.openedAt.slice(0, 10) === todayISODate()) return;
  if (activeSession) {
    showToast("Hay una caja de otro dia abierta. Genera el corte antes de abrir la caja de hoy.");
    return;
  }
  $("modalOpeningCashInput").value = 0;
  $("modalCashierInput").value = state.currentUser?.name || $("userInput").value || "";
  $("modalCashNotesInput").value = "";
  openModal("openingCashModal");
}

function openInvoiceByFolio(folio) {
  const sale = findSale(folio);
  if (!sale) return;
  state.activeSaleFolio = folio;
  renderInvoice(sale);
  openModal("invoiceModal");
}

function openEditInvoice(folio) {
  if (!requirePermission("invoice:edit", "No tienes permisos para editar facturas.")) return;
  const sale = findSale(folio);
  if (!sale) return;
  state.activeSaleFolio = folio;
  $("editInvoiceFolio").value = sale.folio;
  $("editInvoiceCustomer").value = sale.customer || "Cliente general";
  $("editInvoiceTaxId").value = sale.taxId || "";
  $("editInvoiceNotes").value = sale.notes || "";
  $("editInvoiceItems").innerHTML = sale.items.map((item) => `
    <div class="table-row editable-invoice-row" data-edit-item-row="${item.code}">
      <strong>${item.code}</strong>
      <label>Descripcion<input data-edit-item-desc="${item.code}" value="${item.description}"></label>
      <label>Cantidad<input data-edit-item-qty="${item.code}" type="number" min="0" value="${item.quantity}"></label>
      <label>Precio<input data-edit-item-price="${item.code}" type="number" min="0" value="${item.price}"></label>
      <button class="mini-action warn" type="button" data-remove-edit-item="${item.code}">Eliminar</button>
    </div>
  `).join("");
  openModal("editInvoiceModal");
}

function printDocument(type) {
  document.body.classList.remove("print-invoice", "print-cash-cut");
  document.body.classList.add(type === "cashCut" ? "print-cash-cut" : "print-invoice");
  window.setTimeout(() => window.print(), 50);
}

window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-invoice", "print-cash-cut");
});

window.addEventListener("focus", () => {
  document.body.classList.remove("print-invoice", "print-cash-cut");
});

function saveInvoiceEdit() {
  if (!requirePermission("invoice:edit", "No tienes permisos para editar facturas.")) return;
  const sale = findSale(state.activeSaleFolio);
  if (!sale) return;
  const previousItems = sale.items.map((item) => ({ ...item }));
  sale.customer = sanitizeText($("editInvoiceCustomer").value, 120) || "Cliente general";
  sale.taxId = sanitizeText($("editInvoiceTaxId").value, 40);
  sale.notes = sanitizeText($("editInvoiceNotes").value, 180);
  sale.items = Array.from(document.querySelectorAll("[data-edit-item-row]")).map((row) => {
    const code = row.dataset.editItemRow;
    const original = previousItems.find((item) => item.code === code);
    const quantity = Math.max(0, Number(row.querySelector(`[data-edit-item-qty="${code}"]`)?.value || 0));
    const price = Math.max(0, Number(row.querySelector(`[data-edit-item-price="${code}"]`)?.value || 0));
    return {
      ...original,
      description: sanitizeText(row.querySelector(`[data-edit-item-desc="${code}"]`)?.value, 120) || original?.description || "",
      quantity,
      price
    };
  }).filter((item) => item.quantity > 0);
  if (!sale.items.length) {
    showToast("La factura debe conservar al menos un articulo.");
    sale.items = previousItems;
    return;
  }
  for (const item of sale.items) {
    const before = previousItems.find((entry) => entry.code === item.code)?.quantity || 0;
    const difference = item.quantity - before;
    const product = state.products.find((entry) => entry.code === item.code);
    if (product && !product.service) {
      if (difference > 0 && product.stock < difference) {
        showToast(`No hay existencia suficiente para ${item.description}.`);
        sale.items = previousItems;
        return;
      }
      product.stock -= difference;
    }
  }
  previousItems.forEach((previous) => {
    if (!sale.items.some((item) => item.code === previous.code)) {
      const product = state.products.find((entry) => entry.code === previous.code);
      if (product && !product.service) product.stock += previous.quantity;
    }
  });
  sale.total = sale.items.reduce((sum, item) => sum + item.quantity * item.price, 0) - (sale.returns || []).reduce((sum, item) => sum + item.amount, 0);
  sale.total = Math.max(0, sale.total);
  const credit = state.credits.find((entry) => entry.id === sale.folio);
  if (credit) {
    credit.total = sale.total;
    credit.balance = Math.max(0, sale.total - credit.paid);
  }
  notifyLowStockFromSale(sale);
  addAudit("invoice_updated", sale.folio, { total: sale.total });
  persistState();
  closeModal("editInvoiceModal");
  renderInvoice(sale);
  openModal("invoiceModal");
  renderAll();
  showToast("Factura actualizada.");
}

function openReturnModal(folio) {
  if (!requirePermission("return:create", "No tienes permisos para aplicar devoluciones.")) return;
  const sale = findSale(folio);
  if (!sale) return;
  state.activeSaleFolio = folio;
  $("returnFolio").value = sale.folio;
  $("returnItemSelect").innerHTML = sale.items.map((item) => `<option value="${item.code}">${item.description} - ${item.quantity} vendido(s)</option>`).join("");
  $("returnQuantityInput").value = 1;
  $("returnReasonInput").value = "";
  openModal("returnModal");
}

function confirmReturn() {
  if (!requirePermission("return:create", "No tienes permisos para aplicar devoluciones.")) return;
  const sale = findSale(state.activeSaleFolio);
  if (!sale) return;
  const code = $("returnItemSelect").value;
  const item = sale.items.find((entry) => entry.code === code);
  const quantity = Math.max(1, Number($("returnQuantityInput").value || 1));
  if (!item || quantity > item.quantity) {
    showToast("Cantidad de devolucion invalida.");
    return;
  }
  const amount = item.price * quantity;
  sale.returns = sale.returns || [];
  sale.returns.push({
    code,
    description: item.description,
    quantity,
    amount,
    reason: sanitizeText($("returnReasonInput").value, 160),
    createdAt: new Date().toISOString()
  });
  sale.total = Math.max(0, sale.total - amount);
  sale.status = sale.total === 0 ? "Devuelta" : "Con devolucion";
  const product = state.products.find((entry) => entry.code === code);
  if (product && !product.service) product.stock += quantity;
  const credit = state.credits.find((entry) => entry.id === sale.folio);
  if (credit) {
    credit.total = Math.max(0, credit.total - amount);
    credit.balance = Math.max(0, credit.balance - amount);
  }
  addAudit("return_created", sale.folio, { code, quantity, amount });
  persistState();
  closeModal("returnModal");
  renderInvoice(sale);
  openModal("invoiceModal");
  renderAll();
  showToast("Devolucion aplicada.");
}

function wireEvents() {
  let scanBuffer = "";
  let scanTimer = 0;
  let scannerTestStartedAt = 0;

  $("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = $("userInput").value.trim();
    const password = $("passwordInput").value;
    const user = state.users.find((entry) => entry.username === username);
    if (!await verifyUserPassword(user, password)) {
      addAudit("login_failed", username || "sin_usuario", {});
      showToast("Usuario o contrasena incorrectos.");
      persistState();
      return;
    }
    state.currentUser = { username: user.username, name: user.name, role: user.role };
    addAudit("login_success", user.username, { role: user.role });
    persistState();
    $("loginView").classList.add("hidden");
    $("mainView").classList.remove("hidden");
    applyRoleView();
    showView(canAccessView("dashboard") ? "dashboard" : "pos");
    renderAll();
    promptOpeningCash();
  });

  $("logoutButton").addEventListener("click", () => {
    addAudit("logout", state.currentUser?.username || "sin_sesion", {});
    state.currentUser = null;
    persistState();
    $("passwordInput").value = "";
    $("mainView").classList.add("hidden");
    $("loginView").classList.remove("hidden");
  });

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  $("dashboardNewSaleButton").addEventListener("click", () => showView("pos"));
  $("dashboardProductsButton").addEventListener("click", () => showView("products"));
  $("dashboardReportsButton").addEventListener("click", () => showView("reports"));
  $("dashboardBackupButton").addEventListener("click", () => showView("backup"));

  document.querySelectorAll(".segment").forEach((button) => {
    button.addEventListener("click", () => {
      state.payType = button.dataset.payType;
      document.querySelectorAll(".segment").forEach((item) => item.classList.toggle("active", item === button));
      renderCart();
    });
  });

  $("productSearch").addEventListener("input", renderProductResults);
  $("productSearch").addEventListener("keydown", (event) => {
    if (state.business.scanner.enabled !== "yes") return;
    if (state.business.scanner.suffix !== event.key) return;
    event.preventDefault();
    const code = $("productSearch").value.trim();
    if (!handleBarcodeScan(code) && state.business.scanner.autoAdd !== "yes") {
      renderProductResults();
    }
  });
  $("productCode").addEventListener("keydown", (event) => {
    if (state.business.scanner.enabled !== "yes" || state.business.scanner.captureOnProduct !== "yes") return;
    if (state.business.scanner.suffix !== event.key) return;
    event.preventDefault();
    $("productCode").value = $("productCode").value.trim();
    showToast("Codigo capturado para el producto.");
  });
  $("productResults").addEventListener("click", (event) => {
    const code = event.target.dataset.add;
    if (code) addProductToCart(code);
  });
  $("addFirstMatchButton").addEventListener("click", () => {
    const first = $("productResults").querySelector("[data-add]");
    if (first) addProductToCart(first.dataset.add);
  });
  $("cartItems").addEventListener("input", (event) => {
    const code = event.target.dataset.qty;
    if (!code) return;
    const item = state.cart.find((entry) => entry.code === code);
    if (item) {
      const product = state.products.find((entry) => entry.code === code);
      const requested = Math.max(1, Number(event.target.value || 1));
      item.quantity = product && !product.service ? Math.min(requested, Number(product.stock || 0)) : requested;
      if (product && !product.service && requested > Number(product.stock || 0)) {
        showToast(`Solo hay ${product.stock} disponible(s).`);
      }
    }
    renderCart();
  });
  $("cartItems").addEventListener("click", (event) => {
    const code = event.target.dataset.remove;
    if (!code) return;
    state.cart = state.cart.filter((item) => item.code !== code);
    renderCart();
  });
  $("discountInput").addEventListener("input", renderCart);
  $("paymentMethodSelect").addEventListener("change", updateChangeDue);
  $("paymentCustomerSelect").addEventListener("change", () => {
    const customer = state.customers.find((entry) => entry.code === $("paymentCustomerSelect").value);
    $("fiscalCustomerIdInput").value = customer?.taxId || "";
  });
  $("amountReceivedInput").addEventListener("input", updateChangeDue);
  $("creditInitialPaymentInput").addEventListener("input", updateChangeDue);
  $("creditCashReceivedInput").addEventListener("input", updateChangeDue);
  $("clearCartButton").addEventListener("click", () => {
    state.cart = [];
    renderCart();
  });
  $("finishSaleButton").addEventListener("click", finishSale);
  $("confirmPaymentButton").addEventListener("click", confirmPayment);
  $("closeCashFromPosButton").addEventListener("click", closeCash);
  $("newProductButton").addEventListener("click", clearProductForm);
  $("scanProductCodeButton").addEventListener("click", () => {
    $("productCode").focus();
    $("productCode").select();
    showToast("Escanea el codigo en el campo del producto.");
  });
  $("saveProductButton").addEventListener("click", saveProduct);
  $("saveSupplierButton").addEventListener("click", saveSupplier);
  $("newCategoryButton").addEventListener("click", clearCategoryForm);
  $("saveCategoryButton").addEventListener("click", saveCategory);
  $("newCustomerButton").addEventListener("click", clearCustomerForm);
  $("saveCustomerButton").addEventListener("click", saveCustomer);
  $("saveInventoryButton").addEventListener("click", saveInventory);
  $("savePaymentButton").addEventListener("click", savePayment);
  $("clearSupplierInvoiceButton").addEventListener("click", clearSupplierInvoiceForm);
  $("saveSupplierInvoiceButton").addEventListener("click", saveSupplierInvoice);
  $("supplierInvoiceTable").addEventListener("click", (event) => {
    if (event.target.dataset.editSupplierInvoice) editSupplierInvoice(event.target.dataset.editSupplierInvoice);
    if (event.target.dataset.deleteSupplierInvoice) deleteSupplierInvoice(event.target.dataset.deleteSupplierInvoice);
  });
  $("saveOpeningCashButton").addEventListener("click", saveOpeningCash);
  $("confirmOpeningCashButton").addEventListener("click", saveOpeningCash);
  $("closeCashButton").addEventListener("click", closeCash);
  $("printInvoiceButton").addEventListener("click", () => printDocument("invoice"));
  $("printCashCutButton").addEventListener("click", () => printDocument("cashCut"));
  $("editInvoiceButton").addEventListener("click", () => {
    closeModal("invoiceModal");
    openEditInvoice(state.activeSaleFolio);
  });
  $("saveInvoiceEditButton").addEventListener("click", saveInvoiceEdit);
  $("editInvoiceItems").addEventListener("click", (event) => {
    const code = event.target.dataset.removeEditItem;
    if (!code) return;
    document.querySelector(`[data-edit-item-row="${code}"]`)?.remove();
  });
  $("confirmReturnButton").addEventListener("click", confirmReturn);
  document.querySelectorAll("[data-close-modal]").forEach((button) => {
    button.addEventListener("click", () => closeModal(button.dataset.closeModal));
  });
  $("historyDateInput").addEventListener("change", renderHistory);
  $("todayHistoryButton").addEventListener("click", () => {
    $("historyDateInput").value = todayISODate();
    renderHistory();
  });
  $("historyTable").addEventListener("click", (event) => {
    const reprint = event.target.dataset.reprint;
    const edit = event.target.dataset.editInvoice;
    const ret = event.target.dataset.return;
    if (reprint) openInvoiceByFolio(reprint);
    if (edit) openEditInvoice(edit);
    if (ret) openReturnModal(ret);
  });
  $("productTable").addEventListener("click", (event) => {
    if (event.target.dataset.editProduct) editProduct(event.target.dataset.editProduct);
    if (event.target.dataset.deleteProduct) deleteProduct(event.target.dataset.deleteProduct);
  });
  $("categoryTable").addEventListener("click", (event) => {
    if (event.target.dataset.editCategory) editCategory(event.target.dataset.editCategory);
    if (event.target.dataset.deleteCategory) deleteCategory(event.target.dataset.deleteCategory);
  });
  $("customerTable").addEventListener("click", (event) => {
    if (event.target.dataset.editCustomer) editCustomer(event.target.dataset.editCustomer);
    if (event.target.dataset.deleteCustomer) deleteCustomer(event.target.dataset.deleteCustomer);
  });
  $("newUserButton").addEventListener("click", clearUserForm);
  $("saveUserButton").addEventListener("click", saveUser);
  $("usersTable").addEventListener("click", (event) => {
    if (event.target.dataset.editUser) editUser(event.target.dataset.editUser);
    if (event.target.dataset.deleteUser) deleteUser(event.target.dataset.deleteUser);
  });
  clearSupplierInvoiceForm();
  $("openResetSystemButton").addEventListener("click", () => openModal("resetSystemModal"));
  $("resetDemoButton").addEventListener("click", () => applyInstallChoice("demo"));
  $("resetCleanButton").addEventListener("click", () => applyInstallChoice("clean"));
  $("installKeepDemoButton").addEventListener("click", () => applyInstallChoice("demo"));
  $("installCleanButton").addEventListener("click", () => applyInstallChoice("clean"));
  $("refreshReportsButton").addEventListener("click", renderReports);
  $("reportDateInput").addEventListener("change", renderReports);
  $("exportBackupButton").addEventListener("click", exportBackup);
  $("exportDemoBackupButton").addEventListener("click", exportDemoBackup);
  $("loadDemoButton").addEventListener("click", loadDemoState);
  $("copyBackupButton").addEventListener("click", async () => {
    $("backupTextArea").select();
    try {
      await navigator.clipboard.writeText($("backupTextArea").value);
      showToast("Backup copiado.");
    } catch {
      showToast("Selecciona el texto y copialo manualmente.");
    }
  });
  $("restoreBackupButton").addEventListener("click", () => restoreBackupFromText($("backupTextArea").value));
  $("importBackupInput").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    restoreBackupFromText(await file.text());
  });
  $("saveInvoiceDesignButton").addEventListener("click", () => {
    if (!requirePermission("invoiceDesign:write", "No tienes permisos para personalizar facturas.")) return;
    state.business.invoiceDesign = {
      ...state.business.invoiceDesign,
      title: sanitizeText($("invoiceDesignTitle").value, 80) || "Factura",
      series: sanitizeText($("invoiceDesignSeries").value, 20) || "A",
      showLogo: $("invoiceDesignShowLogo").value,
      showQr: $("invoiceDesignShowQr").value,
      showTax: $("invoiceDesignShowTax").value,
      format: $("invoiceDesignFormat").value,
      mode: $("invoiceDesignMode").value,
      legalText: sanitizeText($("invoiceDesignLegalText").value, 220),
      customHtml: sanitizeTemplateHtml($("invoiceCustomHtml").value || defaultCustomInvoiceHtml()),
      customCss: sanitizeTemplateHtml($("invoiceCustomCss").value || defaultCustomInvoiceCss())
    };
    addAudit("invoice_design_updated", "factura", {});
    persistState();
    renderInvoiceDesigner();
    showToast("Diseño de factura guardado.");
  });
  $("invoiceLogoInput").addEventListener("change", async (event) => {
    if (!requirePermission("invoiceDesign:write", "No tienes permisos para personalizar facturas.")) return;
    const file = event.target.files[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|webp|svg\+xml)$/i.test(file.type || "")) {
      showToast("Selecciona un logo PNG, JPG, WEBP o SVG.");
      return;
    }
    state.business.invoiceDesign.logoDataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    addAudit("invoice_logo_uploaded", file.name, { size: file.size });
    persistState();
    renderInvoiceDesigner();
    showToast("Logo de factura cargado.");
  });
  $("invoiceHtmlTemplateInput").addEventListener("change", async (event) => {
    if (!requirePermission("invoiceDesign:write", "No tienes permisos para importar plantillas.")) return;
    const file = event.target.files[0];
    if (!file) return;
    if (!/\.(html|htm|txt)$/i.test(file.name)) {
      showToast("Selecciona una plantilla .html, .htm o .txt.");
      return;
    }
    state.business.invoiceDesign.customHtml = sanitizeTemplateHtml(await file.text());
    state.business.invoiceDesign.mode = "custom";
    addAudit("invoice_html_template_imported", file.name, { size: file.size });
    persistState();
    renderInvoiceDesigner();
    showToast("Plantilla HTML activa.");
  });
  $("invoiceTemplateInput").addEventListener("change", async (event) => {
    if (!requirePermission("invoiceDesign:write", "No tienes permisos para importar plantillas.")) return;
    const file = event.target.files[0];
    if (!file) return;
    const allowed = /\.(xlsx|xls)$/i.test(file.name);
    if (!allowed) {
      showToast("Selecciona una plantilla Excel .xls o .xlsx.");
      return;
    }
    let parsedTemplate;
    try {
      parsedTemplate = await parseXlsxTemplate(file);
    } catch (error) {
      showToast(error.message || "No se pudo leer la plantilla Excel.");
      return;
    }
    state.business.invoiceDesign.excelTemplate = {
      name: file.name,
      size: file.size,
      type: file.type || "application/vnd.ms-excel",
      importedAt: new Date().toISOString(),
      sheets: parsedTemplate.sheets,
      placeholders: parsedTemplate.placeholders,
      dataUrl: await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      })
    };
    state.business.invoiceDesign.mode = "excel";
    addAudit("invoice_template_imported", file.name, { size: file.size });
    persistState();
    renderInvoiceDesigner();
    showToast(`Plantilla Excel activa con ${parsedTemplate.placeholders.length} campo(s).`);
  });
  $("detectScannerButton").addEventListener("click", async () => {
    await detectBarcodeScanner();
    $("scannerTestInput").value = "";
    $("scannerTestInput").focus();
    scannerTestStartedAt = performance.now();
    $("scannerStatusText").textContent = `${state.business.scanner.hardwareStatus || "Prueba iniciada"} Escanea una etiqueta ahora para confirmar lectura tipo teclado.`;
  });
  $("scannerTestInput").addEventListener("keydown", (event) => {
    if (!scannerTestStartedAt) scannerTestStartedAt = performance.now();
    if (event.key === state.business.scanner.suffix || event.key === "Enter" || event.key === "Tab") {
      window.setTimeout(() => {
        const code = $("scannerTestInput").value.trim();
        const elapsed = Math.max(1, performance.now() - scannerTestStartedAt);
        const isFast = code.length >= Number(state.business.scanner.minLength || 6) && elapsed < 900;
        if (isFast) {
          state.business.scanner.lastDetectedAt = new Date().toISOString();
          state.business.scanner.hardwareStatus = "Lectura tipo teclado confirmada";
          $("scannerStatusText").textContent = `Lector detectado: ${code.length} caracteres en ${Math.round(elapsed)} ms.`;
          persistState();
        } else if (code) {
          $("scannerStatusText").textContent = "Entrada recibida, pero parece escritura manual. Revisa sufijo y longitud minima.";
        }
        scannerTestStartedAt = 0;
      }, 0);
    }
  });
  document.addEventListener("keydown", (event) => {
    if (state.business.scanner.enabled !== "yes") return;
    if ($("pos").classList.contains("hidden")) return;
    if (["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)) return;
    if (event.key === state.business.scanner.suffix && state.business.scanner.suffix !== "none") {
      event.preventDefault();
      handleBarcodeScan(scanBuffer);
      scanBuffer = "";
      return;
    }
    if (event.key.length !== 1) return;
    window.clearTimeout(scanTimer);
    scanBuffer += event.key;
    scanTimer = window.setTimeout(() => {
      if (scanBuffer.length >= Number(state.business.scanner.minLength || 3)) {
        handleBarcodeScan(scanBuffer);
      }
      scanBuffer = "";
    }, 80);
  });
  $("saveSettingsButton").addEventListener("click", () => {
    if (!requirePermission("settings:write", "Solo administradores pueden cambiar configuracion.")) return;
    state.business = {
      name: sanitizeText($("businessName").value, 120) || "Daryez Smart Point",
      phone: sanitizeText($("businessPhone").value, 40),
      address: sanitizeText($("businessAddress").value, 180),
      ticketMessage: sanitizeText($("ticketMessage").value, 180),
      theme: $("brandTheme").value,
      ticketWidth: $("ticketWidth").value,
      ticketHeaderText: sanitizeText($("ticketHeaderText").value, 120),
      ticketFooterText: sanitizeText($("ticketFooterText").value, 160),
      ticketShowAddress: $("ticketShowAddress").value,
      scanner: {
        enabled: $("scannerEnabled").value,
        autoAdd: $("scannerAutoAdd").value,
        suffix: $("scannerSuffix").value,
        minLength: Number($("scannerMinLength").value || 6),
        focusOnSale: $("scannerFocusOnSale").value,
        captureOnProduct: $("scannerCaptureOnProduct").value,
        lastDetectedAt: state.business.scanner.lastDetectedAt || "",
        hardwareStatus: state.business.scanner.hardwareStatus || "Sin verificacion",
        hidSupported: state.business.scanner.hidSupported || false
      },
      inventory: {
        lowStockAlertsEnabled: $("lowStockAlertsEnabled").value,
        defaultMinStock: Number($("defaultMinStock").value || 0),
        autoInventoryOnCreate: $("autoInventoryOnCreate").value
      },
      regional: {
        currency: sanitizeText($("currencyCode").value, 3).toUpperCase() || "MXN",
        locale: state.business.regional.locale || "es-MX",
        taxName: sanitizeText($("taxName").value, 30) || "IVA",
        taxRate: Math.max(0, Number($("taxRate").value || 0)) / 100,
        invoicePrefix: sanitizeText($("invoicePrefix").value, 10).toUpperCase() || "DSP",
        themeMode: $("themeMode").value
      },
      fiscal: {
        ...state.business.fiscal,
        enabled: $("fiscalEnabled").value,
        issuerRnc: sanitizeText($("businessFiscalId").value, 40),
        defaultType: $("defaultFiscalType").value,
        sequences: {
          B01: { ...state.business.fiscal.sequences.B01, next: Math.max(1, Number($("fiscalNextB01").value || 1)) },
          B02: { ...state.business.fiscal.sequences.B02, next: Math.max(1, Number($("fiscalNextB02").value || 1)) },
          B14: { ...state.business.fiscal.sequences.B14, next: Math.max(1, Number($("fiscalNextB14").value || 1)) },
          B15: { ...state.business.fiscal.sequences.B15, next: Math.max(1, Number($("fiscalNextB15").value || 1)) }
        }
      },
      invoiceDesign: state.business.invoiceDesign
    };
    state.products = state.products.map((product) => ({
      ...product,
      minStock: product.service ? 0 : Math.max(0, Number(product.minStock ?? state.business.inventory.defaultMinStock))
    }));
    showToast("Configuracion guardada.");
    addAudit("settings_updated", "business", {});
    persistState();
    renderAll();
  });
}

function startClock() {
  const update = () => {
    $("clockText").textContent = new Date().toLocaleString("es-MX", {
      dateStyle: "medium",
      timeStyle: "short"
    });
  };
  update();
  window.setInterval(update, 30000);
}

window.addEventListener("error", (event) => {
  handleGlobalError(event.message || "Error de ejecucion", {
    source: event.filename || "",
    line: event.lineno || 0
  });
});

window.addEventListener("unhandledrejection", (event) => {
  handleGlobalError(event.reason?.message || "Promesa rechazada", {});
});

wireEvents();
startClock();
renderAll();
if (FRESH_INSTALLATION) {
  openModal("installChoiceModal");
}
