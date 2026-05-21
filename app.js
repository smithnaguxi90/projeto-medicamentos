import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  initializeFirestore,
  persistentLocalCache,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- CONFIGURAÇÕES ---
const CONSTANTS = {
  TOTAL_DAYS: 60,
  WARNING_DAYS: 15,
  FIREBASE_CONFIG: {
    apiKey: "AIzaSyCcRdZxFrTDo2LrlX-qyP_FMODz1ySdmWg",
    authDomain: "controle-medicamentos-2fce6.firebaseapp.com",
    projectId: "controle-medicamentos-2fce6",
    storageBucket: "controle-medicamentos-2fce6.firebasestorage.app",
    messagingSenderId: "355226547271",
    appId: "1:355226547271:web:cc642e0031bae4329d6d62",
  },
};

// --- SISTEMA DE NOTIFICAÇÕES (TOASTS) ---
const Notifications = {
  container: document.getElementById("toastContainer"),
  show(message, type = "success") {
    const toast = document.createElement("div");

    const styles = {
      success: "bg-emerald-50 border-emerald-200 text-emerald-800",
      error: "bg-red-50 border-red-200 text-red-800",
      info: "bg-blue-50 border-blue-200 text-blue-800",
    };

    const icons = {
      success:
        '<svg class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
      error:
        '<svg class="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
      info: '<svg class="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    };

    toast.className = `flex items-center w-full md:w-auto gap-3 p-4 pr-6 rounded-xl border shadow-lg toast-enter pointer-events-auto ${styles[type]}`;
    toast.innerHTML = `${icons[type]} <span class="font-medium text-sm">${message}</span>`;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.classList.replace("toast-enter", "toast-exit");
      setTimeout(() => toast.remove(), 400);
    }, 4000);
  },
};

// --- UTILITÁRIOS ---
const Utils = {
  dateToKey: (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  },
  formatDateBR: (date) => {
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  },
  parseDateString: (dateStr) => {
    const parts = dateStr.split("-");
    return new Date(parts[0], parts[1] - 1, parts[2]);
  },
};

