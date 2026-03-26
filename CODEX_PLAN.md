# Plan de acción — Fútbol 7 App

Repo: https://github.com/lautarobusto/futbol7
Stack: HTML + CSS + JS vanilla, sin build. Deploy en GitHub Pages (branch `master`).

---

## Workflow

Este proyecto usa dos agentes con roles distintos:

- **Codex** — ejecuta features. Toma una feature del plan, la implementa, commitea y pushea. Una feature por sesión. No empieza la siguiente sin que CC revise.
- **Claude Code (CC)** — diseña, analiza y revisa. Define el plan, especifica cada feature con el código necesario, y revisa los cambios de Codex antes de aprobarlos.

**Cómo trabaja Codex en este proyecto:**
1. Leer este archivo completo antes de arrancar
2. Tomar **una sola feature** (la primera de la lista de prioridad)
3. Implementarla siguiendo exactamente las instrucciones — sin agregar features extra, sin refactorizar lo que no se pidió
4. Commitear con mensaje descriptivo y pushear
5. Detenerse — no continuar con la siguiente feature

**Qué NO hace Codex:**
- No cambia `generateTeams`, `enforceConstraints`, `parseWspList`, `extractWspName`, `matchPlayer`
- No cambia la paleta de colores ni las variables CSS
- No agrega dependencias externas
- No implementa más de una feature por sesión

---

## Contexto

App para armar equipos de fútbol 7 (siempre 2 equipos: Negro vs Blanco).
30 jugadores fijos con 3 métricas (Control, Estado físico, Velocidad, 1–10).
Flujo principal: pegar lista de WhatsApp → parsear → snake draft → compartir por WhatsApp.

Archivos clave:
- `index.html` — tabs: Jugadores / Partido / Equipos / Historial
- `style.css` — tema oscuro (variables: `--bg`, `--surface`, `--border`, `--primary`, `--muted`, `--text`)
- `app.js` — toda la lógica

**No tocar:** `generateTeams`, `enforceConstraints`, `parseWspList`, `extractWspName`, `matchPlayer`.

---

## Estado actual (post-revisión CC)

### ✅ Hecho y aprobado
- Parser WhatsApp con fuzzy matching robusto (`getMatchScore`)
- Snake draft balanceado + regla Chino/JP separados
- Historial de partidos — tab, schema, función `recordMatch()` lista
- Conteo de asistencia — `getAttendanceCounts()`, badge en Jugadores
- Sort de jugadores (`score` / `name` / `attendance`)
- **PWA completa** — `manifest.json`, `sw.js`, íconos, service worker

### ✅ Corregido
- **Admin lock** — eliminado. Edición abierta para todos. ✅ Feature 1 completada.

### ❌ Pendiente de corrección
- **Auto-guardado en historial** — `recordMatch()` se llama al armar Y al re-mezclar. Debe ser manual con modal. Ver Feature 3.

---

## Features pendientes

---

### ~~Feature 1 — Edición abierta~~ ✅ DONE
### ~~Feature 2 — Swap de jugadores~~ ✅ DONE
### ~~Feature 4 — Formato ASCII WhatsApp~~ ✅ DONE

---

### Feature 2 — Swap de jugadores entre equipos

**Contexto:** después de armar equipos, a veces querés mover un jugador de un equipo al otro manualmente (ej: alguien llegó tarde, alguien se fue).

**UX (mobile-first):**
- En cada jugador del equipo Negro: botón `→` (mover a Blanco)
- En cada jugador del equipo Blanco: botón `←` (mover a Negro)
- Un tap mueve al jugador al otro equipo y re-renderiza
- Los puntajes totales de cada equipo se actualizan en tiempo real

**Implementación en `app.js`:**
- Agregar acción `data-action="swap"` con `data-id` del jugador al botón
- En el event listener de clicks, manejar `action === 'swap'`:
  ```js
  case 'swap': {
    const { negro, blanco } = state.teams;
    const inNegro = negro.find(p => p.id === id);
    if (inNegro) {
      state.teams.negro = negro.filter(p => p.id !== id);
      state.teams.blanco.push(inNegro);
    } else {
      const inBlanco = blanco.find(p => p.id === id);
      state.teams.blanco = blanco.filter(p => p.id !== id);
      state.teams.negro.push(inBlanco);
    }
    renderTeams();
    break;
  }
  ```

**HTML del jugador en cada equipo (dentro de `renderTeams`):**
```html
<div class="team-player">
  <button class="swap-btn" data-action="swap" data-id="${p.id}">
    ${enNegro ? '→' : '←'}
  </button>
  <span>${esc(p.name)}</span>
  <span class="team-player-score">${totalScore(p)}</span>
</div>
```

**CSS:**
```css
.swap-btn {
  background: none;
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--muted);
  cursor: pointer;
  font-size: 12px;
  padding: 2px 6px;
  flex-shrink: 0;
}
.swap-btn:hover { color: var(--text); border-color: var(--muted); }
```

---

### Feature 3 — Historial con resultado y opinión de balanceo

**Flujo correcto** (el orden importa):
1. Se generan equipos → se guardan automáticamente como partido **"pendiente"** (sin resultado)
2. Van a jugar
3. Después del partido → tab Historial → partido pendiente arriba con botón **"Cargar resultado"**
4. Modal → cargan goles + opinión → queda guardado como partido completo

**Qué hacer:**

#### Paso 1 — Mantener el auto-guardado al generar, pero sin resultado
- `recordMatch()` sigue llamándose en `btn-generate` (NO en `btn-reshuffle` — solo al primer armado)
- El registro se guarda con `golesNegro: null`, `golesBlanco: null`, `balance: null` → estado "pendiente"

