(() => {
  const config = window.PAINEL_CONFIG || {};
  const refreshInterval = Number(config.refreshInterval) || 15000;

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

  let currentData = Array.isArray(config.fallbackData) ? config.fallbackData : [];

  function normalize(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toLowerCase();
  }

  function parseNumber(value) {
    if (typeof value === "number") return value;

    let text = String(value ?? "").trim();
    if (!text) return 0;

    text = text.replace(/[R$\s%]/g, "");

    if (text.includes(",") && text.includes(".")) {
      text = text.lastIndexOf(",") > text.lastIndexOf(".")
        ? text.replace(/\./g, "").replace(",", ".")
        : text.replace(/,/g, "");
    } else if (text.includes(",")) {
      text = text.replace(",", ".");
    }

    const number = Number(text);
    return Number.isFinite(number) ? number : 0;
  }

  function parseCsv(text) {
    const rows = [];
    let currentRow = [];
    let currentField = "";
    let insideQuotes = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      const nextCharacter = text[index + 1];

      if (character === '"' && insideQuotes && nextCharacter === '"') {
        currentField += '"';
        index += 1;
      } else if (character === '"') {
        insideQuotes = !insideQuotes;
      } else if (character === "," && !insideQuotes) {
        currentRow.push(currentField);
        currentField = "";
      } else if ((character === "\n" || character === "\r") && !insideQuotes) {
        if (character === "\r" && nextCharacter === "\n") index += 1;
        currentRow.push(currentField);

        if (currentRow.some(cell => String(cell).trim() !== "")) {
          rows.push(currentRow);
        }

        currentRow = [];
        currentField = "";
      } else {
        currentField += character;
      }
    }

    currentRow.push(currentField);

    if (currentRow.some(cell => String(cell).trim() !== "")) {
      rows.push(currentRow);
    }

    return rows;
  }

  function convertCsvToData(csvText) {
    const rows = parseCsv(csvText.replace(/^\uFEFF/, ""));

    if (rows.length < 2) {
      throw new Error("A planilha não possui dados suficientes");
    }

    const headers = rows[0].map(normalize);
    const expectedHeaders = [
      "consultor",
      "prospmeta",
      "prospreal",
      "orcmeta",
      "orcreal",
      "fechmeta",
      "fechreal"
    ];

    const indexes = Object.fromEntries(
      expectedHeaders.map(header => [header, headers.indexOf(header)])
    );

    const missingHeaders = expectedHeaders.filter(header => indexes[header] === -1);

    if (missingHeaders.length) {
      throw new Error("A estrutura da planilha está diferente do esperado");
    }

    return rows
      .slice(1)
      .filter(row => {
        const name = String(row[indexes.consultor] ?? "").trim();
        return name && normalize(name) !== "observacao";
      })
      .map(row => ({
        name: String(row[indexes.consultor] ?? "").trim(),
        prospMeta: parseNumber(row[indexes.prospmeta]),
        prospReal: parseNumber(row[indexes.prospreal]),
        orcMeta: parseNumber(row[indexes.orcmeta]),
        orcReal: parseNumber(row[indexes.orcreal]),
        fechMeta: parseNumber(row[indexes.fechmeta]),
        fechReal: parseNumber(row[indexes.fechreal])
      }));
  }

  function percentage(real, target) {
    if (!target) return 0;
    return Math.max(0, Math.min(100, (real / target) * 100));
  }

  function averagePerformance(person) {
    return (
      percentage(person.prospReal, person.prospMeta) +
      percentage(person.orcReal, person.orcMeta) +
      percentage(person.fechReal, person.fechMeta)
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
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0])
      .join("")
      .toUpperCase();
  }

  function renderSummary(data) {
    const totals = data.reduce(
      (accumulator, person) => {
        accumulator.orcReal += person.orcReal;
        accumulator.orcMeta += person.orcMeta;
        accumulator.fechReal += person.fechReal;
        accumulator.fechMeta += person.fechMeta;
        accumulator.performance += averagePerformance(person);
        return accumulator;
      },
      {
        orcReal: 0,
        orcMeta: 0,
        fechReal: 0,
        fechMeta: 0,
        performance: 0
      }
    );

    const average = data.length ? totals.performance / data.length : 0;

    elements.summaryOrcReal.textContent = totals.orcReal;
    elements.summaryOrcMeta.textContent = `Meta ${totals.orcMeta}`;
    elements.summaryFechReal.textContent = totals.fechReal;
    elements.summaryFechMeta.textContent = `Meta ${totals.fechMeta}`;
    elements.summaryAverage.textContent = `${Math.round(average)}%`;
  }

  function fillMetric(card, type, real, target) {
    const valueElement = card.querySelector(`.metric-${type}-value`);
    const barElement = card.querySelector(`.metric-${type}-bar`);
    const progress = percentage(real, target);

    valueElement.textContent = `${real} de ${target}`;
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
      fillMetric(card, "orc", person.orcReal, person.orcMeta);
      fillMetric(card, "fech", person.fechReal, person.fechMeta);

      const statusElement = card.querySelector(".status-text");
      statusElement.textContent = status.label;
      statusElement.style.color = status.color;

      card.querySelector(".ranking-position").textContent = `${rankingIndex + 1}º da equipe`;

      elements.grid.appendChild(fragment);
    });
  }

  function render(data) {
    renderSummary(data);
    renderConsultants(data);
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
    const sheetUrl = String(config.sheetUrl || "").trim();

    if (!sheetUrl || sheetUrl.includes("COLE_AQUI")) {
      currentData = Array.isArray(config.fallbackData) ? config.fallbackData : [];
      render(currentData);
      elements.lastUpdate.textContent = "Dados de demonstração";
      setConnectionState("warning", "Configure o link em config.js");
      return;
    }

    try {
      elements.refreshButton.disabled = true;
      setConnectionState("warning", "Atualizando");

      const separator = sheetUrl.includes("?") ? "&" : "?";
      const response = await fetch(`${sheetUrl}${separator}cache=${Date.now()}`, {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(`Falha na consulta: ${response.status}`);
      }

      const csvText = await response.text();
      const data = convertCsvToData(csvText);

      if (!data.length) {
        throw new Error("Nenhum consultor foi encontrado");
      }

      currentData = data;
      render(currentData);

      const now = new Date();
      elements.lastUpdate.textContent = formatUpdateTime(now);
      setConnectionState("success", "Conectado");
    } catch (error) {
      console.error(error);

      if (currentData.length) {
        render(currentData);
      }

      elements.lastUpdate.textContent = "Mantendo os últimos dados";
      setConnectionState("error", "Falha na atualização");
    } finally {
      elements.refreshButton.disabled = false;
    }
  }

  elements.refreshButton.addEventListener("click", loadData);

  render(currentData);
  loadData();
  window.setInterval(loadData, refreshInterval);
})();
