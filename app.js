'use strict';

const STORAGE_KEY = 'futbol7_players';

// Jugadores que NO pueden ir en el mismo equipo
const CONSTRAINTS = [
  ['Chino', 'JP'],
];

// ── State ─────────────────────────────────────────────────────────────────
const state = {
  players: [],       // { id, name, control, fisica, velocidad } — persisted
  available: new Set(), // player ids available today — not persisted
  guests: [],        // { id, name, control, fisica, velocidad } — not persisted
  teams: null,       // { negro: [], blanco: [] } | null
  editing: null,     // player id being edited, or null
  isGuest: false,    // is the modal adding a guest?
};

// ── Utils ──────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function totalScore(p) {
  return p.control + p.fisica + p.velocidad;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function el(id) { return document.getElementById(id); }
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

// ── Persistence ────────────────────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.players = JSON.parse(raw);
  } catch { state.players = []; }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.players));
}

function ensureDefaultPlayers() {
  const existing = new Set(state.players.map(p => normName(p.name)));
  let changed = false;

  for (const player of DEFAULT_PLAYERS) {
    if (existing.has(normName(player.name))) continue;
    state.players.push({ id: uid(), ...player });
    changed = true;
  }

  if (changed) save();
}

// ── Algorithm ──────────────────────────────────────────────────────────────
// Snake draft: sort by score DESC (shuffle within ties), distribute zigzag.
function generateTeams() {
  const pool = [
    ...state.players.filter(p => state.available.has(p.id)),
    ...state.guests,
  ];

  if (pool.length < 2) return null;

  // Group by total score, shuffle within each group (produces variety on re-mezclar)
  const byScore = {};
  for (const p of pool) {
    const s = totalScore(p);
    if (!byScore[s]) byScore[s] = [];
    byScore[s].push(p);
  }

  const sorted = Object.keys(byScore)
    .map(Number)
    .sort((a, b) => b - a)
    .flatMap(s => shuffle(byScore[s]));

  const negro = [], blanco = [];
  sorted.forEach((p, i) => {
    const row = Math.floor(i / 2);
    const pos = i % 2;
    const toNegro = row % 2 === 0 ? pos === 0 : pos === 1;
    toNegro ? negro.push(p) : blanco.push(p);
  });

  enforceConstraints({ negro, blanco });
  return { negro, blanco };
}

// ── Constraints ────────────────────────────────────────────────────────────
function enforceConstraints(teams) {
  const { negro, blanco } = teams;
  const all = [...negro, ...blanco];

  for (const [nameA, nameB] of CONSTRAINTS) {
    const pA = all.find(p => normName(p.name) === normName(nameA));
    const pB = all.find(p => normName(p.name) === normName(nameB));
    if (!pA || !pB) continue;

    const aInNegro = negro.includes(pA);
    const bInNegro = negro.includes(pB);
    if (aInNegro !== bInNegro) continue; // ya en equipos distintos, ok

    // Ambos en el mismo equipo: swap pB con el jugador más cercano en puntaje del otro equipo
    const sameTeam  = aInNegro ? negro : blanco;
    const otherTeam = aInNegro ? blanco : negro;

    let bestSwap = null, bestDiff = Infinity;
    for (const p of otherTeam) {
      if (p === pA || p === pB) continue;
      const diff = Math.abs(totalScore(p) - totalScore(pB));
      if (diff < bestDiff) { bestSwap = p; bestDiff = diff; }
    }

    if (bestSwap) {
      sameTeam[sameTeam.indexOf(pB)]       = bestSwap;
      otherTeam[otherTeam.indexOf(bestSwap)] = pB;
    }
  }
}

// ── Render: Jugadores tab ──────────────────────────────────────────────────
function renderPlayers() {
  const list = el('players-list');
  el('player-count').textContent = `${state.players.length} jugadores`;

  if (state.players.length === 0) {
    list.innerHTML = `<div class="empty-state">No hay jugadores. Agregá uno para empezar.</div>`;
    return;
  }

  const sorted = [...state.players].sort((a, b) => totalScore(b) - totalScore(a));

  list.innerHTML = sorted.map(p => `
    <div class="player-row">
      <span class="player-name">${esc(p.name)}</span>
      <div class="metrics">
        <span class="metric-chip">C <span>${p.control}</span></span>
        <span class="metric-chip">F <span>${p.fisica}</span></span>
        <span class="metric-chip">V <span>${p.velocidad}</span></span>
      </div>
      <span class="player-score">${totalScore(p)}</span>
      <div class="row-actions">
        <button class="btn-icon" title="Editar" data-action="edit" data-id="${p.id}">✏️</button>
        <button class="btn-icon btn-danger" title="Eliminar" data-action="delete" data-id="${p.id}">✕</button>
      </div>
    </div>
  `).join('');
}

