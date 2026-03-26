# Plan de acción — Fútbol 7 App

Repo: https://github.com/lautarobusto/futbol7
Stack: HTML + CSS + JS vanilla, sin build. Deploy en GitHub Pages (branch `master`).

---

## Workflow

- **Codex** — ejecuta features. Una feature por sesión. No avanza sin revisión de CC.
- **CC** — diseña, analiza y revisa antes de aprobar.

**Codex debe:**
1. Leer este archivo completo antes de arrancar
2. Tomar la **primera feature pendiente** de la lista
3. Implementar exactamente lo especificado — sin extras, sin refactors no pedidos
4. Commitear y pushear
5. Detenerse

**Codex NO toca:** `generateTeams`, `enforceConstraints`, `parseWspList`, `extractWspName`, `matchPlayer`, paleta de colores, dependencias externas.

---

## Contexto

App para armar equipos de fútbol 7 (2 equipos: Negro vs Blanco, 30 jugadores fijos).
Flujo principal: pegar lista WhatsApp → parsear → snake draft → ajustar con flechitas → confirmar → compartir.

Archivos: `index.html`, `style.css`, `app.js`.

---

## Estado actual

### ✅ Aprobado
- Parser WhatsApp con fuzzy matching (`getMatchScore`)
- Snake draft balanceado + regla Chino/JP separados
- Swap de jugadores con flechitas ← → (Feature 2)
- Formato ASCII en WhatsApp share (Feature 4)
- Conteo de asistencia + sort de jugadores
- PWA completa (manifest, sw, íconos)
- Schema de historial con `golesNegro`, `golesBlanco`, `balance` nullable
- Modal de resultado existe (`save-match-overlay`, `save-match-form`)

### ❌ Pendiente de corrección — Feature 3 revisada

Ver Feature 3 abajo. El flujo cambió respecto a la implementación anterior.

---

## Features pendientes

---

### Feature 3 — Rediseño del tab Equipos y flujo de historial

#### Cambios en el tab Equipos (`index.html` + `app.js`)

**Sacar:**
- Botón `btn-generate` ("Armar equipos") — ya no hace falta, cargar lista ya genera equipos
- Botón `btn-reshuffle` ("Re-mezclar") — reemplazado por las flechitas de swap

**Renombrar:**
- `btn-save-match` ("Guardar partido") → texto: **"Confirmar equipos"**
- Al clickear: llama a `recordMatch(state.teams)` con `golesNegro: null, golesBlanco: null, balance: null` y guarda en historial como partido **pendiente**
- Mostrar toast/mensaje breve: "Partido guardado. Cargá el resultado después del partido."
- El botón "Confirmar equipos" debe ser visible apenas se cargan los equipos (igual que hoy)

**Resultado en tab Equipos:** quedan solo 2 botones: **"Confirmar equipos"** y **"Compartir"** (WhatsApp).

#### Cambios en tab Historial (`index.html` + `app.js`)

**Tarjetas de partido:**
- Cada tarjeta es **tappeable** (cursor pointer, hover sutil)
- Al tocar una tarjeta → abre modal para cargar/editar resultado
- El modal ya existe (`save-match-overlay`) — reutilizarlo
- Al abrir: pre-cargar valores existentes del partido (si ya tiene goles/balance, mostrarlos)
- Al guardar: actualizar ese registro en `state.history` por `id`, llamar `saveHistory()`, cerrar modal, re-renderizar

**Visual de tarjetas:**
- **Pendiente** (golesNegro === null): borde `--primary`, texto gris "Sin resultado" donde iría el marcador
- **Con resultado**: mostrar `Negro X - Blanco Y` + badge de opinión

**Badge de opinión** (texto legible):
```js
const BALANCE_LABELS = {
  balanced: 'Balanceado',
  negro_better: 'Negro dominó',
  blanco_better: 'Blanco dominó',
  very_unbalanced: 'Muy desbalanceado',
};
```

#### Modal de resultado (reutilizar `save-match-overlay`)

El modal ya existe. Asegurarse que:
- Pre-carga valores del partido seleccionado al abrir
- Al submit: actualiza el registro existente (por `id`), NO crea uno nuevo
- `balance` input: valor por defecto `'balanced'` si no había valor previo
- Goles: inputs type number, pueden quedar vacíos (se guardan como `null`)

#### Eliminar
- El listener actual de `btn-save-match` que abre el modal desde Equipos (reemplazado por el tap en tarjeta de historial)
- El modal de guardado que se abre desde Equipos (si es distinto al `save-match-overlay`)

---

### Feature 5 — (ya hecha, solo verificar)
PWA: manifest, sw, íconos. ✅

---

## Notas técnicas

- Vanilla JS, sin npm, sin build
- Mobile first
- `DATA_VERSION = 'v5'` — no cambiar schema de `state.players` sin incrementar
- `CONSTRAINTS` al top de `app.js` — pares separados
- GitHub Pages desde branch `master`, raíz
