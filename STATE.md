# 🪄 Magic Picker — STATE.md

> Documento de estado para el hackathon WebMCP.
> Última actualización: 2026-09-01

---

## 📋 Resumen del Proyecto

**Magic Picker** es un file resolver WebMCP para agentes de navegador. Cuando un agente de IA necesita un archivo, Magic Picker lo resuelve automáticamente desde el directorio del usuario — sin modal, sin interrupción del flujo.

**Repo:** https://github.com/Akunimal/magicpicker
**Autor:** Akunimal
**Stack:** React 18 + TypeScript + Vite

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────┐
│                  AI Agent                        │
│         (ChatGPT, Claude, Codex)                │
└────────────────────┬────────────────────────────┘
                     │ WebMCP call (navigator.modelContext)
                     ▼
┌─────────────────────────────────────────────────┐
│       magic_picker tool (auto-resolve)           │
│   magicPickerTool.ts → fileResolver             │
└────────────────────┬────────────────────────────┘
                     │ File System Access API
                     ▼
┌─────────────────────────────────────────────────┐
│       Project Directory (persistent handle)      │
│   ┌─────────────────────────────────────────┐   │
│   │  Path detection → File search → Read    │   │
│   └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │ base64 conversion
                     ▼
┌─────────────────────────────────────────────────┐
│           FileResult (base64)                   │
│   → Devuelto al agente via WebMCP               │
└─────────────────────────────────────────────────┘
```

---

## 📁 Estructura de Archivos

```
MagicPicker/
├── index.html                    # Entry HTML
├── package.json                  # Dependencias y scripts
├── vite.config.ts                # Config Vite
├── tsconfig.json                 # TypeScript config
├── README.md                     # Documentación principal
├── SUBMISSION.md                 # Submission al hackathon
├── VIDEO_SCRIPT.md               # Guion de grabación
├── PICKER_BRIDGE.md              # Frontera de alcance
├── STATE.md                      # ← Este archivo
│
├── public/
│   ├── magic.svg                 # Favicon
│   └── agent-demo.html           # Página demo para agentes
│
└── src/
    ├── main.tsx                  # Entry point React
    ├── App.tsx                   # Componente principal
    ├── styles.css                # Landing y UI responsive
    ├── webmcp-types.ts           # Interfaces TypeScript
    │
    ├── webmcp/
    │   ├── magicPickerTool.ts    # Tool WebMCP (registerTool)
    │   ├── polyfill.ts           # Polyfill para testing local
    │   └── fsa.d.ts              # Tipos File System Access API
    │
    ├── state/
    │   └── fileResolver.ts       # Motor de resolución automática
    │
    └── components/
        ├── StatusBar.tsx          # Indicador WebMCP status
        ├── DirectorySetup.tsx     # UI para conectar directorio
        └── ResolverLog.tsx        # Log de resoluciones
```

---

## 🔧 Detalles Técnicos por Archivo

### `src/webmcp/magicPickerTool.ts`
Registra la tool `magic_picker` en `navigator.modelContext` (WebMCP nativo):

- **Estrategia 1:** `navigator.modelContext.registerTool()` — WebMCP nativo, cross-tab
- **Estrategia 2:** `window.modelContext.registerTool()` — Polyfill local, same-tab
- **Execute:** Llama a `fileResolver.resolveFile()` — resolución automática sin modal
- **Resultado:** `FileResult` con fileName, fileSize, fileType, base64Data

### `src/state/fileResolver.ts`
Motor de resolución automática de archivos:

- **File System Access API:** `showDirectoryPicker()` para obtener acceso al directorio
- **IndexedDB:** Persiste el directory handle entre sesiones
- **Path detection:** Extrae paths del prompt (ej: `src/App.tsx`)
- **File search:** Recorre el árbol de archivos buscando matches
- **Read:** Lee archivos y los convierte a base64

### `src/webmcp/polyfill.ts`
Polyfill mínimo para testing sin WebMCP nativo:

- Solo se activa si `navigator.modelContext` no existe
- Registra `window.modelContext` con `registerTool()`, `getTool()`, etc.
- Solo funciona same-tab (no cross-tab)

### `src/components/DirectorySetup.tsx`
UI para conectar el directorio del proyecto:

- Muestra estado: desconectado / conectado
- Botón para seleccionar directorio (una vez)
- Restore automático desde IndexedDB

### `src/components/ResolverLog.tsx`
Log de resoluciones recientes:

- Escucha eventos `magic-picker:resolve`
- Muestra archivo, status y timestamp
- Últimas 20 resoluciones

### `src/components/StatusBar.tsx`
Indicador fijo en esquina inferior derecha:

- Tool: registered / pending
- WebMCP: native (cross-tab) / polyfill (same-tab) / not registered

---

## 🎯 Decisiones de Diseño

| Decisión | Razón |
|----------|-------|
| **Auto-resolve sin modal** | El flujo del agente no se corta — el archivo se resuelve automáticamente |
| **File System Access API** | Acceso persistente al directorio sin re-pedir permiso |
| **IndexedDB para handle** | Persiste entre sesiones del navegador |
| **WebMCP nativo primeiro** | Cross-tab routing via navigator.modelContext |
| **Polyfill como fallback** | Testing local sin WebMCP habilitado |
| **Base64 como retorno** | Formato estándar que los agentes pueden procesar directamente |
| **Vite** | Build rápido, DX, ESM nativo |

---

## ✅ Estado de Implementación

### Completado ✅
- [x] Estructura del proyecto
- [x] Configuración TypeScript + Vite
- [x] Interfaces y tipos
- [x] File resolver (auto-resolve sin modal)
- [x] File System Access API + IndexedDB persistence
- [x] Path detection + file search
- [x] WebMCP nativo registration
- [x] Polyfill para testing local
- [x] DirectorySetup UI
- [x] ResolverLog
- [x] StatusBar
- [x] Build de producción
- [x] Landing page responsive
- [x] README.md
- [x] SUBMISSION.md
- [x] Git init + commit
- [x] Repo GitHub público

### Pendiente
- [ ] Video demo de 3 minutos
- [ ] Deploy en Vercel
- [ ] Testear con WebMCP real (Chrome + flags)

---

## 🧪 Cómo Probar

### Opción 1: Testing Local
1. `npm run dev`
2. Abrir http://localhost:3000
3. Click **Select project directory**
4. Elegir una carpeta del proyecto

### Opción 2: WebMCP Real
1. Abrir en Chrome con WebMCP habilitado (`chrome://flags/#web-mcp`)
2. Abrir otra pestaña con un agente WebMCP
3. El agente descubre `magic_picker`
4. Preguntar: *"Lee el archivo src/App.tsx"*
5. El archivo se resuelve automáticamente

---

## 📊 Métricas

| Métrica | Valor |
|---------|-------|
| Archivos fuente | 7 (.ts/.tsx) + styles.css |
| Bundle size | ~160KB (52KB gzip) |
| Dependencias runtime | 2 (react, react-dom) |
| Dependencias dev | 4 (vite, typescript, plugin-react, types) |
| Components | 3 React components |
| Tiempo build | ~600ms |

---

## 🔐 Seguridad

- Acceso al directorio requiere permiso explícito del usuario (File System Access API)
- El permiso se persiste pero puede revocarse en cualquier momento
- Archivos procesados 100% client-side
- Sin envío a servidores externos
- Validación de tamaño configurable