// --- CONTROLADOR DA UI ---
const UI = {
  elements: {
    loginScreen: document.getElementById("loginScreen"),
    loginForm: document.getElementById("loginForm"),
    emailInput: document.getElementById("emailInput"),
    passwordInput: document.getElementById("passwordInput"),
    loginSubmitBtn: document.getElementById("loginSubmitBtn"),
    logoutBtn: document.getElementById("logoutBtn"),
    startDate: document.getElementById("startDate"),
    generateBtn: document.getElementById("generateButton"),
    clearBtn: document.getElementById("clearButton"),
    exportBtn: document.getElementById("exportButton"),
    importBtn: document.getElementById("importButton"),
    printBtn: document.getElementById("printButton"),
    fileInput: document.getElementById("fileInput"),
    tableContainer: document.getElementById("scheduleTableContainer"),
    tableBody: document.getElementById("scheduleBody"),
    countdownSection: document.getElementById("countdownSection"),
    countdownDays: document.getElementById("countdownDays"),
    quickActionSection: document.getElementById("quickActionSection"),
    markTodayBtn: document.getElementById("markTodayBtn"),
    progressSection: document.getElementById("progressSection"),
    progressText: document.getElementById("progressText"),
    progressBar: document.getElementById("progressBar"),
    displayStartDate: document.getElementById("displayStartDate"),
    displayEndDate: document.getElementById("displayEndDate"),
    warningBox: document.getElementById("warningBox"),
    warningTitle: document.getElementById("warningTitle"),
    warningMessage: document.getElementById("warningMessage"),
    warningIcon: document.getElementById("warningIcon"),
    cloudStatus: document.getElementById("cloudStatus"),
    cloudStatusText: document.getElementById("cloudStatusText"),
    cloudPing: document.getElementById("cloudPing"),
    cloudDot: document.getElementById("cloudDot"),
    confirmModal: document.getElementById("confirmModal"),
    modalContent: document.getElementById("modalContent"),
    cancelDeleteBtn: document.getElementById("cancelDeleteBtn"),
    confirmDeleteBtn: document.getElementById("confirmDeleteBtn"),
  },

  updateCloudStatus(state) {
    const { cloudStatus, cloudStatusText, cloudPing, cloudDot } = this.elements;
    cloudStatus.className =
      "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm transition-colors duration-300";

    switch (state) {
      case "connecting":
        cloudStatus.classList.add(
          "bg-slate-100",
          "text-slate-600",
          "border",
          "border-slate-200",
        );
        cloudStatusText.textContent = "Sincronizando...";
        cloudPing.className =
          "animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75";
        cloudDot.className =
          "relative inline-flex rounded-full h-2 w-2 bg-slate-500";
        break;
      case "connected":
        cloudStatus.classList.add(
          "bg-emerald-50",
          "text-emerald-700",
          "border",
          "border-emerald-200",
        );
        cloudStatusText.textContent = "Sincronizado na Nuvem";
        cloudPing.className = "hidden";
        cloudDot.className =
          "relative inline-flex rounded-full h-2 w-2 bg-emerald-500";
        break;
      case "offline":
        cloudStatus.classList.add(
          "bg-amber-50",
          "text-amber-700",
          "border",
          "border-amber-200",
        );
        cloudStatusText.textContent = "Modo Offline (Salvo Localmente)";
        cloudPing.className = "hidden";
        cloudDot.className =
          "relative inline-flex rounded-full h-2 w-2 bg-amber-500";
        break;
      case "error":
        cloudStatus.classList.add(
          "bg-red-50",
          "text-red-700",
          "border",
          "border-red-200",
        );
        cloudStatusText.textContent = "Erro no Banco de Dados";
        cloudPing.className = "hidden";
        cloudDot.className =
          "relative inline-flex rounded-full h-2 w-2 bg-red-500";
        break;
    }
  },

  setLoading(buttonElem, isLoading, originalText) {
    if (isLoading) {
      buttonElem.disabled = true;
      buttonElem.classList.add("opacity-75", "cursor-not-allowed");
      buttonElem.innerHTML = `<svg class="animate-spin -ml-1 mr-2 h-5 w-5 text-current inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Processando...`;
    } else {
      buttonElem.disabled = false;
      buttonElem.classList.remove("opacity-75", "cursor-not-allowed");
      buttonElem.innerHTML = originalText;
    }
  },

  showModal(onConfirm) {
    this.elements.confirmModal.classList.remove("hidden");
    setTimeout(() => {
      this.elements.modalContent.classList.remove("scale-95");
      this.elements.modalContent.classList.add("scale-100");
    }, 10);

    const close = () => {
      this.elements.modalContent.classList.remove("scale-100");
      this.elements.modalContent.classList.add("scale-95");
      setTimeout(() => this.elements.confirmModal.classList.add("hidden"), 200);
      this.cleanupModal();
    };

    this.elements.cancelDeleteBtn.onclick = close;
    this.elements.confirmDeleteBtn.onclick = () => {
      onConfirm();
      close();
    };
  },

  cleanupModal() {
    this.elements.cancelDeleteBtn.onclick = null;
    this.elements.confirmDeleteBtn.onclick = null;
  },

  renderRow(dayNumber, date, dateKey, isChecked) {
    const row = document.createElement("tr");
    row.className = `transition-colors select-none border-b border-slate-100 ${isChecked ? "completed" : ""}`;

    const cellClass =
      "px-1 md:px-4 py-3 text-[11px] md:text-sm whitespace-nowrap";

    const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const dateStr = `<span class="text-slate-400 mr-1 text-[10px] md:text-xs w-5 md:w-6 inline-block">${weekDays[date.getDay()]}</span> <span class="font-medium">${Utils.formatDateBR(date)}</span>`;

    const checkIcon = `<div class="bg-emerald-100 p-1 rounded-full inline-flex shadow-sm"><svg class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg></div>`;
    const pendingIcon = `<div class="bg-slate-100 p-1 rounded-full inline-flex border border-slate-200"><svg class="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>`;

    // Destaca visualmente a linha do dia de hoje
    const todayKey = Utils.dateToKey(new Date());
    if (dateKey === todayKey) {
      row.classList.add("bg-blue-50/30");
    }

    row.innerHTML = `
      <td class="${cellClass} font-bold text-slate-400 text-center">#${String(dayNumber).padStart(2, "0")}</td>
      <td class="${cellClass}">${dateStr} ${dateKey === todayKey ? '<span class="ml-1 md:ml-2 bg-brand-100 text-brand-700 text-[9px] md:text-[10px] px-1.5 md:px-2 py-0.5 rounded-full font-bold uppercase">Hoje</span>' : ""}</td>
      <td class="${cellClass} font-bold text-brand-600 text-center"><span class="md:hidden text-[13px]">3</span><span class="hidden md:inline">3 comps.</span></td>
      <td class="${cellClass} font-bold text-emerald-600 text-center"><span class="md:hidden text-[13px]">2</span><span class="hidden md:inline">2 comps.</span></td>
      <td class="${cellClass} text-center">${isChecked ? checkIcon : pendingIcon}</td>
    `;
    return row;
  },

  renderPlan(planData) {
    this.elements.tableBody.innerHTML = "";

    if (!planData || !planData.startDate || !planData.days) {
      this.elements.tableContainer.classList.add("hidden");
      this.elements.progressSection.classList.add("hidden");
      this.elements.quickActionSection.classList.add("hidden");
      this.elements.countdownSection.classList.add("hidden");
      this.elements.warningBox.classList.add("hidden");
      return;
    }

    const startDate = Utils.parseDateString(planData.startDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + CONSTANTS.TOTAL_DAYS - 1);

    for (let i = 0; i < CONSTANTS.TOTAL_DAYS; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateKey = Utils.dateToKey(currentDate);

      const isChecked = planData.days[dateKey] || false;
      const row = this.renderRow(i + 1, currentDate, dateKey, isChecked);

      this.elements.tableBody.appendChild(row);
    }

    this.elements.displayStartDate.textContent = Utils.formatDateBR(startDate);
    this.elements.displayEndDate.textContent = Utils.formatDateBR(endDate);

    this.elements.progressSection.classList.remove("hidden");
    this.elements.countdownSection.classList.remove("hidden");
    this.elements.tableContainer.classList.remove("hidden");

    // Avalia o botão de Ação Rápida (Dose de Hoje)
    const todayKey = Utils.dateToKey(new Date());
    if (planData.days[todayKey] !== undefined) {
      this.elements.quickActionSection.classList.remove("hidden");
      if (planData.days[todayKey] === true) {
        // Já tomou
        this.elements.markTodayBtn.className =
          "w-full bg-health-50 border border-health-200 text-health-700 font-bold py-3.5 md:py-4 px-4 md:px-6 rounded-2xl flex flex-wrap items-center justify-center gap-2 md:gap-3 text-base md:text-lg cursor-default transition-all";
        this.elements.markTodayBtn.innerHTML = `<svg class="w-6 h-6 text-health-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> Dose de Hoje Registrada`;
        this.elements.markTodayBtn.disabled = true;
      } else {
        // Falta tomar
        this.elements.markTodayBtn.className =
          "w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 md:py-4 px-4 md:px-6 rounded-2xl shadow-lg shadow-emerald-200 transition-all flex flex-wrap items-center justify-center gap-2 md:gap-3 text-base md:text-lg cursor-pointer transform hover:scale-[1.01]";
        this.elements.markTodayBtn.innerHTML = `<svg class="w-6 h-6 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg> Registrar Dose de Hoje`;
        this.elements.markTodayBtn.disabled = false;
      }
    } else {
      // O plano ainda não começou ou já passou
      this.elements.quickActionSection.classList.add("hidden");
    }

    this.updateProgressAndWarnings(planData.days);
  },

  updateProgressAndWarnings(daysData) {
    const completedDays = Object.values(daysData).filter(Boolean).length;
    const percent = (completedDays / CONSTANTS.TOTAL_DAYS) * 100;

    this.elements.progressText.textContent = completedDays;
    setTimeout(() => {
      this.elements.progressBar.style.width = `${percent}%`;
    }, 50);

    const daysRemaining = CONSTANTS.TOTAL_DAYS - completedDays;

    // Atualiza o Contador Grande
    this.elements.countdownDays.textContent = daysRemaining;
    const { warningBox, warningTitle, warningMessage, warningIcon } =
      this.elements;

    if (completedDays === CONSTANTS.TOTAL_DAYS) {
      warningBox.className =
        "mb-6 p-4 rounded-xl border flex gap-3 items-start transition-all bg-emerald-50 border-emerald-200 text-emerald-800 no-print fade-in";
      warningIcon.innerHTML = `<svg class="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
      warningTitle.textContent = "Tratamento Concluído!";
      warningMessage.textContent =
        "Parabéns por completar os 60 dias do plano de medicação.";
    } else if (daysRemaining <= CONSTANTS.WARNING_DAYS) {
      warningBox.className =
        "mb-6 p-4 rounded-xl border flex gap-3 items-start transition-all bg-amber-50 border-amber-200 text-amber-800 no-print fade-in";
      warningIcon.innerHTML = `<svg class="w-6 h-6 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
      warningTitle.textContent = "Atenção: Reta Final";
      warningMessage.textContent = `Faltam apenas ${daysRemaining} dias. Por favor, verifique a necessidade de renovar sua receita médica.`;
    } else {
      warningBox.classList.add("hidden");
    }
  },
};

