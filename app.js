(() => {
  const config = window.PAINEL_CONFIG || {};
  const refreshInterval = Number(config.refreshInterval) || 10000;

  const elements = {
    grid: document.querySelector("#consultantsGrid"),
    template: document.querySelector("#consultantTemplate"),
    lastUpdate: document.querySelector("#lastUpdate"),
    refreshButton: document.querySelector("#refreshButton"),
    summaryOrcReal: document.querySelector("#summaryOrcReal"),
    summaryOrcMeta: document.querySelector("#summaryOrcMeta"),
    summaryFechReal: document.querySelector("#summaryFechReal"),
    summaryFechMeta: document.querySelector("#summaryFechMeta"),
    summaryAverage: document.querySelector("#summaryAverage"),
    connectionStatus: document.querySelector("#connectionStatus"),
    updatePill: document.querySelector(".update-pill")
  };

  let currentConsultants = [];
  let currentTeam = null;

  function percentage(real, target) {
    const realNumber = Number(real) || 0;
    const targetNumber = Number(target) || 0;

    if (!targetNumber) return 0;

    return Math.max(0, Math.min(100, (realNumber / targetNumber) * 100));
  }

  function averagePerformance(person) {
    return (
      percentage(person.prospReal, person.prospMeta) +
      percentage(person.followReal, person.followMeta) +
      percentage(person.leadsReal, person.leadsMeta)
    ) / 3;
  }

  function statusFromPerformance(value) {
    if (value >= 100) {
      return { label: "Meta alcançada", color: "#6d8f73" };
    }

    if (value >= 70) {
      return { label: "Bom ritmo", color: "#b28a4a" };
    }

    return { label: "Em evolução", color: "#a96a62" };
  }

  function initials(name) {
    return String(name || "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase();
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR").format(Number(value) || 0);
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function fillMetric(card, type, real, target) {
    const valueElement = card.querySelector(`.metric-${type}-value`);
    const barElement = card.querySelector(`.metric-${type}-bar`);
    const progress = percentage(real, target);

    valueElement.textContent = `${formatNumber(real)} de ${formatNumber(target)}`;
    barElement.style.width = `${progress}%`;

    if (progress >= 100) {
      barElement.style.background = "#6d8f73";
    } else if (progress >= 60) {
      barElement.style.background = "#b28a4a";
    } else {
      barElement.style.background = "#a96a62";
    }
  }

  function renderConsultants(data) {
    const ranking = [...data].sort(
      (first, second) => averagePerformance(second) - averagePerformance(first)
    );

    elements.grid.innerHTML = "";

    data.forEach(person => {
      const fragment = elements.template.content.cloneNode(true);
      const card = fragment.querySelector(".consultant-card");
      const performance = averagePerformance(person);
      const status = statusFromPerformance(performance);
      const rankingIndex = ranking.findIndex(item => item.name === person.name);

      card.querySelector(".avatar").textContent = initials(person.name);
      card.querySelector(".consultant-name").textContent = person.name;
      card.querySelector(".performance-value").textContent = `${Math.round(performance)}%`;

      fillMetric(card, "prosp", person.prospReal, person.prospMeta);
      fillMetric(card, "follow", person.followReal, person.followMeta);
      fillMetric(card, "leads", person.leadsReal, person.leadsMeta);

      const statusElement = card.querySelector(".status-text");
      statusElement.textContent = status.label;
      statusElement.style.color = status.color;

      card.querySelector(".ranking-position").textContent =
        `${rankingIndex + 1}º da equipe`;

      elements.grid.appendChild(fragment);
    });
  }

  function renderTeamSummary(team, consultants) {
    const safeTeam = team || {
      budgetMeta: 0,
      budgetReal: 0,
      salesMeta: 0,
      salesReal: 0
    };

    const average = consultants.length
      ? consultants.reduce(
          (total, person) => total + averagePerformance(person),
          0
        ) / consultants.length
      : 0;

    elements.summaryOrcReal.textContent = formatCurrency(safeTeam.budgetReal);
    elements.summaryOrcMeta.textContent =
      `Meta ${formatCurrency(safeTeam.budgetMeta)}`;

    elements.summaryFechReal.textContent = formatCurrency(safeTeam.salesReal);
    elements.summaryFechMeta.textContent =
      `Meta ${formatCurrency(safeTeam.salesMeta)}`;

    elements.summaryAverage.textContent = `${Math.round(average)}%`;
  }

  function renderAll() {
    renderConsultants(currentConsultants);
    renderTeamSummary(currentTeam, currentConsultants);
  }

  function setConnectionState(type, message) {
    elements.updatePill.classList.remove("state-warning", "state-error");

    if (type === "warning") {
      elements.updatePill.classList.add("state-warning");
    }

    if (type === "error") {
      elements.updatePill.classList.add("state-error");
    }

    elements.connectionStatus.textContent = message;
  }

  function formatUpdateTime(date) {
    return `Atualizado às ${date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })}`;
  }

  async function loadData() {
    const apiUrl = String(config.apiUrl || "").trim();

    if (!apiUrl) {
      elements.lastUpdate.textContent = "API não configurada";
      setConnectionState("error", "Configure a API");
      return;
    }

    try {
      elements.refreshButton.disabled = true;
      setConnectionState("warning", "Atualizando");

      const separator = apiUrl.includes("?") ? "&" : "?";
      const response = await fetch(
        `${apiUrl}${separator}cache=${Date.now()}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Erro HTTP ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "A API retornou uma falha");
      }

      if (!Array.isArray(result.consultants)) {
        throw new Error("A lista de consultores não foi encontrada");
      }

      currentConsultants = result.consultants;
      currentTeam = result.team || null;

      renderAll();

      const updatedDate = result.updatedAt
        ? new Date(result.updatedAt)
        : new Date();

      elements.lastUpdate.textContent = formatUpdateTime(updatedDate);
      setConnectionState("success", "Conectado");
    } catch (error) {
      console.error("Erro ao atualizar o painel:", error);

      if (currentConsultants.length) {
        renderAll();
        elements.lastUpdate.textContent = "Mantendo os últimos dados";
      } else {
        elements.lastUpdate.textContent = "Não foi possível carregar os dados";
      }

      setConnectionState("error", "Falha na atualização");
    } finally {
      elements.refreshButton.disabled = false;
    }
  }

  elements.refreshButton.addEventListener("click", loadData);

  loadData();
  window.setInterval(loadData, refreshInterval);
})();
