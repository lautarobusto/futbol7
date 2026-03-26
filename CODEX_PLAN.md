# Plan de acción — Fútbol 7 App

Repo: https://github.com/lautarobusto/futbol7
Stack: HTML + CSS + JS vanilla, sin build. Deploy en GitHub Pages (branch `master`).

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

## Features pendientes

---

### Feature 1 — Edición abierta (remover lock de admin)

**Problema:** se implementó un candado con PIN que bloquea la edición de stats. No hace falta — cualquiera del grupo puede editar.

**Qué hacer:**
- Eliminar el botón `admin-toggle` del `<header>` en `index.html`
- Eliminar toda la lógica de admin en `app.js`: `ADMIN_KEY`, `state.isAdmin`, `saveAdminState()`, el prompt del PIN, y el condicional `hidden` en los botones de editar/eliminar
- Los botones ✏️ y ✕ de cada jugador siempre visibles
- El botón `+ Jugador` siempre visible
- Eliminar la clase `.admin-toggle` y `.admin-toggle.is-admin` de `style.css`
- Eliminar el texto "Modo lectura. Activá el candado para editar..." del render

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

### Feature 3 — Guardado manual de partido

**Problema actual:** el historial se guarda automáticamente al armar equipos. Se quiere control manual: guardar solo cuando el partido realmente se jugó, con resultado y opinión de balanceo.

**Qué hacer:**

1. **Remover el auto-guardado:** en `app.js`, quitar el llamado a `recordMatch()` del listener de `btn-generate` y de `btn-reshuffle`.

2. **Agregar botón "Guardar partido"** en el tab Equipos, visible solo cuando hay equipos armados (junto a Re-mezclar y Compartir):
   ```html
   <button class="btn btn-secondary" id="btn-save-match" style="display:none">Guardar partido</button>
   ```

3. **Modal de guardado** — al clickear "Guardar partido", abrir un modal con:
   - **Resultado Negro** — input numérico (goles)
   - **Resultado Blanco** — input numérico (goles)
   - **Opinión de balanceo** — `<select>` con opciones:
     - `balanced` → "Estuvo balanceado"
     - `negro_better` → "Negro fue mucho mejor"
     - `blanco_better` → "Blanco fue mucho mejor"
     - `very_unbalanced` → "Muy desbalanceado en general"
   - Botones: Cancelar / Guardar

4. **Schema actualizado** en `localStorage['futbol7_history']`:
   ```js
   {
     id, date, dateLabel,
     negro: [{ name, score }],
     blanco: [{ name, score }],
     totalNegro, totalBlanco,
     golesNegro: 3,       // número, puede ser null si no se cargó
     golesBlanco: 2,
     balance: 'balanced'  // 'balanced' | 'negro_better' | 'blanco_better' | 'very_unbalanced'
   }
   ```

5. **Mostrar en historial:** cada tarjeta de partido muestra:
   - Resultado: `Negro 3 - Blanco 2` (si se cargó)
   - Opinión: badge con texto legible
   - Jugadores de cada equipo

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
