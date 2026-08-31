# 🪄 Magic Picker — STATE.md

> Documento de estado completo para el hackathon WebMCP.
> Última actualización: 2026-08-30

---

## 📋 Resumen del Proyecto

**Magic Picker** es una tool WebMCP de human handoff: permite a agentes de IA solicitar archivos mediante una UI controlada por la página, sin pedirle al agente que opere un diálogo nativo del sistema operativo. El alcance deliberadamente concreto es un solo flujo sólido: `magic_picker`.

**Repo:** https://github.com/Akunimal/magicpicker  
**Autor:** Akunimal  
**Stack:** React 18 + TypeScript + Vite  

---

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────┐
│                  AI Agent                        │
│         (ChatGPT, Claude, etc.)                  │
└────────────────────┬────────────────────────────┘
                     │ WebMCP call
                     ▼
┌─────────────────────────────────────────────────┐
│           window.modelContext                    │
│          (WebMCP API / Polyfill)                 │
└────────────────────┬────────────────────────────┘
                     │ registerTool()
                     ▼
┌─────────────────────────────────────────────────┐
│          magic_picker tool                       │
│   magicPickerTool.ts → pickerState              │
└────────────────────┬────────────────────────────┘
                     │ requestFile()
                     ▼
┌─────────────────────────────────────────────────┐
│        MagicPickerModal (React UI)              │
│   ┌─────────────────────────────────────────┐   │
│   │         DropZone (drag & drop)          │   │
│   │    FileReader → base64 conversion       │   │
│   └─────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────┘
                     │ complete(result)
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
├── vite.config.ts                # Config Vite (puerto 3000)
├── tsconfig.json                 # TypeScript config
├── tsconfig.node.json            # TypeScript para Vite
├── .gitignore                    # Ignorar node_modules, dist
├── README.md                     # Documentación principal
├── SUBMISSION.md                 # Formato de submission al hackathon
├── VIDEO_SCRIPT.md               # Guion y checklist de grabación <3 min
├── PICKER_BRIDGE.md              # Frontera de página, host, popups y terminal
├── LICENSE                       # MIT license visible para el repo público
├── STATE.md                      # ← Este archivo
│
├── public/
│   ├── magic.svg                 # Favicon
│   └── agent-demo.html           # Página demo para agentes
│
├── scripts/
│   └── final-check.cjs           # Script de verificación
│
└── src/
    ├── main.tsx                  # Entry point React + polyfill
    ├── App.tsx                   # Componente principal
    ├── styles.css                # Landing y UI responsive
    ├── webmcp-types.ts           # Interfaces TypeScript
    │
    ├── webmcp/
    │   ├── magicPickerTool.ts    # Tool WebMCP (registerTool)
    │   └── polyfill.ts           # Polyfill para testing local
    │
    ├── state/
    │   └── pickerState.ts        # Estado global del picker
    │
    ├── utils/
    │   └── fileToBase64.ts       # Conversión archivo → base64
    │
    └── components/
        ├── DropZone.tsx           # Zona drag & drop
        ├── MagicPickerModal.tsx   # Modal del picker
        ├── StatusBar.tsx          # Indicador WebMCP status
        ├── TestPanel.tsx          # Panel de testing manual
        └── WebMCPConsole.tsx      # Consola WebMCP para testing
