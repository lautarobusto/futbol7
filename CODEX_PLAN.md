# Plan de acción — Fútbol 7 App

Repo: https://github.com/lautarobusto/futbol7
Stack: HTML + CSS + JS vanilla, sin build. Deploy en GitHub Pages (branch `master`).

---

## Contexto

App para armar equipos de fútbol 7 (siempre 2 equipos: Negro vs Blanco).
Hay 30 jugadores fijos con 3 métricas (Control, Estado físico, Velocidad, escala 1–10).
El flujo principal: pegar la lista de WhatsApp → la app parsea los que vienen → arma equipos balanceados con snake draft.

Archivos:
- `index.html` — estructura con tabs: Jugadores / Partido / Equipos / Historial
- `style.css` — tema oscuro (Void Space palette: `--bg: #0d1117`, `--surface: #161b22`, etc.)
- `app.js` — toda la lógica: estado, localStorage, snake draft, parser WhatsApp, matching fuzzy
- `manifest.json` — ⚠️ aún no existe
- `sw.js` — ⚠️ aún no existe

---

## Estado de tareas

### ✅ Hecho
- Parser de lista WhatsApp (pegar → matchear jugadores → armar equipos)
- Snake draft balanceado (2 equipos: Negro / Blanco)
- Regla: Chino y JP siempre en equipos distintos (`CONSTRAINTS` en `app.js`)
- Botón compartir por WhatsApp (abre wa.me con el texto pre-armado)
- Link por jugador para auto-editar stats (`?jugador=Nombre`)
- `index.html` tiene `<link rel="manifest">` y `<meta name="theme-color">`
- **Modo admin** — botón candado en header, PIN hardcodeado, estado en `sessionStorage`
  - Sin admin: tab Jugadores es solo lectura (sin ✏️ ni ✕), muestra nota
  - Con admin: edición completa habilitada
  - CSS: `.admin-toggle` y `.admin-toggle.is-admin` ya definidos en `style.css`
- **Historial de partidos** — tab "Historial" con los últimos 20 partidos
  - Schema: `{ id, date, dateLabel, negro, blanco, totalNegro, totalBlanco }`
  - Guardado en `localStorage['futbol7_history']`
  - `recordMatch()` llamado al generar equipos
- **Conteo de asistencia** — `getAttendanceCounts()` basado en el historial
  - Badge `X asist.` junto a cada jugador en tab Jugadores
  - Botón de sort: puntaje / nombre / asistencia
- **Player sort** — `state.playerSort` con opciones `'score'`, `'name'`, `'attendance'`

---

### 🔲 1. PWA — completar instalación

`index.html` ya referencia el manifest. Falta crear los archivos:

**`manifest.json`** (crear en raíz):
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

**Íconos**: generar `icon-192.png` y `icon-512.png` — fondo `#0d1117`, emoji ⚽ centrado.
Podés generarlos con canvas en Node, o usar una herramienta online y commitearlos.

**`sw.js`** (service worker, crear en raíz):
```js
const CACHE = 'futbol7-v1';
const ASSETS = ['/', '/index.html', '/style.css', '/app.js', '/manifest.json'];

self.addEventListener('install', e => e.waitUntil(
  caches.open(CACHE).then(c => c.addAll(ASSETS))
));

self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(r => r || fetch(e.request))
));
```

**Registrar el SW** — ya debería estar al final de `app.js`, verificar que existe:
```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
```

**Testear**:
- Chrome DevTools → Application → Manifest: sin errores
- Application → Service Workers: activo
- Mobile Chrome: banner "Agregar a pantalla de inicio"

---

### 🔲 2. Formato WhatsApp al compartir

El botón de compartir existe y funciona, pero el formato del texto necesita mejora.

Formato deseado (un jugador por línea, camisetas como header):
```
👕⚫ *Negro* (7 jugadores)
▪ David
▪ Seba
...

👕⚪ *Blanco* (7 jugadores)
▪ Roger
▪ Chori
...
```

En `app.js`, buscar el listener de `btn-share` y cambiar la construcción del `text`:
```js
const lines = [
  `👕⚫ *Negro* (${negro.length} jugadores)`,
  ...negro.map(p => `▪ ${p.name}`),
  ``,
  `👕⚪ *Blanco* (${blanco.length} jugadores)`,
  ...blanco.map(p => `▪ ${p.name}`),
];
window.open('https://wa.me/?text=' + encodeURIComponent(lines.join('\n')), '_blank');
```

---

## Notas técnicas para Codex

- **No usar frameworks** — vanilla JS puro, sin npm, sin build
- **No cambiar la paleta de colores** — usar variables CSS existentes
- **No tocar el parser de WhatsApp** — `parseWspList`, `extractWspName`, `matchPlayer`
- **No tocar el algoritmo de equipos** — `generateTeams` + `enforceConstraints`
- **Mobile first** — se usa en el vestuario, en el celular
- `DATA_VERSION` actualmente `'v5'`. Si se modifica el schema de `state.players`, usar `'v6'`
- `CONSTRAINTS` al top de `app.js` — pares de nombres que no pueden ir juntos
- GitHub Pages sirve desde branch `master`, carpeta raíz

## Prioridad restante

1. PWA (manifest + sw.js + íconos)
2. Formato WhatsApp (cambio menor en btn-share listener)
