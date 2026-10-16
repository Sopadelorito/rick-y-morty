
const API_URL = "https://rickandmortyapi.com/api/character";

const $ = id => document.getElementById(id);

const el = {
  form: $("filter-form"),
  search: $("search"),
  species: $("species"),
  status: $("status"),
  reset: $("reset-btn"),
  emptyReset: $("empty-reset"),
  grid: $("characters-grid"),
  loading: $("loading"),
  error: $("error-message"),
  empty: $("empty-state"),
  pagination: $("pagination"),
  prev: $("prev-btn"),
  next: $("next-btn"),
  pageInfo: $("page-info"),
  results: $("results-count"),
  total: $("total-count"),
  filters: $("active-filters"),
  modal: $("character-modal"),
  modalContent: $("modal-content"),
  closeModal: $("close-modal")
};

let currentPage = 1;
let totalPages = 1;
let requestId = 0;
let searchTimeout;

// Escapar caracteres especiales
function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function translateStatus(status) {
  return {
    Alive: "Vivo",
    Dead: "Muerto",
    unknown: "Desconocido"
  }[status] || status;
}

function translateSpecies(species) {
  return {
    Human: "Humano",
    Alien: "Alienígena",
    Humanoid: "Humanoide",
    Robot: "Robot",
    Animal: "Animal",
    "Mythological Creature": "Criatura mitológica"
  }[species] || species || "Desconocida";
}

// Construir URL con filtros
function getURL(pageNumber = 1) {
  const url = new URL(API_URL);

  url.searchParams.set("page", pageNumber);

  if (el.search.value.trim()) {
    url.searchParams.set("name", el.search.value.trim());
  }

  if (el.species.value) {
    url.searchParams.set("species", el.species.value);
  }

  if (el.status.value) {
    url.searchParams.set("status", el.status.value);
  }

  return url;
}

// Mostrar filtros activos
function renderFilters() {
  const filters = [];

  if (el.search.value.trim()) {
    filters.push("Nombre: " + el.search.value.trim());
  }

  if (el.species.value) {
    filters.push("Especie: " + translateSpecies(el.species.value));
  }

  if (el.status.value) {
    filters.push("Estado: " + translateStatus({
      alive: "Alive",
      dead: "Dead",
      unknown: "unknown"
    }[el.status.value]));
  }

  el.filters.innerHTML = filters.map(filter =>
    `<span class="filter-chip">${escapeHTML(filter)}</span>`
  ).join("");
}