// ── Render: Partido tab ────────────────────────────────────────────────────
function renderMatch() {
  const list = el('match-list');
  const availCount = state.available.size + state.guests.length;
  const guestLabel = state.guests.length ? ` + ${state.guests.length} invitado${state.guests.length > 1 ? 's' : ''}` : '';
  el('match-count').textContent = `${availCount} disponibles${guestLabel}`;

  let html = '';

  if (state.players.length === 0 && state.guests.length === 0) {
    list.innerHTML = `<div class="empty-state">Primero agregá jugadores en la pestaña Jugadores.</div>`;
    return;
  }

  // Permanent players
  if (state.players.length > 0) {
    html += `<div class="section-label">Grupo</div>`;
    html += state.players.map(p => {
      const avail = state.available.has(p.id);
      return `
        <label class="match-row ${avail ? 'available' : ''}" data-id="${p.id}">
          <input type="checkbox" ${avail ? 'checked' : ''} data-action="toggle" data-id="${p.id}">
          <span class="player-name">${esc(p.name)}</span>
          <span class="player-score">${totalScore(p)}</span>
        </label>
      `;
    }).join('');
  }

  // Guests
  if (state.guests.length > 0) {
    html += `<div class="section-label">Invitados</div>`;
    html += state.guests.map(g => `
      <div class="match-row guest-row available">
        <span class="guest-badge">INV</span>
        <span class="player-name">${esc(g.name)}</span>
        <span class="player-score">${totalScore(g)}</span>
        <button class="btn-icon btn-danger" data-action="remove-guest" data-id="${g.id}">✕</button>
      </div>
    `).join('');
  }

  list.innerHTML = html;
}

// ── Render: Equipos tab ────────────────────────────────────────────────────
function renderTeams() {
  const display = el('teams-display');
  const reshuffleBtn = el('btn-reshuffle');

  if (!state.teams) {
    reshuffleBtn.style.display = 'none';
    el('btn-share').style.display = 'none';
    const total = state.available.size + state.guests.length;
    display.innerHTML = total < 2
      ? `<div class="empty-state">Marcá quiénes vienen en la pestaña Partido y después armá los equipos.</div>`
      : `<div class="empty-state">${total} jugadores listos. Presioná "Armar equipos".</div>`;
    el('teams-count').textContent = '';
    return;
  }

  reshuffleBtn.style.display = '';
  el('btn-share').style.display = '';

  const { negro, blanco } = state.teams;
  const totalNegro = negro.reduce((s, p) => s + totalScore(p), 0);
  const totalBlanco = blanco.reduce((s, p) => s + totalScore(p), 0);

  el('teams-count').textContent = `${negro.length + blanco.length} jugadores`;

  const playerRow = (p) => `
    <div class="team-player">
      <span>${esc(p.name)}</span>
      <span class="team-player-score">${totalScore(p)}</span>
    </div>
  `;

  display.innerHTML = `
    <div class="teams-grid">
      <div class="team-card negro">
        <div class="team-header">
          <div class="team-name">
            <span class="team-badge"></span>
            Negro (${negro.length})
          </div>
          <span class="team-total">Σ ${totalNegro}</span>
        </div>
        <div class="team-players">${negro.map(playerRow).join('')}</div>
      </div>
      <div class="team-card blanco">
        <div class="team-header">
          <div class="team-name">
            <span class="team-badge"></span>
            Blanco (${blanco.length})
          </div>
          <span class="team-total">Σ ${totalBlanco}</span>
        </div>
        <div class="team-players">${blanco.map(playerRow).join('')}</div>
      </div>
    </div>
    <p class="muted" style="margin-top:10px;text-align:center;font-size:12px">
      Diferencia de puntaje: ${Math.abs(totalNegro - totalBlanco)} puntos
    </p>
  `;
}