// --- SERVIÇO FIREBASE ---
const FirebaseAPI = {
  app: null,
  auth: null,
  db: null,
  userId: null,
  docRef: null,
  unsubscribe: null,

  init() {
    this.app = initializeApp(CONSTANTS.FIREBASE_CONFIG);
    this.auth = getAuth(this.app);

    // Firestore com Modo Offline Ativo
    this.db = initializeFirestore(this.app, {
      localCache: persistentLocalCache(),
    });

    UI.updateCloudStatus("connecting");

    window.addEventListener("online", () => UI.updateCloudStatus("connected"));
    window.addEventListener("offline", () => UI.updateCloudStatus("offline"));

    onAuthStateChanged(this.auth, (user) => {
      if (user) {
        UI.elements.loginScreen.classList.add("hidden");
        UI.elements.logoutBtn.classList.remove("hidden");
        this.userId = user.uid;
        this.docRef = doc(this.db, "users", this.userId, "planos", "principal");
        this.listenToData();
      } else {
        if (this.unsubscribe) this.unsubscribe();
        this.userId = null;
        this.docRef = null;
        UI.elements.loginScreen.classList.remove("hidden");
        UI.elements.logoutBtn.classList.add("hidden");
      }
    });
  },

  listenToData() {
    if (this.unsubscribe) this.unsubscribe();
    this.unsubscribe = onSnapshot(
      this.docRef,
      (snapshot) => {
        if (!navigator.onLine) {
          UI.updateCloudStatus("offline");
        } else {
          UI.updateCloudStatus("connected");
        }

        if (snapshot.exists()) {
          const data = snapshot.data();
          UI.elements.startDate.value = data.startDate;

          // --- MODO AUTOMÁTICO TOTAL ---
          const todayKey = Utils.dateToKey(new Date());
          let needsUpdate = false;
          const updatedDays = { ...data.days };

          for (const dateKey in updatedDays) {
            if (dateKey <= todayKey && updatedDays[dateKey] === false) {
              updatedDays[dateKey] = true;
              needsUpdate = true;
            }
          }

          if (needsUpdate) {
            updateDoc(this.docRef, { days: updatedDays }).catch(console.error);
            return; // Aguarda o banco atualizar e disparar um novo snapshot corrigido
          }
          // -----------------------------

          UI.renderPlan(data);
        } else {
          UI.elements.startDate.value = Utils.dateToKey(new Date());
          UI.renderPlan(null);
        }
      },
      (error) => {
        console.error("Firestore error:", error);
        UI.updateCloudStatus("error");
        Notifications.show("Sem permissão para ler dados.", "error");
      },
    );
  },

  async savePlan(startDateString) {
    if (!this.docRef) throw new Error("Não autenticado");

    const startDate = Utils.parseDateString(startDateString);
    const todayKey = Utils.dateToKey(new Date());
    const newDaysData = {};

    const existingData = await this.getPlanRaw();
    const existingDays = existingData?.days || {};

    for (let i = 0; i < CONSTANTS.TOTAL_DAYS; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateKey = Utils.dateToKey(currentDate);

      if (existingDays[dateKey] !== undefined) {
        newDaysData[dateKey] = existingDays[dateKey];
      } else {
        newDaysData[dateKey] = dateKey <= todayKey;
      }
    }

    await setDoc(this.docRef, {
      startDate: startDateString,
      days: newDaysData,
    });
  },

  async toggleDayStatus(dateKey, newStatus) {
    if (!this.docRef) return;
    await updateDoc(this.docRef, {
      [`days.${dateKey}`]: newStatus,
    });
  },

  async clearPlan() {
    if (!this.docRef) throw new Error("Não autenticado");
    await deleteDoc(this.docRef);
  },

  async importPlan(data) {
    if (!this.docRef) throw new Error("Não autenticado");
    await setDoc(this.docRef, data);
  },

  async getPlanRaw() {
    if (!this.docRef) throw new Error("Não autenticado");
    const snap = await getDoc(this.docRef);
    return snap.exists() ? snap.data() : null;
  },
};

