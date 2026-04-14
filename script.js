const DATA_URL = "./data.json";

let state = {
  players: [],
  matches: [],
  filter: "all",
};

init();

async function init() {
  const res = await fetch(DATA_URL);
  const data = await res.json();

  state.players = data.players;
  state.matches = data.matches;

  setupFilters();
  renderAll();
}

function setupFilters() {
  const buttons = document.querySelectorAll(".filter-button");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");

      state.filter = btn.dataset.filter;
      renderSchedule();
    });
  });
}

function renderAll() {
  renderSummary();
  renderScoreboard();
  renderSchedule();
}

function renderSummary() {
  const total = state.matches.length;

  let finished = 0;
  let gamesPlayed = 0;

  state.matches.forEach((m) => {
    if (m.games.length > 0) {
      gamesPlayed += m.games.length;
    }

    if (m.games.length === 3) {
      finished++;
    }
  });

  document.getElementById("summary-total-matches").textContent = total;
  document.getElementById("summary-finished").textContent = finished;
  document.getElementById("summary-pending").textContent = total - finished;
  document.getElementById("summary-games-played").textContent = gamesPlayed;
}

function renderScoreboard() {
  let tmz = 0;
  let rz = 0;

  state.matches.forEach((match) => {
    const result = calculatePoints(match);

    tmz += result.tmz;
    rz += result.rz;
  });

  document.getElementById("score-tmz").textContent = tmz;
  document.getElementById("score-rz").textContent = rz;

  const status = document.getElementById("score-status");

  if (tmz === 0 && rz === 0) {
    status.textContent = "Aguardando resultados";
  } else if (tmz > rz) {
    status.textContent = "TMZ está na frente";
  } else if (rz > tmz) {
    status.textContent = "RZ está na frente";
  } else {
    status.textContent = "Empate geral";
  }
}

function renderSchedule() {
  const container = document.getElementById("schedule-list");
  container.innerHTML = "";

  let matches = [...state.matches];

  if (state.filter !== "all") {
    matches = matches.filter((m) => m.type === state.filter);
  }

  const grouped = {};

  matches.forEach((m) => {
    if (!grouped[m.date]) grouped[m.date] = [];
    grouped[m.date].push(m);
  });

  const dates = Object.keys(grouped).sort((a, b) => {
    const dateA = parseLocalDate(a);
    const dateB = parseLocalDate(b);
    return dateA - dateB;
  });

  let totalVisible = 0;

  dates.forEach((date) => {
    const dayMatches = grouped[date];

    const dayBlock = document.createElement("div");
    dayBlock.className = "day-block";

    const header = document.createElement("div");
    header.className = "day-block__header";

    header.innerHTML = `
      <h3 class="day-block__title">${formatDate(date)}</h3>
      <span class="day-block__count">${dayMatches.length} confronto(s)</span>
    `;

    const list = document.createElement("div");
    list.className = "match-list";

    dayMatches
      .sort((a, b) => (a.time || "").localeCompare(b.time || ""))
      .forEach((match) => {
        list.appendChild(createMatchCard(match));
        totalVisible++;
      });

    dayBlock.appendChild(header);
    dayBlock.appendChild(list);
    container.appendChild(dayBlock);
  });

  document.getElementById("schedule-counter").textContent =
    `${totalVisible} confrontos`;
}

function createMatchCard(match) {
  const div = document.createElement("div");

  const finished = match.games.length === 3;

  div.className = `match-card ${
    finished ? "match-card--finished" : "match-card--pending"
  }`;

  const teamsA = getTeamNames(match.teamA);
  const teamsB = getTeamNames(match.teamB);

  const result = calculatePoints(match);

  div.innerHTML = `
    <div class="match-card__top">
      <span class="match-card__time">${match.time || "--:--"}</span>
      <span class="match-card__type">${match.type}</span>
      <span class="match-card__status">
        ${finished ? "Finalizado" : "Pendente"}
      </span>
    </div>

    <div class="match-card__body">
      <div class="match-card__team">
        <span class="match-card__team-name">${teamsA.names}</span>
        <span class="match-card__team-clan">${teamsA.clan}</span>
      </div>

      <div class="match-card__versus">vs</div>

      <div class="match-card__team">
        <span class="match-card__team-name">${teamsB.names}</span>
        <span class="match-card__team-clan">${teamsB.clan}</span>
      </div>
    </div>

    <div class="match-card__bottom">
      <div class="match-card__score-box">
        <span class="match-card__score-label">Placar</span>
        <strong class="match-card__score-value">
          ${result.scoreA} x ${result.scoreB}
        </strong>
      </div>

      <div class="match-card__points-box">
        <span class="match-card__score-label">Pontos</span>
        <strong class="match-card__score-value">
          TMZ +${result.tmz} | RZ +${result.rz}
        </strong>
      </div>
    </div>
  `;

  return div;
}

function calculatePoints(match) {
  let scoreA = 0;
  let scoreB = 0;

  match.games.forEach((g) => {
    if (g === "A") scoreA++;
    if (g === "B") scoreB++;
  });

  const clanA = getClan(match.teamA);
  const clanB = getClan(match.teamB);

  let tmz = 0;
  let rz = 0;

  if (clanA === "TMZ") tmz += scoreA;
  if (clanA === "RZ") rz += scoreA;

  if (clanB === "TMZ") tmz += scoreB;
  if (clanB === "RZ") rz += scoreB;

  return { scoreA, scoreB, tmz, rz };
}

function getTeamNames(teamIds) {
  const players = teamIds.map((id) =>
    state.players.find((p) => p.id === id)
  );

  const names = players.map((p) => p.name).join(" + ");
  const clan = players[0]?.clan || "";

  return { names, clan };
}

function getClan(teamIds) {
  const player = state.players.find((p) => p.id === teamIds[0]);
  return player?.clan;
}

function parseLocalDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(date) {
  return parseLocalDate(date).toLocaleDateString("pt-BR");
}