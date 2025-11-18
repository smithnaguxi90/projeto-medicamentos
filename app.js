// IIFE (Immediately Invoked Function Expression) para encapsular o código
(function () {
  // Referências do DOM
  const dom = {
    startDateInput: document.getElementById("startDate"),
    generateButton: document.getElementById("generateButton"),
    clearButton: document.getElementById("clearButton"),
    exportButton: document.getElementById("exportButton"),
    importButton: document.getElementById("importButton"),
    printButton: document.getElementById("printButton"),
    fileInput: document.getElementById("fileInput"),
    scheduleTableContainer: document.getElementById("scheduleTableContainer"),
    scheduleBody: document.getElementById("scheduleBody"),
    messageBox: document.getElementById("messageBox"),
    progressSection: document.getElementById("progressSection"),
    progressText: document.getElementById("progressText"),
    progressBar: document.getElementById("progressBar"),
    displayStartDate: document.getElementById("displayStartDate"),
    displayEndDate: document.getElementById("displayEndDate"),
    warningBox: document.getElementById("warningBox"),
  };

  const STORAGE_KEY = "medicationPlanData";
  const TOTAL_DAYS = 60;
  const WARNING_DAYS_REMAINING = 15;

  // ... existing helper functions (dateToKey, formatDateBR, parseDateString) ...
  function dateToKey(date) {
    return date.toISOString().split("T")[0];
  }
  function formatDateBR(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }
  function parseDateString(dateString) {
    const parts = dateString.split("-");
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function showMessage(text, type) {
    dom.messageBox.textContent = text;
    dom.messageBox.className =
      type === "error"
        ? "mt-4 p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg no-print text-sm md:text-base"
        : "mt-4 p-4 bg-green-100 text-green-700 border border-green-200 rounded-lg no-print text-sm md:text-base";
    dom.messageBox.style.display = "block";
  }

  // ... existing functions (updateProgress, saveState, loadState, clearState, exportData, triggerImport, handleFileImport) ...
  function updateProgress(daysData) {
    const completedDays = Object.values(daysData).filter(Boolean).length;
    const percent = (completedDays / TOTAL_DAYS) * 100;
    dom.progressText.textContent = completedDays;
    dom.progressBar.style.width = `${percent}%`;
    dom.progressBar.textContent = `${Math.round(percent)}%`;
    const daysRemaining = TOTAL_DAYS - completedDays;
    if (completedDays === TOTAL_DAYS) {
      dom.warningBox.textContent = `Parabéns! Você concluiu o tratamento de 60 dias.`;
      dom.warningBox.className =
        "mt-4 p-4 bg-green-100 text-green-700 border border-green-200 rounded-lg shadow-sm no-print text-sm md:text-base";
    } else if (daysRemaining <= WARNING_DAYS_REMAINING) {
      dom.warningBox.textContent = `Atenção: Restam ${daysRemaining} dias de tratamento. Verifique a necessidade de renovar sua receita.`;
      dom.warningBox.className =
        "mt-4 p-4 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg shadow-sm no-print text-sm md:text-base";
    } else {
      dom.warningBox.className = "hidden no-print";
    }
  }
  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error(e);
      showMessage("Erro ao salvar.", "error");
    }
  }
  function loadState() {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? JSON.parse(s) : null;
    } catch (e) {
      return null;
    }
  }
  function clearState() {
    if (confirm("Tem certeza que deseja apagar todos os dados?")) {
      localStorage.removeItem(STORAGE_KEY);
      dom.scheduleBody.innerHTML = "";
      dom.scheduleTableContainer.style.display = "none";
      dom.progressSection.style.display = "none";
      dom.messageBox.className = "hidden";
      dom.warningBox.className = "hidden";
      dom.startDateInput.value = dateToKey(new Date());
      showMessage("Dados limpos.", "success");
    }
  }
  function exportData() {
    const data = loadState();
    if (!data) {
      showMessage("Sem dados.", "error");
      return;
    }
    const s =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(data));
    const a = document.createElement("a");
    a.href = s;
    a.download = "medicacao_backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    showMessage("Backup salvo!", "success");
  }
  function triggerImport() {
    dom.fileInput.click();
  }
  function handleFileImport(e) {
    const f = e.target.files[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = function (ev) {
      try {
        const d = JSON.parse(ev.target.result);
        if (d.startDate && d.days) {
          saveState(d);
          initializeApp();
          showMessage("Restaurado!", "success");
        } else {
          throw new Error();
        }
      } catch (err) {
        showMessage("Arquivo inválido.", "error");
      }
    };
    r.readAsText(f);
    e.target.value = "";
  }

  /**
   * Cria uma linha (TR) para a tabela com classes RESPONSIVAS
   */
  function createTableRow(dayNumber, date, dateKey, isChecked) {
    const row = document.createElement("tr");
    row.classList.toggle("completed", isChecked);

    // Classes comuns para células: padding reduzido no mobile, normal no desktop
    const cellClasses =
      "px-2 py-2 md:px-4 md:py-3 whitespace-nowrap text-xs md:text-sm text-gray-700";
    const headerCellClasses =
      "px-2 py-2 md:px-4 md:py-3 whitespace-nowrap text-xs md:text-sm font-medium text-gray-900";

    // Célula Dia
    const cellDay = document.createElement("td");
    cellDay.className = headerCellClasses;
    cellDay.textContent = dayNumber;
    row.appendChild(cellDay);

    // Célula Data
    const cellDate = document.createElement("td");
    cellDate.className = cellClasses;
    cellDate.textContent = formatDateBR(date);
    row.appendChild(cellDate);

    // Célula Carbamazepina (Texto responsivo)
    const cellCarb = document.createElement("td");
    cellCarb.className = cellClasses;
    // No mobile mostra só o número, no desktop mostra "X comps."
    cellCarb.innerHTML = `<span class="md:hidden">3</span><span class="hidden md:inline">3 comps.</span>`;
    row.appendChild(cellCarb);

    // Célula Frisium (Texto responsivo)
    const cellFris = document.createElement("td");
    cellFris.className = cellClasses;
    cellFris.innerHTML = `<span class="md:hidden">2</span><span class="hidden md:inline">2 comps.</span>`;
    row.appendChild(cellFris);

    // Célula Status
    const cellStatus = document.createElement("td");
    cellStatus.className =
      "px-2 py-2 md:px-4 md:py-3 whitespace-nowrap text-xs md:text-sm text-center";

    if (isChecked) {
      cellStatus.innerHTML = `<svg class="h-5 w-5 md:h-6 md:w-6 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`;
    } else {
      cellStatus.innerHTML = `<svg class="h-5 w-5 md:h-6 md:w-6 text-gray-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>`;
    }

    row.appendChild(cellStatus);
    return row;
  }

  // ... existing handleGenerateClick and initializeApp ...
  function handleGenerateClick() {
    const startDateString = dom.startDateInput.value;
    if (!startDateString) {
      showMessage("Selecione uma data.", "error");
      return;
    }
    dom.messageBox.className = "hidden";
    const startDate = parseDateString(startDateString);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + TOTAL_DAYS - 1);
    const todayKey = dateToKey(new Date());
    const newDaysData = {};
    dom.scheduleBody.innerHTML = "";
    for (let i = 0; i < TOTAL_DAYS; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      const dateKey = dateToKey(currentDate);
      const isChecked = dateKey <= todayKey;
      newDaysData[dateKey] = isChecked;
      const row = createTableRow(i + 1, currentDate, dateKey, isChecked);
      dom.scheduleBody.appendChild(row);
    }
    const newState = { startDate: startDateString, days: newDaysData };
    saveState(newState);
    dom.displayStartDate.textContent = formatDateBR(startDate);
    dom.displayEndDate.textContent = formatDateBR(endDate);
    dom.progressSection.style.display = "block";
    dom.scheduleTableContainer.style.display = "block";
    updateProgress(newDaysData);
    showMessage("Plano atualizado.", "success");
  }

  function initializeApp() {
    dom.generateButton.addEventListener("click", handleGenerateClick);
    dom.clearButton.addEventListener("click", clearState);
    dom.exportButton.addEventListener("click", exportData);
    dom.importButton.addEventListener("click", triggerImport);
    dom.fileInput.addEventListener("change", handleFileImport);
    dom.printButton.addEventListener("click", () => window.print());
    dom.startDateInput.value = dateToKey(new Date());
    const planData = loadState();
    if (planData) {
      dom.startDateInput.value = planData.startDate;
      handleGenerateClick();
    }
  }

  document.addEventListener("DOMContentLoaded", initializeApp);
})();
