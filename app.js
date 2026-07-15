(() => {
  "use strict";

  const REQUIRED_HEADERS = [
    "Tipo",
    "Nome",
    "ProspMeta",
    "ProspReal",
    "FollowMeta",
    "FollowReal",
    "LeadsMeta",
    "LeadsReal",
    "Meta",
    "Real"
  ];

  const LEVEL_GOOD_THRESHOLD = 100;
  const LEVEL_WARNING_THRESHOLD = 50;

  class CsvStructureError extends Error {}

  const config = window.PAINEL_CONFIG || {};
  const sheetUrl = String(config.sheetUrl || "").trim();
  const refreshInterval = Number(config.refreshInterval) > 0 ? Number(config.refreshInterval) : 15000;

  const elements = {
    companyName: document.querySelector("#companyName"),
    panelTitle: document.querySelector("#panelTitle"),
    connectionIndicator: document.querySelector("#connectionIndicator"),
    statusText: document.querySelector("#statusText"),
    refreshButton: document.querySelector("#refreshButton"),
    lastUpdate: document.querySelector("#lastUpdate"),
    configBanner: document.querySelector("#configBanner"),
    csvErrorBanner: document.querySelector("#csvErrorBanner"),
    csvErrorMessage: document.querySelector("#csvErrorMessage"),
    mainContent: document.querySelector("#mainContent"),
    consultantsGrid: document.querySelector("#consultantsGrid"),
    consultantTemplate: document.querySelector("#consultantTemplate"),
    emptyState: document.querySelector("#emptyState"),
    orcamentosPercent: document.querySelector("#orcamentosPercent"),
    orcamentosReal: document.querySelector("#orcamentosReal"),
    orcamentosMeta: document.querySelector("#orcamentosMeta"),
    orcamentosBar: document.querySelector("#orcamentosBar"),
    vendasPercent: document.querySelector("#vendasPercent"),
    vendasReal: document.querySelector("#vendasReal"),
    vendasMeta: document.querySelector("#vendasMeta"),
    vendasBar: document.querySelector("#vendasBar"),
    performancePercent: document.querySelector("#performancePercent"),
    performanceAverage: document.querySelector("#performanceAverage"),
    performanceCount: document.querySelector("#performanceCount"),
    performanceBar: document.querySelector("#performanceBar")
  };

  const state = {
    consultants: [],
    teams: { orcamentos: null, vendas: null },
    hasData: false
  };

  // --- CSV parsing -----------------------------------------------------

  function stripBom(text) {
    return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  }

  // RFC4180-style parser: handles quoted fields, embedded commas,
  // embedded line breaks inside quotes, and escaped quotes ("").
  function parseCsvRows(text) {
    const rows = [];
    let row = [];
    let field = "";
    let insideQuotes = false;
    const length = text.length;
    let i = 0;

    while (i < length) {
      const char = text[i];

      if (insideQuotes) {
        if (char === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          insideQuotes = false;
          i += 1;
          continue;
        }
        field += char;
        i += 1;
        continue;
      }

      if (char === '"') {
        insideQuotes = true;
        i += 1;
        continue;
      }

      if (char === ",") {
        row.push(field);
        field = "";
        i += 1;
        continue;
      }

      if (char === "\r") {
        i += 1;
        continue;
      }

      if (char === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
        i += 1;
        continue;
      }

      field += char;
      i += 1;
    }

    row.push(field);
    rows.push(row);

    return rows.filter(cells => cells.length > 1 || cells[0] !== "");
  }

  function rowsToObjects(rows) {
    if (!rows.length) {
      throw new CsvStructureError("A planilha publicada está vazia.");
    }

    const headers = rows[0].map(header => header.trim());
    const missing = REQUIRED_HEADERS.filter(required => !headers.includes(required));

    if (missing.length) {
      throw new CsvStructureError(
        `A estrutura do CSV está incorreta. Colunas ausentes: ${missing.join(", ")}.`
      );
    }

    return rows.slice(1).map(cells => {
      const record = {};
      headers.forEach((header, index) => {
        record[header] = cells[index] !== undefined ? cells[index] : "";
      });
      return record;
    });
  }

  // Accepts "1234", "1234,56", "1.234,56" and "R$ 1.234,56".
  function parseNumberBR(raw) {
    if (raw === null || raw === undefined) return 0;

    let value = String(raw).trim();
    if (!value) return 0;

    value = value.replace(/[^0-9,.-]/g, "");
    if (!value) return 0;

    const hasComma = value.includes(",");
    const hasDot = value.includes(".");

    if (hasComma && hasDot) {
      value = value.replace(/\./g, "").replace(",", ".");
    } else if (hasComma) {
      value = value.replace(",", ".");
    }

    const number = parseFloat(value);
    return Number.isFinite(number) ? number : 0;
  }

  function normalizeName(name) {
    return String(name || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function buildDataFromCsv(text) {
    const rows = parseCsvRows(stripBom(text));
    const records = rowsToObjects(rows);

    const consultants = [];
    const teams = { orcamentos: null, vendas: null };

    records.forEach(record => {
      const tipo = String(record.Tipo || "").trim().toLowerCase();
      const nome = String(record.Nome || "").trim();

      if (!nome) return;

      if (tipo === "consultor") {
        consultants.push({
          name: nome,
          prospMeta: parseNumberBR(record.ProspMeta),
          prospReal: parseNumberBR(record.ProspReal),
          followMeta: parseNumberBR(record.FollowMeta),
          followReal: parseNumberBR(record.FollowReal),
          leadsMeta: parseNumberBR(record.LeadsMeta),
          leadsReal: parseNumberBR(record.LeadsReal)
        });
        return;
      }

      if (tipo === "equipe") {
        const team = {
          name: nome,
          meta: parseNumberBR(record.Meta),
          real: parseNumberBR(record.Real)
        };

        const normalized = normalizeName(nome);
        if (normalized.startsWith("orcamento")) {
          teams.orcamentos = team;
        } else if (normalized.startsWith("venda")) {
          teams.vendas = team;
        }
      }
    });

    return { consultants, teams };
  }

  // --- Calculations ------------------------------------------------------

  function safeRatio(real, meta) {
    const metaNumber = Number(meta) || 0;
    if (metaNumber <= 0) return 0;
    return (Number(real) / metaNumber) * 100;
  }

  function clampPercent(value) {
    return Math.max(0, Math.min(100, value));
  }

  function consultantPercents(person) {
    const prosp = safeRatio(person.prospReal, person.prospMeta);
    const follow = safeRatio(person.followReal, person.followMeta);
    const leads = safeRatio(person.leadsReal, person.leadsMeta);
    const performance = (prosp + follow + leads) / 3;
    return { prosp, follow, leads, performance };
  }

  function levelFromPercent(value) {
    if (value >= LEVEL_GOOD_THRESHOLD) return "level-good";
    if (value >= LEVEL_WARNING_THRESHOLD) return "level-warning";
    return "level-low";
  }

  function rankingLabel(rank) {
    return rank === 1 ? "Destaque da equipe" : `${rank}º da equipe`;
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

  // --- Formatting ---------------------------------------------------------

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(Math.round(Number(value) || 0));
  }

  function formatPercent(value) {
    return `${Math.round(value)}%`;
  }

  function formatTime(date) {
    return date.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  // --- Rendering ------------------------------------------------------------

  function setBar(barElement, percent) {
    barElement.classList.remove("level-good", "level-warning", "level-low");
    barElement.classList.add(levelFromPercent(percent));
    barElement.style.width = `${clampPercent(percent)}%`;
  }

  function setPercentBadge(badgeElement, percent) {
    badgeElement.classList.remove("level-good", "level-warning", "level-low");
    badgeElement.classList.add(levelFromPercent(percent));
    badgeElement.textContent = formatPercent(percent);
  }

  function renderTeamCard(team, elementsForCard) {
    const safeTeam = team || { meta: 0, real: 0 };
    const percent = safeRatio(safeTeam.real, safeTeam.meta);

    elementsForCard.real.textContent = formatCurrency(safeTeam.real);
    elementsForCard.meta.textContent = `Meta ${formatCurrency(safeTeam.meta)}`;
    setPercentBadge(elementsForCard.percent, percent);
    setBar(elementsForCard.bar, percent);
  }

  function renderSummary(teams, consultants) {
    renderTeamCard(teams.orcamentos, {
      real: elements.orcamentosReal,
      meta: elements.orcamentosMeta,
      percent: elements.orcamentosPercent,
      bar: elements.orcamentosBar
    });

    renderTeamCard(teams.vendas, {
      real: elements.vendasReal,
      meta: elements.vendasMeta,
      percent: elements.vendasPercent,
      bar: elements.vendasBar
    });

    const performances = consultants.map(person => consultantPercents(person).performance);
    const average = performances.length
      ? performances.reduce((total, value) => total + value, 0) / performances.length
      : 0;

    elements.performanceAverage.textContent = formatPercent(average);
    elements.performanceCount.textContent =
      consultants.length === 1 ? "1 consultor" : `${consultants.length} consultores`;
    setPercentBadge(elements.performancePercent, average);
    setBar(elements.performanceBar, average);
  }

  function fillMetric(card, type, real, meta, percent) {
    const valueElement = card.querySelector(`.metric-${type}-value`);
    const barElement = card.querySelector(`.metric-${type}-bar`);

    valueElement.textContent = `${formatNumber(real)} de ${formatNumber(meta)}`;
    setBar(barElement, percent);
  }

  function renderConsultants(consultants) {
    const ranked = consultants
      .map((person, index) => ({ person, index, ...consultantPercents(person) }))
      .sort((a, b) => b.performance - a.performance || a.index - b.index);

    while (elements.consultantsGrid.firstChild) {
      elements.consultantsGrid.removeChild(elements.consultantsGrid.firstChild);
    }

    elements.emptyState.hidden = ranked.length > 0;
    elements.consultantsGrid.hidden = ranked.length === 0;

    ranked.forEach((entry, position) => {
      const rank = position + 1;
      const fragment = elements.consultantTemplate.content.cloneNode(true);
      const card = fragment.querySelector(".consultant-card");

      card.classList.toggle("is-leader", rank === 1);
      card.querySelector(".avatar").textContent = initials(entry.person.name);
      card.querySelector(".consultant-name").textContent = entry.person.name;
      card.querySelector(".ranking-position").textContent = rankingLabel(rank);
      card.querySelector(".performance-value").textContent = formatPercent(entry.performance);

      fillMetric(card, "prosp", entry.person.prospReal, entry.person.prospMeta, entry.prosp);
      fillMetric(card, "follow", entry.person.followReal, entry.person.followMeta, entry.follow);
      fillMetric(card, "leads", entry.person.leadsReal, entry.person.leadsMeta, entry.leads);

      elements.consultantsGrid.appendChild(fragment);
    });
  }

  function renderAll() {
    renderSummary(state.teams, state.consultants);
    renderConsultants(state.consultants);
  }

  // --- Connection / status UI ------------------------------------------------

  function setConnectionState(stateName, message) {
    elements.connectionIndicator.dataset.state = stateName;
    elements.statusText.textContent = message;
  }

  function showConfigBanner() {
    elements.configBanner.hidden = false;
    elements.csvErrorBanner.hidden = true;
    elements.mainContent.hidden = true;
    elements.lastUpdate.textContent = "Configuração pendente";
    setConnectionState("error", "Não configurado");
  }

  function showCsvErrorBanner(message) {
    elements.csvErrorMessage.textContent = message;
    elements.csvErrorBanner.hidden = false;
  }

  function hideCsvErrorBanner() {
    elements.csvErrorBanner.hidden = true;
  }

  // --- Data loading ------------------------------------------------------------

  async function fetchCsvText(url) {
    const separator = url.includes("?") ? "&" : "?";
    const bustedUrl = `${url}${separator}cache=${Date.now()}`;
    const response = await fetch(bustedUrl, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Erro HTTP ${response.status} ao buscar o CSV.`);
    }

    return response.text();
  }

  async function loadData() {
    if (!sheetUrl) {
      showConfigBanner();
      return;
    }

    elements.refreshButton.disabled = true;
    setConnectionState("warning", state.hasData ? "Atualizando" : "Conectando");
    if (!state.hasData) {
      elements.lastUpdate.textContent = "Carregando dados";
    }

    try {
      const csvText = await fetchCsvText(sheetUrl);
      const { consultants, teams } = buildDataFromCsv(csvText);

      state.consultants = consultants;
      state.teams = teams;
      state.hasData = true;

      hideCsvErrorBanner();
      elements.mainContent.hidden = false;
      renderAll();

      elements.lastUpdate.textContent = `Atualizado às ${formatTime(new Date())}`;
      setConnectionState("success", "Conectado");
    } catch (error) {
      console.error("Falha ao atualizar o painel:", error);

      if (error instanceof CsvStructureError) {
        showCsvErrorBanner(error.message);
      }

      if (state.hasData) {
        elements.mainContent.hidden = false;
        elements.lastUpdate.textContent = "Mantendo os últimos dados";
      } else {
        elements.mainContent.hidden = true;
        elements.lastUpdate.textContent = "Não foi possível carregar os dados";
      }

      setConnectionState("error", "Falha na atualização");
    } finally {
      elements.refreshButton.disabled = false;
    }
  }

  function init() {
    if (config.companyName) {
      elements.companyName.textContent = config.companyName;
    }
    if (config.panelTitle) {
      elements.panelTitle.textContent = config.panelTitle;
      document.title = `${config.panelTitle} | ${config.companyName || "Unctus Acabamentos"}`;
    }

    if (!sheetUrl || sheetUrl.startsWith("COLE_AQUI")) {
      showConfigBanner();
      return;
    }

    elements.refreshButton.addEventListener("click", loadData);
    loadData();
    window.setInterval(loadData, refreshInterval);
  }

  init();
})();