#### Paso 2 — Tab Historial: mostrar partido pendiente destacado
- Si el último registro tiene `golesNegro === null`, mostrarlo con clase `pending` y botón **"Cargar resultado"**
- CSS: borde con color acento (`--primary`) para destacarlo visualmente

#### Paso 3 — Modal "Cargar resultado"
Al tocar "Cargar resultado" en un partido pendiente, abrir un modal con:
- **Goles Negro** — `<input type="number" min="0" max="99">`
- **Goles Blanco** — `<input type="number" min="0" max="99">`
- **¿Cómo estuvo?** — `<select>`:
  - `''` → "Seleccioná..." (placeholder, required)
  - `'balanced'` → "Estuvo balanceado"
  - `'negro_better'` → "Negro fue mucho mejor"
  - `'blanco_better'` → "Blanco fue mucho mejor"
  - `'very_unbalanced'` → "Muy desbalanceado"
- Botones: Cancelar / Guardar

Al guardar: actualizar el registro en `state.history` con los valores, llamar `saveHistory()`, cerrar modal, re-renderizar historial.

#### Paso 4 — Schema en `localStorage['futbol7_history']`
```js
{
  id, date, dateLabel,
  negro: [{ name, score }],
  blanco: [{ name, score }],
  totalNegro, totalBlanco,
  golesNegro: null,    // null = pendiente, número = jugado
  golesBlanco: null,
  balance: null        // null | 'balanced' | 'negro_better' | 'blanco_better' | 'very_unbalanced'
}
```
Los registros viejos sin estos campos no deben romper — usar `?? null`.

#### Paso 5 — Render de cada tarjeta en Historial
- **Pendiente** (golesNegro === null): borde destacado, botón "Cargar resultado"
- **Completo**: mostrar `Negro X - Blanco Y` + badge de opinión con texto legible
- Jugadores de cada equipo listados debajo

#### HTML del modal (agregar en `index.html`):
```html
<div id="result-modal-overlay" class="modal-overlay hidden">
  <div class="modal">
    <div class="modal-header">
      <h2>Resultado del partido</h2>
      <button class="modal-close" id="result-modal-close">&times;</button>
    </div>
    <form id="result-form">
      <div class="form-group">
        <label>Goles Negro</label>
        <input type="number" id="input-goles-negro" min="0" max="99" placeholder="0">
      </div>
      <div class="form-group">
        <label>Goles Blanco</label>
        <input type="number" id="input-goles-blanco" min="0" max="99" placeholder="0">
      </div>
      <div class="form-group">
        <label>¿Cómo estuvo?</label>
        <select id="input-balance">
          <option value="">Seleccioná...</option>
          <option value="balanced">Estuvo balanceado</option>
          <option value="negro_better">Negro fue mucho mejor</option>
          <option value="blanco_better">Blanco fue mucho mejor</option>
          <option value="very_unbalanced">Muy desbalanceado</option>
        </select>
      </div>
      <div class="form-actions">
        <button type="button" class="btn btn-ghost" id="result-modal-cancel">Cancelar</button>
        <button type="submit" class="btn btn-primary">Guardar</button>
      </div>
    </form>
  </div>
</div>
```

#### CSS para el select y estado pendiente:
```css
select {
  width: 100%;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text);
  font-size: 14px;
  padding: 8px 10px;
  outline: none;
}
select:focus { border-color: var(--primary); }

.history-card.pending { border-color: var(--primary); }
.pending-label { font-size: 12px; color: var(--primary); margin-bottom: 6px; }
.balance-badge {
  font-size: 11px;
  border: 1px solid var(--border);
  border-radius: 4px;
  padding: 2px 8px;
  color: var(--muted);
}
```

---

### Feature 4 — Formato ASCII al compartir por WhatsApp

Los emojis se rompen en algunos dispositivos. Usar ASCII puro.

En `app.js`, listener de `btn-share`, reemplazar la construcción del texto:

```js
const lines = [
  `=== NEGRO (${negro.length}) ===`,
  ...negro.map(p => `- ${p.name}`),
  ``,
  `=== BLANCO (${blanco.length}) ===`,
  ...blanco.map(p => `- ${p.name}`),
];
window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
```

---

### Feature 5 — PWA (baja prioridad)

`index.html` ya tiene `<link rel="manifest">` y `<meta name="theme-color">`.

**Crear `manifest.json`:**
```json
{
  "name": "Fútbol 7",
  "short_name": "Fútbol 7",
  "start_url": ".",
  "display": "standalone",
  "background_color": "#0d1117",
  "theme_color": "#0d1117",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

**Crear `sw.js`:**
```js
const CACHE = 'futbol7-v1';
const ASSETS = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS))));
self.addEventListener('fetch', e => e.respondWith(caches.match(e.request).then(r => r || fetch(e.request))));
```

**Registrar en `app.js`** (al final):
```js
if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js');
```

**Íconos:** generar `icon-192.png` y `icon-512.png` (fondo `#0d1117`, ⚽ centrado).

---

## Orden de prioridad

1. Feature 1 — Remover admin lock
2. Feature 4 — Formato ASCII WhatsApp (cambio de 5 líneas)
3. Feature 2 — Swap de jugadores
4. Feature 3 — Guardado manual con resultado y opinión
5. Feature 5 — PWA

---

## Notas técnicas

- Vanilla JS puro, sin npm, sin build
- Mobile first — se usa en el vestuario
- `DATA_VERSION` actualmente `'v5'`. Si se modifica el schema de `state.players`, usar `'v6'`
- El historial ya usa schema propio en `localStorage['futbol7_history']` — si se agrega `golesNegro`/`golesBlanco`/`balance`, los registros viejos sin esos campos deben renderizar sin error (usar `?? null`)
- `CONSTRAINTS` al top de `app.js` — pares de nombres separados
- GitHub Pages desde branch `master`, carpeta raíz