// Mostrar personajes
function renderCharacters(characters) {
  el.grid.innerHTML = characters.map(character => {
    const statusClass =
      character.status === "Alive" ? "alive" :
      character.status === "Dead" ? "dead" : "unknown";

    return `
      <article class="character-card"
        data-id="${character.id}"
        tabindex="0"
        role="button">

        <div class="card-image">
          <img
            src="${escapeHTML(character.image)}"
            alt="${escapeHTML(character.name)}"
            loading="lazy">
          <span class="character-id">#${character.id}</span>
        </div>

        <div class="card-body">
          <h3>${escapeHTML(character.name)}</h3>

          <div class="card-status">
            <span class="status ${statusClass}">
              ${translateStatus(character.status)}
            </span>
          </div>

          <div class="card-info">
            <div class="info-row">
              <span class="info-label">ESPECIE</span>
              <span class="info-value">
                ${escapeHTML(translateSpecies(character.species))}
              </span>
            </div>

            <div class="info-row">
              <span class="info-label">PLANETA DE ORIGEN</span>
              <span class="info-value">
                ${escapeHTML(character.origin.name)}
              </span>
            </div>

            <div class="info-row">
              <span class="info-label">ÚLTIMA UBICACIÓN</span>
              <span class="info-value">
                ${escapeHTML(character.location.name)}
              </span>
            </div>
          </div>

          <div class="card-footer">
            <span>${character.episode.length} episodios</span>
            <span class="card-link">VER PERFIL ↗</span>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

// Actualizar paginación
function updatePagination(info) {
  totalPages = info.pages || 1;

  el.total.textContent = info.count;
  el.results.textContent = `${info.count} resultados`;
  el.pageInfo.textContent =
    `Página ${currentPage} de ${totalPages}`;

  el.prev.disabled = !info.prev;
  el.next.disabled = !info.next;
  el.pagination.hidden = info.count === 0;
}

// Consultar la API
async function loadCharacters(pageNumber = 1) {
  const thisRequest = ++requestId;
  currentPage = pageNumber;

  el.loading.hidden = false;
  el.error.hidden = true;
  el.empty.hidden = true;
  el.pagination.hidden = true;
  el.grid.innerHTML = "";

  renderFilters();

  try {
    const response = await fetch(getURL(pageNumber));

    if (thisRequest !== requestId) return;

    if (response.status === 404) {
      el.total.textContent = "0";
      el.results.textContent = "0 resultados";
      el.empty.hidden = false;
      return;
    }

    if (!response.ok) {
      throw new Error("Error HTTP " + response.status);
    }

    const data = await response.json();

    if (thisRequest !== requestId) return;

    updatePagination(data.info);
    renderCharacters(data.results);
    el.empty.hidden = data.results.length > 0;

  } catch (error) {
    if (thisRequest !== requestId) return;

    console.error(error);
    el.error.textContent =
      "Error al cargar personajes. Comprueba tu conexión a Internet.";
    el.error.hidden = false;

  } finally {
    if (thisRequest === requestId) {
      el.loading.hidden = true;
    }
  }
}

// Limpiar filtros
function resetFilters() {
  clearTimeout(searchTimeout);
  el.search.value = "";
  el.species.value = "";
  el.status.value = "";
  loadCharacters(1);
}

// Mostrar detalles del personaje
async function openCharacter(id) {
  el.modalContent.innerHTML = "<p>Cargando personaje...</p>";

  if (!el.modal.open) el.modal.showModal();

  try {
    const response = await fetch(`${API_URL}/${id}`);

    if (!response.ok) throw new Error("Personaje no encontrado");

    const c = await response.json();

    const episodes = await Promise.all(
      c.episode.map(async url => {
        try {
          const response = await fetch(url);
          if (!response.ok) return null;

          const episode = await response.json();

          return {
            code: episode.episode,
            name: episode.name,
            url
          };
        } catch {
          return null;
        }
      })
    );

    const validEpisodes = episodes.filter(Boolean);

    el.modalContent.innerHTML = `
      <div class="modal-layout">
        <div>
          <img class="modal-image"
            src="${escapeHTML(c.image)}"
            alt="${escapeHTML(c.name)}">
        </div>

        <div class="modal-details">
          <span class="eyebrow">ARCHIVO #${c.id}</span>
          <h2>${escapeHTML(c.name)}</h2>

          <span class="status ${
            c.status === "Alive" ? "alive" :
            c.status === "Dead" ? "dead" : "unknown"
          }">
            ${translateStatus(c.status)}
          </span>

          <div class="card-info">
            <div class="info-row">
              <span class="info-label">ESPECIE</span>
              <span class="info-value">
                ${escapeHTML(translateSpecies(c.species))}
              </span>
            </div>

            <div class="info-row">
              <span class="info-label">GÉNERO</span>
              <span class="info-value">${escapeHTML(c.gender)}</span>
            </div>

            <div class="info-row">
              <span class="info-label">PLANETA DE ORIGEN</span>
              <span class="info-value">
                ${escapeHTML(c.origin.name)}
              </span>
            </div>

            <div class="info-row">
              <span class="info-label">ÚLTIMA UBICACIÓN</span>
              <span class="info-value">
                ${escapeHTML(c.location.name)}
              </span>
            </div>

            <div class="info-row">
              <span class="info-label">EPISODIOS (${validEpisodes.length})</span>
              <div class="episode-list">
                ${validEpisodes.map(ep => `
                  <a class="episode-tag"
                    href="${escapeHTML(ep.url)}"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="${escapeHTML(ep.name)}">
                    ${escapeHTML(ep.code)}
                  </a>
                `).join("")}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error(error);
    el.modalContent.innerHTML =
      "<p>No se pudo cargar la información del personaje.</p>";
  }
}

// Eventos
el.form.addEventListener("submit", event => {
  event.preventDefault();
  clearTimeout(searchTimeout);
  loadCharacters(1);
});

el.species.addEventListener("change", () => loadCharacters(1));
el.status.addEventListener("change", () => loadCharacters(1));

el.search.addEventListener("input", () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => loadCharacters(1), 400);
});

el.reset.addEventListener("click", resetFilters);
el.emptyReset.addEventListener("click", resetFilters);

el.prev.addEventListener("click", () => {
  if (currentPage > 1) loadCharacters(currentPage - 1);
});

el.next.addEventListener("click", () => {
  if (currentPage < totalPages) loadCharacters(currentPage + 1);
});

el.grid.addEventListener("click", event => {
  const card = event.target.closest(".character-card");
  if (card) openCharacter(card.dataset.id);
});

el.grid.addEventListener("keydown", event => {
  if (
    (event.key === "Enter" || event.key === " ") &&
    event.target.classList.contains("character-card")
  ) {
    event.preventDefault();
    openCharacter(event.target.dataset.id);
  }
});

el.closeModal.addEventListener("click", () => el.modal.close());

el.modal.addEventListener("click", event => {
  if (event.target === el.modal) el.modal.close();
});

// Iniciar aplicación
loadCharacters(1);