function renderAll() {
  renderPlayers();
  renderMatch();
  renderTeams();
}

// ── Modal ──────────────────────────────────────────────────────────────────
function openModal({ title = 'Jugador', player = null, isGuest = false } = {}) {
  el('modal-title').textContent = isGuest ? 'Invitado' : title;
  el('input-name').value = player?.name ?? '';
  el('input-control').value = player?.control ?? 5;
  el('input-fisica').value = player?.fisica ?? 5;
  el('input-velocidad').value = player?.velocidad ?? 5;
  el('val-control').textContent = player?.control ?? 5;
  el('val-fisica').textContent = player?.fisica ?? 5;
  el('val-velocidad').textContent = player?.velocidad ?? 5;
  state.editing = player?.id ?? null;
  state.isGuest = isGuest;
  el('modal-overlay').classList.remove('hidden');
  el('input-name').focus();
}

function closeModal() {
  el('modal-overlay').classList.add('hidden');
  state.editing = null;
  state.isGuest = false;
  el('player-form').reset();
}

// ── Event delegation ───────────────────────────────────────────────────────
document.addEventListener('click', (e) => {
  const action = e.target.closest('[data-action]')?.dataset.action;
  const id = e.target.closest('[data-id]')?.dataset.id;

  if (action === 'edit') {
    const player = state.players.find(p => p.id === id);
    if (player) openModal({ title: 'Editar jugador', player });
    return;
  }

  if (action === 'delete') {
    if (!confirm(`¿Eliminar a ${state.players.find(p => p.id === id)?.name}?`)) return;
    state.players = state.players.filter(p => p.id !== id);
    state.available.delete(id);
    state.teams = null;
    save();
    renderAll();
    return;
  }

  if (action === 'remove-guest') {
    state.guests = state.guests.filter(g => g.id !== id);
    state.teams = null;
    renderMatch();
    renderTeams();
    return;
  }
});

document.addEventListener('change', (e) => {
  const action = e.target.dataset.action;
  const id = e.target.dataset.id;

  if (action === 'toggle') {
    const row = e.target.closest('.match-row');
    if (e.target.checked) {
      state.available.add(id);
      row?.classList.add('available');
    } else {
      state.available.delete(id);
      row?.classList.remove('available');
    }
    state.teams = null;
    renderMatch();
    renderTeams();
  }
});

// ── Sliders live update ────────────────────────────────────────────────────
['control', 'fisica', 'velocidad'].forEach(metric => {
  el(`input-${metric}`).addEventListener('input', (e) => {
    el(`val-${metric}`).textContent = e.target.value;
  });
});

// ── Form submit ────────────────────────────────────────────────────────────
el('player-form').addEventListener('submit', (e) => {
  e.preventDefault();

  const data = {
    name: el('input-name').value.trim(),
    control: parseInt(el('input-control').value),
    fisica: parseInt(el('input-fisica').value),
    velocidad: parseInt(el('input-velocidad').value),
  };

  if (!data.name) return;

  if (state.isGuest) {
    state.guests.push({ id: uid(), ...data });
    state.teams = null;
    closeModal();
    renderMatch();
    renderTeams();
    return;
  }

  if (state.editing) {
    const idx = state.players.findIndex(p => p.id === state.editing);
    if (idx !== -1) state.players[idx] = { ...state.players[idx], ...data };
  } else {
    state.players.push({ id: uid(), ...data });
  }

  state.teams = null;
  save();
  closeModal();
  history.replaceState({}, '', window.location.pathname);
  renderAll();
});

// ── Tab switching ──────────────────────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const target = tab.dataset.tab;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    tab.classList.add('active');
    el(`tab-${target}`).classList.add('active');
  });
});

// ── Button wiring ──────────────────────────────────────────────────────────
el('btn-add-player').addEventListener('click', () => openModal({ title: 'Nuevo jugador' }));
el('btn-add-guest').addEventListener('click', () => openModal({ isGuest: true }));
el('modal-close').addEventListener('click', closeModal);
el('modal-cancel').addEventListener('click', closeModal);
el('modal-overlay').addEventListener('click', (e) => { if (e.target === el('modal-overlay')) closeModal(); });

el('btn-parse-list').addEventListener('click', loadWspList);