```

---

## 🔧 Detalles Técnicos por Archivo

### `src/webmcp-types.ts`
Define las interfaces TypeScript del proyecto:

| Interface | Propósito |
|-----------|-----------|
| `WebMCPTool` | Estructura de una tool WebMCP (name, description, inputSchema, execute) |
| `FileResult` | Resultado de la selección de archivo (success, fileName, fileSize, fileType, base64Data, error) |
| `MagicPickerOptions` | Opciones del picker (accept, multiple, maxSizeMB, prompt) |

### `src/state/pickerState.ts`
Estado global singleton con patrón pub/sub:

- **Clase:** `PickerStateManager`
- **Estado:** `{ isOpen, options, resolvePromise }`
- **Métodos:**
  - `requestFile(options, signal?)` → Retorna `Promise<FileResult>`, abre el modal y respeta cancelación
  - `complete(result)` → Resuelve la promise, cierra el modal
  - `subscribe(listener)` → Suscripción a cambios de estado
- **Flujo:** `requestFile()` crea una Promise, guarda el resolver en estado, el modal la resuelve con `complete()`

### `src/webmcp/magicPickerTool.ts`
Registra la tool `magic_picker` en `window.modelContext`:

- **Input Schema:** `accept` (string), `multiple` (boolean), `maxSizeMB` (number), `prompt` (string)
- **Execute:** Llama a `pickerState.requestFile(options, signal)` y retorna el `FileResult`
- **Registro:** Prefiere `document.modelContext` (API actual) y usa `window.modelContext` como fallback
- **Cancelación:** Limpia la UI y resuelve con error si WebMCP aborta la ejecución o la página se descarga

### `src/webmcp/polyfill.ts`
Polyfill para testing en navegadores sin WebMCP nativo:

- **Clase:** `WebMCPPolyfill`
- **Métodos:** `registerTool()`, `getTool()`, `listTools()`, `invokeTool()`
- Se auto-instala en `window.modelContext` si no existe
- Permite testing completo via WebMCPConsole

### `src/utils/fileToBase64.ts`
Utilidades de manejo de archivos:

| Función | Propósito |
|---------|-----------|
| `fileToBase64(file)` | Convierte File a string base64 (sin prefijo data:) |
| `validateFile(file, maxSizeMB)` | Valida tamaño del archivo |
| `formatFileSize(bytes)` | Formatea bytes a "1.23 MB" legible |

### `src/components/DropZone.tsx`
Componente de drag & drop:

- Accepts: `accept`, `multiple`, `maxSizeMB`, `onFilesSelected`
- Soporta: drag & drop + click para abrir file dialog
- Valida archivos antes de procesar
- Muestra errores de validación inline

### `src/components/MagicPickerModal.tsx`
Modal que se muestra cuando un agente invoca la tool:

- Se suscribe a `pickerState` para abrir/cerrar
- Muestra el prompt del agente al usuario
- Contiene el `DropZone`
- Botón cancelar resuelve con error

### `src/components/TestPanel.tsx`
Panel de testing que simula una invocación del agente:

- Botón "Test: Request Image File"
- Abre el modal con opciones predefinidas
- Muestra el resultado en JSON
- Preview de imagen si es exitoso

### `src/components/WebMCPConsole.tsx`
Consola interactiva para testing directo:

- Acepta comandos JSON
- `{"action": "list"}` → Lista tools registradas
- `{"action": "invoke", "tool": "magic_picker", "input": {...}}` → Invoca la tool

### `src/components/StatusBar.tsx`
Indicador fijo en esquina inferior derecha:

- WebMCP: ✅/❌ Available
- Tool: ✅/❌ Registered

---

## 🎯 Decisiones de Diseño

| Decisión | Razón |
|----------|-------|
| **Singleton pattern** para estado | Un solo picker en la app, simplifica el flujo Promise-based |
| **Promise-based flow** | El agente llama `execute()` y espera el resultado async |
| **Polyfill incluido** | Permite testing completo sin WebMCP nativo |
| **Base64 como retorno** | Formato estándar que los agentes pueden procesar directamente |
| **Stylesheet dedicado** | Landing, demo y estados interactivos comparten una interfaz coherente |
| **Sin routing** | App de una sola página, no necesita navegación |
| **Vite over CRA** | Build más rápido, mejor DX, ESM nativo |

---

## ✅ Estado de Implementación

### Completado ✅
- [x] Estructura del proyecto
- [x] Configuración TypeScript + Vite
- [x] Interfaces y tipos
- [x] Estado global (pickerState)
- [x] Tool WebMCP (magic_picker)
- [x] Polyfill WebMCP
- [x] Conversión archivo → base64
- [x] DropZone (drag & drop + click)
- [x] Modal del picker
- [x] Panel de testing
- [x] Consola WebMCP
- [x] StatusBar
- [x] Build de producción
- [x] Flujo cancelable con `AbortSignal` y `pagehide`
- [x] Landing pública responsive y página de quickstart para agentes
- [x] Límite documentado entre UI de página y popups/terminales del host
- [x] README.md
- [x] SUBMISSION.md
- [x] Git init + commit
- [x] Repo GitHub público
- [x] Verificación automatizada (final-check.cjs)

### Pendiente para el Hackathon
- [ ] Video demo de 3 minutos
- [x] Deploy público en Vercel: https://magic-picker.vercel.app
- [x] Actualizar SUBMISSION.md con URL real
- [ ] Testear con WebMCP real (Chrome 149+ / ChatGPT browser)
- [ ] Grabar y pegar URL del video público de YouTube

---

## 🚀 Cómo Ejecutar

```bash
# Instalar dependencias
npm install

# Desarrollo (puerto 3000)
npm run dev

# Build producción
npm run build

# Preview build
npm run preview

# Verificación
node scripts/final-check.cjs
```

---

## 🧪 Cómo Probar

### Opción 1: Testing Local (polyfill)
1. `npm run dev`
2. Abrir http://localhost:3000
3. Usar **Test Panel** o **WebMCP Console**

### Opción 2: WebMCP Real
1. Abrir en Chrome 149+ con WebMCP habilitado
2. O en ChatGPT's built-in browser
3. Decir: *"Use magic_picker to ask me for an image file"*
4. Seleccionar archivo en el modal
5. El agente recibe el base64

---

## 📊 Métricas

| Métrica | Valor |
|---------|-------|
| Archivos fuente | 14 (.ts/.tsx) |
| Líneas de código | ~600 |
| Bundle size | 154KB (50KB gzip) |
| Dependencias runtime | 2 (react, react-dom) |
| Dependencias dev | 4 (vite, typescript, plugin-react, types) |
| Components | 5 React components |
| Tiempo build | ~500ms |

---

## 🔐 Seguridad

- Archivos procesados 100% client-side
- Sin envío a servidores externos
- Validación de tamaño configurable
- Filtrado de tipos vía `accept`
- Sin persistencia de archivos seleccionados

---

## 📝 Notas para el Video Demo

**Script sugerido (3 min):**

1. **0:00-0:30** — Problema: Agentes no pueden operar file dialogs nativos
2. **0:30-1:30** — Demo: ChatGPT invoca magic_picker → usuario selecciona → agente recibe base64
3. **1:30-2:30** — Código: Mostrar registerTool, el flujo Promise, la UI
4. **2:30-3:00** — Impacto: Un patrón simple de handoff, con una frontera clara entre página y host

---

## 📦 Checklist de Submission

- [x] Código fuente completo
- [x] README con instrucciones
- [x] Build de producción
- [x] Repo GitHub público
- [ ] Video demo
- [ ] URL de deploy
- [ ] SUBMISSION.md con URLs actualizadas
