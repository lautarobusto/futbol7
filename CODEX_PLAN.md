# Plan de acción — Fútbol 7 App

Repo: https://github.com/lautarobusto/futbol7
Stack: HTML + CSS + JS vanilla, sin build. Deploy en GitHub Pages.

---

## Contexto

App para armar equipos de fútbol 7 (siempre 2 equipos: Negro vs Blanco).
Hay 30 jugadores fijos con 3 métricas (Control, Estado físico, Velocidad, escala 1–10).
El flujo principal: pegar la lista de WhatsApp → la app parsea los que vienen → arma equipos balanceados con snake draft.

Estado actual del código:
- `index.html` — estructura con 3 tabs: Jugadores / Partido / Equipos
- `style.css` — tema oscuro (Void Space palette)
- `app.js` — toda la lógica: estado, localStorage, snake draft, parser WhatsApp, matching fuzzy

---

## Tareas pendientes

### 1. PWA — "Agregar a pantalla de inicio"
- Crear `manifest.json` con nombre, iconos, colores del tema
- Agregar `<link rel="manifest">` en `index.html`
- Registrar un service worker básico para que funcione offline
- El service worker debe cachear `index.html`, `style.css`, `app.js`
- **Objetivo:** que los jugadores puedan instalarla en el celular como app nativa

### 2. Modo admin — protección de edición de stats
- Agregar un botón candado (🔒) en el header
- Al clickear pide un PIN (hardcodeado, ej: `"7777"`)
- En modo admin: se pueden editar/eliminar jugadores libremente
- Sin modo admin: el tab "Jugadores" es solo lectura (sin botones de editar/eliminar)
- El PIN no necesita ser seguro, es solo para evitar ediciones accidentales en el vestuario
- El estado admin se guarda en `sessionStorage` (se cierra al cerrar la pestaña)

### 3. Historial de partidos
- Guardar en localStorage cada vez que se generan equipos (fecha + equipos + puntajes)
- Nuevo tab "Historial" con los últimos 10 partidos
- Cada entrada muestra: fecha, Negro vs Blanco con jugadores
- Botón para borrar historial

### 4. Conteo de asistencia
- En el tab Jugadores, mostrar junto a cada jugador cuántas veces asistió (contador basado en historial)
- Ordenar opcionalmente por asistencia

---

## Notas técnicas

- **No usar frameworks** — vanilla JS puro
- **No cambiar la paleta de colores** — usar las variables CSS existentes (`--bg`, `--surface`, `--border`, `--primary`, etc.)
- **No romper el flujo existente** — el parser de WhatsApp y el snake draft deben seguir funcionando igual
- **Mobile first** — todo debe funcionar bien en celular (se usa en el vestuario)
- `DATA_VERSION` en `app.js` actualmente es `'v5'`. Si se cambia el schema de `state.players`, incrementar a `'v6'`
- Las restricciones de equipo están en `CONSTRAINTS` array al top de `app.js`

---

## Cómo testear

1. Abrir `index.html` directo en el browser (no necesita servidor)
2. Pegar la lista de WhatsApp en tab Equipos → verificar que matchea 14/14
3. Armar equipos → verificar que Chino y JP quedan en equipos distintos
4. Verificar en mobile (DevTools responsive mode)