el('btn-generate').addEventListener('click', () => {
  state.teams = generateTeams();
  if (!state.teams) {
    alert('Marcá al menos 2 jugadores disponibles en la pestaña Partido.');
    return;
  }
  renderTeams();
});

el('btn-reshuffle').addEventListener('click', () => {
  state.teams = generateTeams();
  renderTeams();
});

el('btn-share').addEventListener('click', () => {
  const { negro, blanco } = state.teams;
  const totalNegro = negro.reduce((s, p) => s + totalScore(p), 0);
  const totalBlanco = blanco.reduce((s, p) => s + totalScore(p), 0);
  const text = [
    `⚫ Negro (Σ${totalNegro}): ${negro.map(p => p.name).join(', ')}`,
    `⚪ Blanco (Σ${totalBlanco}): ${blanco.map(p => p.name).join(', ')}`,
  ].join('\n');
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank');
});

// ── Keyboard shortcuts ─────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeModal();
});

// ── Default players ────────────────────────────────────────────────────────
const DEFAULT_PLAYERS = [
  { name: 'David',             control: 6, fisica: 6, velocidad: 6 },
  { name: 'Seba',             control: 6, fisica: 6, velocidad: 6 },
  { name: 'Emiliano',         control: 6, fisica: 6, velocidad: 6 },
  { name: 'fafafa',           control: 6, fisica: 6, velocidad: 6 },
  { name: 'Roger',            control: 6, fisica: 6, velocidad: 6 },
  { name: 'Damian N',         control: 6, fisica: 6, velocidad: 6 },
  { name: 'Chori',            control: 6, fisica: 6, velocidad: 6 },
  { name: 'JP',               control: 6, fisica: 6, velocidad: 6 },
  { name: 'Chino',            control: 6, fisica: 6, velocidad: 6 },
  { name: 'Cata',             control: 6, fisica: 6, velocidad: 6 },
  { name: 'Pablo E.',         control: 6, fisica: 6, velocidad: 6 },
  { name: 'Christian Damián', control: 6, fisica: 6, velocidad: 6 },
  { name: 'Vlad',             control: 6, fisica: 6, velocidad: 6 },
  { name: 'Gabriel S.',       control: 6, fisica: 6, velocidad: 6 },
  { name: 'El Chato',         control: 6, fisica: 6, velocidad: 6 },
  { name: 'Dan',            control: 6, fisica: 6, velocidad: 6 },
  { name: 'Gerardo R.',     control: 6, fisica: 6, velocidad: 6 },
  { name: 'Pepi',           control: 6, fisica: 6, velocidad: 6 },
  { name: 'Julio',          control: 6, fisica: 6, velocidad: 6 },
  { name: 'Raúl',           control: 6, fisica: 6, velocidad: 6 },
  { name: 'Rodri',          control: 6, fisica: 6, velocidad: 6 },
  { name: 'Darío',          control: 6, fisica: 6, velocidad: 6 },
  { name: 'Parse',          control: 6, fisica: 6, velocidad: 6 },
  { name: 'Fran',           control: 6, fisica: 6, velocidad: 6 },
  { name: 'Horacio',        control: 6, fisica: 6, velocidad: 6 },
  { name: 'Matías G.',      control: 6, fisica: 6, velocidad: 6 },
  { name: 'Mau',            control: 6, fisica: 6, velocidad: 6 },
  { name: 'Maxi',           control: 6, fisica: 6, velocidad: 6 },
  { name: 'Pablo G.',       control: 6, fisica: 6, velocidad: 6 },
  { name: 'Roll',           control: 6, fisica: 6, velocidad: 6 },
];

