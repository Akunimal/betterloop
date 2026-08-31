# MagicPicker — Estado actual

Última actualización: 2026-08-31

## Objetivo

Dar a un agente de navegador una capacidad explícita para resolver el archivo exacto que el usuario pidió y entregarlo a un `<input type="file">` de otra pestaña sin abrir el diálogo nativo.

## Arquitectura vigente

```text
Usuario pulsa Activate MagicPicker en la control page
  → sesión temporal en memoria + heartbeat
  → magic_picker_activate confirma consentimiento
  → runtime CDP Codex o extensión MV3 recibe el flujo
  → magic_picker_tabs lista los tabs de esa sesión
  → magic_picker_attach(path, targetTabId)
  → runtime CDP usa DOM.setFileInputFiles
       o la extensión resuelve por gateway/control page
  → el upload continúa sin picker nativo
```

La sesión no se persiste: termina con Deactivate, al cerrar/navegar la control page o cuando vence el heartbeat. El runtime local también recibe la desactivación y deja de aceptar operaciones. La extensión limpia las colas y los clicks normales vuelven a su comportamiento nativo.

La página pública también registra herramientas WebMCP para el modo same-page:

```text
magic_picker_read
  → handle persistido en IndexedDB
  → ruta exacta relativa al directorio conectado
  → base64 + metadata
```

## Contrato de herramientas

### `magic_picker_read`

Recibe `path` exacto y opcionalmente `accept`, `multiple`, `prompt` y `maxSizeMB`. Devuelve contenido/metadata en modo gateway o base64 en modo FSA.

### `magic_picker_attach`

Recibe `path` exacto y opcionalmente `targetTabId`, `projectDir`, `inputSelector` y `autoAttach`. En el Chromium administrado por Codex usa el runtime CDP; con la extensión usa el gateway o el fallback FSA. El agente debe esperar éxito y continuar el click/upload en el tab indicado.

### `magic_picker_tabs`

Devuelve metadata mínima de las pestañas de la sesión activa: `tabId`, título, URL, estado y ventana. No lee contenido, cookies ni credenciales. Codex usa el `tabId` para elegir el destino.

### `magic_picker_activate`

Devuelve el estado de consentimiento, extensión y runtime Codex. El click visible del usuario es el que inicia la sesión; la tool no inventa consentimiento ni abre un picker.

## Decisiones

| Decisión | Motivo |
|---|---|
| El agente pasa el path exacto | La extensión no debe adivinar la intención del usuario. |
| `read` y `attach` son tools distintas | Leer contenido y preparar un upload son acciones diferentes. |
| Gateway primero, control page como fallback | El gateway resuelve rutas absolutas; FSA conserva la demo pública y el fallback binario. |
| Intercepción armada, no global | Un click normal del usuario debe seguir abriendo su picker. |
| `requestId` en todo el circuito | Evita mezclar requests entre tabs o inputs. |
| Sin picker implícito | Una llamada de agente no puede depender de user activation. |
| 25 MB de límite local | Evita mensajes gigantes y bloqueos accidentales. |
| Runtime CDP primero, extensión después | El modo Codex opera en la sesión embebida; la extensión cubre Chromium con MV3 permitido. |
| Acceso amplio pero temporal | El usuario consiente desde un botón; la extensión queda inerte y sin intercepción fuera del heartbeat de la control page. |
| Control page como log visual | El usuario puede ver cuándo la sesión está live, degraded u off y qué requests se resolvieron. |

## Runtime Codex embebido

`scripts/codex-magic-picker.cjs` es un adaptador local, no un instalador. Codex lo ejecuta como comando aprobado y le pasa el endpoint CDP del Chromium embebido:

```powershell
node scripts/codex-magic-picker.cjs --cdp-endpoint $env:CODEX_BROWSER_CDP_ENDPOINT
```

El proceso escucha solo en `127.0.0.1:8766`, mantiene el `sessionId` temporal, enumera targets de tipo página y prepara el input exacto mediante CDP. No lanza un Chrome/Edge externo, no modifica perfiles y no instala software. Si el host no ofrece un endpoint CDP, la ruta disponible es la extensión MV3 previamente cargada.

## Estructura relevante

```text
src/
├── main.tsx
├── App.tsx
├── styles.css
├── webmcp-types.ts
├── components/
│   ├── BridgeStatus.tsx
│   ├── ActivationPanel.tsx
│   ├── DirectorySetup.tsx
│   ├── ResolverLog.tsx
│   └── StatusBar.tsx
├── state/fileResolver.ts
├── state/activation.ts
└── webmcp/
    ├── codexRuntime.ts
    ├── extensionControlBridge.ts
    ├── fsa.d.ts
    ├── magicPickerTool.ts
    └── polyfill.ts

extension/
├── manifest.json
├── agent.js       # MAIN world: WebMCP tools
├── content.js     # aislado: relay + input handoff
└── background.js  # session + gateway + cross-tab router
```

```text
scripts/
└── codex-magic-picker.cjs  # runtime local CDP, sin navegador externo
```

## Estado de implementación

- ✅ WebMCP público con `magic_picker_read`, `magic_picker_activate`, `magic_picker_tabs` y `magic_picker_attach`.
- ✅ FSA + IndexedDB con permiso verificado sin prompt automático.
- ✅ Path relativo y absoluto cuando contiene el nombre del directorio conectado.
- ✅ Extensión MV3 con herramientas en páginas objetivo.
- ✅ Control page cross-tab con selección explícita de `targetTabId`.
- ✅ Runtime Codex CDP para la sesión embebida, con activación/deactivación y TTL.
- ✅ Router por tab/requestId y fallback a la control page.
- ✅ `magic_picker_attach` con `DataTransfer`, `input` y `change`.
- ✅ Clicks normales no preparados no son interceptados.
- ✅ Activación explícita con acceso amplio de navegador, TTL/heartbeat y cierre automático.
- ✅ La extensión queda dormida mientras no exista una sesión activa y limpia la cola al expirar.
- ✅ ZIP de extensión regenerable desde `extension/`.
- ✅ Build y syntax checks pasan.
- ✅ Self-test del runtime local y sintaxis del adaptador.
- ⚠️ La instancia concreta del navegador de Codex debe exponer `CODEX_BROWSER_CDP_ENDPOINT` para que el adaptador local pueda conectarse; el build no puede crear ese endpoint desde una página web.
- ℹ️ En modo extensión, el gateway `devin/filesystem.read_file` es la ruta preferida y FSA es el fallback; en modo Codex CDP el runtime lee el path local directamente.
- ⚠️ El MVP cubre HTML file inputs, no diálogos arbitrarios de SO, OAuth de Google ni terminales.

`I:\mcp-gateway-master` se tomó solo como referencia del contrato WebSocket/page-server; sus módulos generales no forman parte de MagicPicker.
