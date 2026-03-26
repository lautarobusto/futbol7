# Plan de acción — Fútbol 7 App

Repo: https://github.com/lautarobusto/futbol7
Stack: HTML + CSS + JS vanilla, sin build. Deploy en GitHub Pages (branch `master`).

---

## Contexto

App para armar equipos de fútbol 7 (siempre 2 equipos: Negro vs Blanco).
Hay 30 jugadores fijos con 3 métricas (Control, Estado físico, Velocidad, escala 1–10).
El flujo principal: pegar la lista de WhatsApp → la app parsea los que vienen → arma equipos balanceados con snake draft.

Archivos:
- `index.html` — estructura con 3 tabs: Jugadores / Partido / Equipos
- `style.css` — tema oscuro (Void Space palette: `--bg: #0d1117`, `--surface: #161b22`, etc.)
- `app.js` — toda la lógica: estado, localStorage, snake draft, parser WhatsApp, matching fuzzy
- `manifest.json` — ⚠️ aún no existe, hay que crearlo
- `sw.js` — ⚠️ aún no existe, hay que crearlo

---

## Estado de tareas

### ✅ Hecho
- Parser de lista WhatsApp (pegar → matchear jugadores → armar equipos)
- Snake draft balanceado (2 equipos: Negro / Blanco)
- Regla: Chino y JP siempre en equipos distintos (`CONSTRAINTS` en `app.js`)
- Botón compartir por WhatsApp (abre wa.me con el texto pre-armado)
- Link por jugador para auto-editar stats (`?jugador=Nombre`)
- `index.html` ya tiene `<link rel="manifest" href="manifest.json">` y `<meta name="theme-color" content="#0d1117">`

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

**`sw.js`** (service worker, crear en raíz):
- Cachear en install: `index.html`, `style.css`, `app.js`, `manifest.json`
- En fetch: cache-first para archivos propios, network para el resto
- Nombre del cache: `futbol7-v1`

**Registrar el SW** al final de `app.js`:
```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
```

**Testear PWA**:
- Chrome DevTools → Application → Manifest: verificar sin errores
- Application → Service Workers: verificar que está activo
- En mobile Chrome: debe aparecer el banner "Agregar a pantalla de inicio"

---

### 🔲 2. Modo admin — protección de edición

**Problema**: en el vestuario alguien puede tocar los sliders y romper las stats de todos.

**Implementación**:
- Botón 🔒 en el header (derecha)
- Click → prompt con PIN. PIN hardcodeado: `"7777"` (cambiar en `app.js`)
- Si PIN correcto → modo admin activado, ícono cambia a 🔓
- Estado en `sessionStorage` (se cierra al cerrar la pestaña)
- **Sin modo admin**: tab "Jugadores" oculta los botones ✏️ y ✕ de cada jugador. El botón "+ Jugador" también se oculta.
- **Con modo admin**: todo visible como ahora

CSS: agregar clase `.locked` al `<body>` cuando no es admin. Ocultar `.row-actions` y `#btn-add-player` con `.locked .row-actions { display: none }`.

---

### 🔲 3. Historial de partidos

**Cuándo guardar**: cada vez que se llama a `generateTeams()` y produce un resultado, guardar en localStorage.

**Schema** (array en `localStorage['futbol7_history']`):
```js
[
  {
    date: "2026-03-27",          // ISO date
    negro: ["David", "Seba", ...],
    blanco: ["Roger", "Chori", ...],
    scoreNegro: 84,
    scoreBlanco: 83
  },
  ...
]
```
Guardar máximo 20 entradas. Si supera 20, eliminar la más antigua.

**Nuevo tab "Historial"** en `index.html` (4to tab):
- Lista de partidos ordenados por fecha DESC
- Cada entrada: fecha + dos columnas Negro / Blanco con los jugadores
- Botón "Borrar historial" al pie

---

### 🔲 4. Conteo de asistencia

Derivado del historial. No requiere schema nuevo.

- En `renderPlayers()`, para cada jugador contar cuántas veces aparece en el historial (en negro o blanco)
- Mostrar el número junto al nombre: badge simple tipo `(5)` o un ícono
- Agregar botón de sort en el tab Jugadores: "Ordenar por asistencia / por nombre"

---

## Notas técnicas para Codex

- **No usar frameworks** — vanilla JS puro, sin npm, sin build
- **No cambiar la paleta de colores** — usar las variables CSS existentes
- **No tocar el parser de WhatsApp** — funciones `parseWspList`, `extractWspName`, `matchPlayer` en `app.js`
- **No tocar el algoritmo de equipos** — `generateTeams` + `enforceConstraints` en `app.js`
- **Mobile first** — la app se usa en el vestuario, en el celular
- `DATA_VERSION` en `app.js` actualmente es `'v5'`. Si se modifica el schema de `state.players`, incrementar a `'v6'`
- Las restricciones de equipo están en `CONSTRAINTS` (array de pares de nombres) al top de `app.js`
- GitHub Pages sirve desde branch `master`, carpeta raíz

## Orden de prioridad sugerido

1. PWA (impacto inmediato para los jugadores)
2. Modo admin (evita accidentes)
3. Historial
4. Asistencia (depende del historial)
