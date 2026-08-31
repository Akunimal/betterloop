# MagicPicker — Estado actual

Última actualización: 2026-08-31

## Objetivo

Dar a un agente de navegador una capacidad explícita para resolver el archivo exacto que el usuario pidió y, en Chromium local con la extensión cargada, entregarlo a un `<input type="file">` de otra pestaña sin abrir el diálogo nativo.

## Arquitectura vigente

```text
Usuario pulsa Activate MagicPicker en la control page
  → sesión temporal en memoria + heartbeat
  → extensión dormida fuera de una sesión activa
  → WebMCP en pestaña objetivo
  → extension/agent.js (MAIN world)
  → extension/content.js (aislado, postMessage + tab routing)
  → extension/background.js (requestId, gateway, control tab)
  → devin/filesystem.read_file por WebSocket
       o MagicPicker control page + File System Access API
  → bytes vuelven a la pestaña objetivo
  → solo el click preparado del input es cancelado
```

La sesión no se persiste: termina con Deactivate, al cerrar/navegar la control page o cuando vence el heartbeat. Al terminar, el service worker limpia las colas y cada listener de input vuelve a dejar pasar el comportamiento nativo.

La página pública también registra herramientas WebMCP para el modo same-page:

```text
magic_picker_read / magic_picker
  → handle persistido en IndexedDB
  → ruta exacta relativa al directorio conectado
  → base64 + metadata
```

## Contrato de herramientas

### `magic_picker_read`

Recibe `path` exacto y opcionalmente `accept`, `multiple`, `prompt` y `maxSizeMB`. Devuelve contenido/metadata en modo gateway o base64 en modo FSA.

### `magic_picker_attach`

Solo disponible en la extensión local. Recibe `path` exacto y opcionalmente `projectDir`, `inputSelector` y `autoAttach`. Resuelve el archivo y lo encola en la pestaña desde la que salió la llamada. El agente debe esperar éxito y hacer click en el input.

### `magic_picker_activate`

Tool de observabilidad. Devuelve el estado de la sesión temporal, pero no puede activar permisos por sí sola: la activación requiere el click visible del usuario.

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
| CDP como diagnóstico/bootstrap | La extensión/WebSocket es el transporte de datos más estable. |
| Acceso amplio pero temporal | El usuario consiente desde un botón; la extensión queda inerte y sin intercepción fuera del heartbeat de la control page. |
| Control page como log visual | El usuario puede ver cuándo la sesión está live, degraded u off y qué requests se resolvieron. |

## Integración futura estudiada

Se estudió una integración on-demand mediante launcher local, CDP o mecanismo administrado de Chromium: después del click explícito del usuario, Codex podría iniciar una instancia con la extensión cargada y mantenerla solo durante la sesión. Es técnicamente viable como siguiente fase, pero no está implementada en esta entrega; la página web por sí sola no puede instalarla dentro del Chromium embebido.

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
    ├── extensionControlBridge.ts
    ├── fsa.d.ts
    ├── magicPickerTool.ts
    └── polyfill.ts

extension/
├── manifest.json
├── agent.js       # MAIN world: WebMCP tools
├── content.js     # aislado: relay + input handoff
└── background.js  # gateway + control-tab router
```

## Estado de implementación

- ✅ WebMCP público con `magic_picker_read` y alias `magic_picker`.
- ✅ FSA + IndexedDB con permiso verificado sin prompt automático.
- ✅ Path relativo y absoluto cuando contiene el nombre del directorio conectado.
- ✅ Extensión MV3 con herramientas en páginas objetivo.
- ✅ Router por tab/requestId y fallback a la control page.
- ✅ `magic_picker_attach` con `DataTransfer`, `input` y `change`.
- ✅ Clicks normales no preparados no son interceptados.
- ✅ Activación explícita con acceso amplio de navegador, TTL/heartbeat y cierre automático.
- ✅ La extensión queda dormida mientras no exista una sesión activa y limpia la cola al expirar.
- ✅ ZIP de extensión regenerable desde `extension/`.
- ✅ Build y syntax checks pasan.
- ⚠️ La integración on-demand de la extensión con el Chromium embebido fue estudiada como posible siguiente fase, pero aún no está implementada.
- ⚠️ Falta validar el flujo real dentro de la instancia Chromium/Codex final.
- ⚠️ El gateway debe tener un `devin/filesystem.read_file` que pueda leer la ruta.
- ⚠️ El MVP cubre HTML file inputs, no diálogos arbitrarios de SO, OAuth de Google ni terminales.
