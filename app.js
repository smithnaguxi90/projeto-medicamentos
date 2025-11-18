// IIFE (Immediately Invoked Function Expression) para encapsular o código
(function () {
  // Referências do DOM
  const dom = {
    startDateInput: document.getElementById("startDate"),
    generateButton: document.getElementById("generateButton"),
    clearButton: document.getElementById("clearButton"),
    exportButton: document.getElementById("exportButton"), // Novo
    importButton: document.getElementById("importButton"), // Novo
    printButton: document.getElementById("printButton"), // Novo
    fileInput: document.getElementById("fileInput"), // Novo
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

  /**
   * Formata um objeto Date para 'YYYY-MM-DD'
   */
  function dateToKey(date) {
    return date.toISOString().split("T")[0];
  }

  /**
   * Formata um objeto Date para 'DD/MM/YYYY' (pt-BR)
   */
  function formatDateBR(date) {
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  /**
   * Converte uma string 'YYYY-MM-DD' para um objeto Date
   */
  function parseDateString(dateString) {
    const parts = dateString.split("-");
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  /**
   * Mostra uma mensagem na UI
   */
  function showMessage(text, type) {
    dom.messageBox.textContent = text;
    dom.messageBox.className =
      type === "error"
        ? "mt-4 p-4 bg-red-100 text-red-700 border border-red-200 rounded-lg no-print"
        : "mt-4 p-4 bg-green-100 text-green-700 border border-green-200 rounded-lg no-print";
    dom.messageBox.style.display = "block"; // Garante visibilidade
  }

  /**
   * Atualiza a barra de progresso, texto e avisos
   */
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
        "mt-4 p-4 bg-green-100 text-green-700 border border-green-200 rounded-lg shadow-sm no-print";
    } else if (daysRemaining <= WARNING_DAYS_REMAINING) {
      dom.warningBox.textContent = `Atenção: Restam ${daysRemaining} dias de tratamento. Verifique a necessidade de renovar sua receita.`;
      dom.warningBox.className =
        "mt-4 p-4 bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-lg shadow-sm no-print";
    } else {
      dom.warningBox.className = "hidden no-print";
    }
  }

  /**
   * Salva o estado atual no LocalStorage
   */
  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Não foi possível salvar os dados no LocalStorage.", e);
      showMessage("Erro ao salvar. Memória cheia ou desabilitada.", "error");
    }
  }

  /**
   * Carrega o estado do LocalStorage
   */
  function loadState() {
    try {
      const stateJSON = localStorage.getItem(STORAGE_KEY);
      return stateJSON ? JSON.parse(stateJSON) : null;
    } catch (e) {
      console.error("Erro ao carregar dados.", e);
      return null;
    }
  }

  /**
   * Limpa o estado salvo
   */
  function clearState() {
    if (
      confirm(
        "Tem certeza que deseja apagar todos os dados? Isso não pode ser desfeito."
      )
    ) {
      localStorage.removeItem(STORAGE_KEY);
      dom.scheduleBody.innerHTML = "";
      dom.scheduleTableContainer.style.display = "none";
      dom.progressSection.style.display = "none";
      dom.messageBox.className = "hidden";
      dom.warningBox.className = "hidden";
      dom.startDateInput.value = dateToKey(new Date());
      showMessage("Dados limpos com sucesso.", "success");
    }
  }

  /**
   * Exporta os dados para um arquivo JSON
   */
  function exportData() {
    const data = loadState();
    if (!data) {
      showMessage("Não há dados para exportar.", "error");
      return;
    }
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(data));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "medicacao_backup.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showMessage("Backup salvo na pasta de downloads!", "success");
  }

  /**
   * Aciona o input de arquivo para importação
   */
  function triggerImport() {
    dom.fileInput.click();
  }

  /**
   * Processa o arquivo importado
   */
  function handleFileImport(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const importedData = JSON.parse(e.target.result);
        // Validação básica
        if (importedData.startDate && importedData.days) {
          saveState(importedData);
          // Recarrega a interface
          initializeApp();
          showMessage("Backup restaurado com sucesso!", "success");
        } else {
          throw new Error("Formato inválido");
        }
      } catch (err) {
        showMessage("Erro ao restaurar: arquivo inválido.", "error");
      }
    };
    reader.readAsText(file);
    // Reseta o input para permitir carregar o mesmo arquivo novamente se necessário
    event.target.value = "";
  }

  /**
   * Cria uma linha (TR) para a tabela
   */
  function createTableRow(dayNumber, date, dateKey, isChecked) {
    const row = document.createElement("tr");
    row.classList.toggle("completed", isChecked);

    const cellDay = document.createElement("td");
    cellDay.className =
      "px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900";
    cellDay.textContent = dayNumber;
    row.appendChild(cellDay);

    const cellDate = document.createElement("td");
    cellDate.className = "px-4 py-3 whitespace-nowrap text-sm text-gray-700";
    cellDate.textContent = formatDateBR(date);
    row.appendChild(cellDate);

    const cellCarb = document.createElement("td");
    cellCarb.className = "px-4 py-3 whitespace-nowrap text-sm text-gray-700";
    cellCarb.textContent = "3 comprimidos";
    row.appendChild(cellCarb);

    const cellFris = document.createElement("td");
    cellFris.className = "px-4 py-3 whitespace-nowrap text-sm text-gray-700";
    cellFris.textContent = "2 comprimidos";
    row.appendChild(cellFris);

    const cellStatus = document.createElement("td");
    cellStatus.className = "px-4 py-3 whitespace-nowrap text-sm text-center";

    // SVG de check ou círculo
    if (isChecked) {
      cellStatus.innerHTML = `<svg class="h-6 w-6 text-green-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>`;
    } else {
      cellStatus.innerHTML = `<svg class="h-6 w-6 text-gray-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" /></svg>`;
    }

    row.appendChild(cellStatus);
    return row;
  }

  /**
   * Gera/Atualiza o plano
   */
  function handleGenerateClick() {
    const startDateString = dom.startDateInput.value;
    if (!startDateString) {
      showMessage("Por favor, selecione uma data de início.", "error");
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

    showMessage("Plano atualizado com sucesso.", "success");
  }

  function initializeApp() {
    // Listeners
    dom.generateButton.addEventListener("click", handleGenerateClick);
    dom.clearButton.addEventListener("click", clearState);
    dom.exportButton.addEventListener("click", exportData);
    dom.importButton.addEventListener("click", triggerImport);
    dom.fileInput.addEventListener("change", handleFileImport);
    dom.printButton.addEventListener("click", () => window.print());

    // Data inicial padrão
    dom.startDateInput.value = dateToKey(new Date());

    // Carregar dados
    const planData = loadState();
    if (planData) {
      dom.startDateInput.value = planData.startDate;
      // Simula o clique para regenerar a tabela visualmente com os dados carregados
      handleGenerateClick();
    }
  }

  document.addEventListener("DOMContentLoaded", initializeApp);
})();