// ── WhatsApp list parser ───────────────────────────────────────────────────
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => i || j)
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function normName(s) {
  return s
    .normalize('NFC')
    .replace(/[\u200B-\u200F\u2060\uFEFF]/g, '')  // invisible chars
    .toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents (á→a, etc.)
    .replace(/\.$/, '')           // trailing dot
    .replace(/\(.*?\)/g, '')      // anything in parens
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeWspLine(line) {
  return line
    .normalize('NFC')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ')
    .replace(/[\u00A0\u2000-\u200F\u2028-\u202E\u2060\uFEFF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeWspText(text) {
  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .replace(/[\u2028\u2029]/g, '\n');
}

function extractWspName(line) {
  const clean = sanitizeWspLine(line);
  if (!clean) return '';
  if (/^suplentes\b/i.test(clean)) return '';

  const numbered = clean.match(/^[^\p{L}\p{N}]*\d+\s*[.)-]?[^\p{L}\p{N}]*\s*(.+)$/u);
  if (!numbered) return '';

  return numbered[1]
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/[\u2066-\u2069]/g, '')
    .replace(/[^\p{L}\p{N}.\s]+$/u, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchPlayer(search, used = new Set()) {
  const s = normName(search);
  if (!s) return null;
  const candidates = state.players.filter(p => !used.has(p.id));

  // 1. exact
  let m = candidates.find(p => normName(p.name) === s);
  if (m) return m;

  // 2. starts-with (either direction)
  m = candidates.find(p => {
    const n = normName(p.name);
    return n.startsWith(s) || s.startsWith(n);
  });
  if (m) return m;

  // 3. any meaningful word from search appears in player name (skip 1-char words)
  const sWords = s.split(' ').filter(w => w.length > 1);
  if (sWords.length) {
    m = candidates.find(p => {
      const pWords = normName(p.name).split(' ');
      return sWords.some(sw => pWords.some(pw => pw === sw || pw.startsWith(sw)));
    });
    if (m) return m;
  }

  // 4. fuzzy (levenshtein ≤ 2, only for short names)
  if (s.length >= 4) {
    let best = null, bestDist = 3;
    for (const p of candidates) {
      const dist = levenshtein(s, normName(p.name));
      if (dist < bestDist) { best = p; bestDist = dist; }
    }
    if (best) return best;
  }

  return null;
}

function parseWspList(text) {
  const normalized = normalizeWspText(text);
  const names = [];

  for (const line of normalized.split('\n')) {
    const name = extractWspName(line);
    if (name) names.push(name);
  }

  if (names.length) return names;

  const compact = normalized
    .split('\n')
    .map(sanitizeWspLine)
    .filter(Boolean)
    .join('\n');

  const entryRegex = /(?:^|\n)[^\p{L}\p{N}]*\d+\s*[.)-]?[^\p{L}\p{N}]*(.+?)(?=\n[^\p{L}\p{N}]*\d+\s*[.)-]?|\n\s*suplentes\b|$)/giu;
  for (const match of compact.matchAll(entryRegex)) {
    const name = extractWspName(match[0]);
    if (name) names.push(name);
  }

  return names;
}

function loadWspList() {
  const text = el('wsp-input').value.trim();
  if (!text) return;

  const names = parseWspList(text);
  if (!names.length) return;

  // Reset availability + guests
  state.available.clear();
  state.guests = [];
  state.teams = null;

  const matched = [], unmatched = [];

  // Track already-matched player ids to avoid duplicates
  const used = new Set();

  for (const name of names) {
    const player = matchPlayer(name, used);
    if (player) {
      state.available.add(player.id);
      used.add(player.id);
      matched.push(player.name);
    } else {
      state.guests.push({ id: uid(), name, control: 6, fisica: 6, velocidad: 6 });
      unmatched.push(name);
    }
  }

  // Show summary
  const summary = el('parse-summary');
  let html = `<span class="ok">✓ ${matched.length} encontrados</span>`;
  if (unmatched.length) {
    html += ` &nbsp;<span class="warn">⚠ ${unmatched.length} como invitados: ${unmatched.join(', ')}</span>`;
  }
  summary.innerHTML = html;

  // Auto-generate
  state.teams = generateTeams();
  renderMatch();
  renderTeams();
}

// ── URL param: ?jugador=Nombre ─────────────────────────────────────────────
function handleUrlParam() {
  const params = new URLSearchParams(window.location.search);
  const nombre = params.get('jugador');
  if (!nombre) return;
  const player = state.players.find(p =>
    p.name.toLowerCase() === nombre.toLowerCase()
  );
  if (player) {
    openModal({ title: `Tus stats, ${player.name}`, player });
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
const DATA_VERSION = 'v5';
load();
if (localStorage.getItem('futbol7_v') !== DATA_VERSION) {
  // Force reseed: fixes any players with old scores
  state.players = DEFAULT_PLAYERS.map(p => ({ id: uid(), ...p }));
  save();
  localStorage.setItem('futbol7_v', DATA_VERSION);
}
ensureDefaultPlayers();
renderAll();
handleUrlParam();