// --- LÓGICA PRINCIPAL ---
const AppController = {
  init() {
    this.bindEvents();
    FirebaseAPI.init();
  },

  bindEvents() {
    UI.elements.loginForm.addEventListener("submit", (e) =>
      this.handleLogin(e),
    );
    UI.elements.logoutBtn.addEventListener("click", () => this.handleLogout());
    UI.elements.generateBtn.addEventListener("click", () =>
      this.handleGenerate(),
    );
    UI.elements.clearBtn.addEventListener("click", () => this.handleClear());
    UI.elements.exportBtn.addEventListener("click", () => this.handleExport());
    UI.elements.importBtn.addEventListener("click", () =>
      UI.elements.fileInput.click(),
    );
    UI.elements.fileInput.addEventListener("change", (e) =>
      this.handleImport(e),
    );
    UI.elements.printBtn.addEventListener("click", () => window.print());
    UI.elements.markTodayBtn.addEventListener("click", () =>
      this.handleMarkToday(),
    );
  },

  async handleLogin(e) {
    e.preventDefault();
    const email = UI.elements.emailInput.value.trim();
    const pass = UI.elements.passwordInput.value;
    const btn = UI.elements.loginSubmitBtn;
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = `<svg class="animate-spin h-5 w-5 mx-auto text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;

    try {
      // Tenta logar
      await signInWithEmailAndPassword(FirebaseAPI.auth, email, pass);
      Notifications.show("Bem-vindo de volta!", "success");
    } catch {
      // Se der erro porque a conta não existe, cria a conta na mesma hora
      try {
        await createUserWithEmailAndPassword(FirebaseAPI.auth, email, pass);
        Notifications.show("Sua nova conta foi criada!", "success");
      } catch {
        Notifications.show(
          "Erro: Verifique e-mail ou se a senha tem 6 caracteres.",
          "error",
        );
      }
    } finally {
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  },

  async handleLogout() {
    await signOut(FirebaseAPI.auth);
  },

  async handleGenerate() {
    const dateVal = UI.elements.startDate.value;
    if (!dateVal) {
      Notifications.show("Por favor, selecione uma data de início.", "error");
      return;
    }

    const originalContent = UI.elements.generateBtn.innerHTML;
    UI.setLoading(UI.elements.generateBtn, true, originalContent);

    try {
      await FirebaseAPI.savePlan(dateVal);
      Notifications.show("Plano sincronizado com sucesso!", "success");
    } catch {
      Notifications.show("Erro ao salvar na nuvem.", "error");
    } finally {
      UI.setLoading(UI.elements.generateBtn, false, originalContent);
    }
  },

  // Função do novo botão inteligente para "Dose de Hoje"
  async handleMarkToday() {
    const todayKey = Utils.dateToKey(new Date());
    const data = await FirebaseAPI.getPlanRaw();

    if (!data || !data.days || data.days[todayKey] === undefined) {
      Notifications.show(
        "O dia de hoje não faz parte do plano ativo.",
        "error",
      );
      return;
    }
    if (data.days[todayKey] === true) {
      Notifications.show("A dose de hoje já está registrada!", "info");
      return;
    }

    try {
      await FirebaseAPI.toggleDayStatus(todayKey, true);
      Notifications.show(
        "Medicação tomada e registrada com sucesso!",
        "success",
      );
    } catch (err) {
      console.error(err);
      Notifications.show("Falha ao registrar a dose.", "error");
    }
  },

  handleClear() {
    UI.showModal(async () => {
      try {
        await FirebaseAPI.clearPlan();
        Notifications.show("Todos os dados foram apagados.", "info");
      } catch {
        Notifications.show("Erro ao apagar dados.", "error");
      }
    });
  },

  async handleExport() {
    try {
      const data = await FirebaseAPI.getPlanRaw();
      if (!data) {
        Notifications.show("Não existem dados para baixar.", "info");
        return;
      }
      const blob = new Blob([JSON.stringify(data)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `medicacao_backup_${Utils.dateToKey(new Date())}.json`;
      a.click();
      URL.revokeObjectURL(url);
      Notifications.show("Backup baixado com sucesso!", "success");
    } catch {
      Notifications.show("Erro ao exportar backup.", "error");
    }
  },

  handleImport(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (data.startDate && data.days && FirebaseAPI.docRef) {
          await FirebaseAPI.importPlan(data);
          Notifications.show("Backup restaurado e sincronizado!", "success");
        } else {
          throw new Error("Formato inválido");
        }
      } catch {
        Notifications.show("Arquivo inválido ou corrompido.", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // Reset input
  },
};

// Iniciar a Aplicação
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => AppController.init());
} else {
  AppController.init();
}

// Registro do Service Worker para PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js")
      .then((reg) => console.log("Service Worker registrado com sucesso.", reg))
      .catch((err) => console.error("Erro ao registrar Service Worker:", err));
  });
}
