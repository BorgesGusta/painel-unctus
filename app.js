async function loadData() {
  try {
    elements.refreshButton.disabled = true;
    setConnectionState("warning", "Atualizando");

    const separator = config.apiUrl.includes("?") ? "&" : "?";

    const response = await fetch(
      `${config.apiUrl}${separator}cache=${Date.now()}`,
      {
        cache: "no-store"
      }
    );

    if (!response.ok) {
      throw new Error(`Erro ${response.status}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || "Falha ao carregar os dados");
    }

    currentData = result.consultants;

    renderConsultants(currentData);
    renderTeamSummary(result.team);

    const now = new Date();

    elements.lastUpdate.textContent =
      `Atualizado às ${now.toLocaleTimeString("pt-BR")}`;

    setConnectionState("success", "Conectado");

  } catch (error) {
    console.error(error);

    elements.lastUpdate.textContent =
      "Mantendo os últimos dados";

    setConnectionState("error", "Falha na atualização");

  } finally {
    elements.refreshButton.disabled = false;
  }
}