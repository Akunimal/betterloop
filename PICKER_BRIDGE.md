# MagicPicker — Puente local y límites

## Alcance real

MagicPicker resuelve un handoff de archivos para agentes WebMCP. La app pública registra tools para leer archivos y observar una sesión temporal autorizada. La extensión local añade routing entre pestañas y preparación de uploads.

## Matriz de soporte

| Escenario | Estado | Mecanismo |
|---|---:|---|
| Leer archivo en la página pública | ✅ | WebMCP + File System Access API |
| Ruta relativa o absoluta exacta | ✅ | `path` explícito; no se adivina |
| Leer por gateway local | ✅* | `devin/filesystem.read_file` por WebSocket |
| Preparar upload en otra pestaña | ✅ | `magic_picker_tabs` + `magic_picker_attach` |
| Preparar upload dentro del Chromium de Codex | ✅* | Runtime local CDP, sin navegador externo |
| Click normal del usuario | ✅ | Pasa al comportamiento nativo |
| Sesión temporal con un click | ✅ | `Activate MagicPicker` + heartbeat |
| Diálogo nativo ya abierto | ❌ | Debe prepararse antes del click |
| Google OAuth popup | ❌ MVP | Es un flujo de autenticación, no un HTML file input |
| Prompt de terminal/gcloud | ❌ MVP | Requiere integración de terminal separada |
| Página `chrome://` o diálogo del SO | ❌ | Fuera del alcance de content scripts |

`*` El runtime Codex requiere que el host exponga un endpoint CDP y que Codex haya aprobado el proceso local. La ruta de extensión requiere MV3 cargada y, para la ruta preferida, el gateway local funcionando.

## Flujo cross-tab

```text
1. Abrir MagicPicker en la sesión del navegador.
2. Pulsar **Activate MagicPicker — full browser access**.
3. Codex inicia el runtime local aprobado si la sesión embebida expone CDP.
4. Codex llama `magic_picker_tabs()` y elige un `targetTabId`.
5. Codex llama `magic_picker_attach({ path: exactPath, targetTabId })`.
6. El runtime CDP asigna el archivo al input, o la extensión lo encola para el click.
7. Codex continúa el flujo en la pestaña objetivo.

El directory picker es opcional en este modo si el gateway local puede leer la ruta. Solo hace falta para el fallback FSA de la control page.
```

Si el usuario hace un click sin una llamada `attach` pendiente, no hay cancelación ni re-click sintético: el picker normal permanece intacto.

## Mensajes

- `agent-request`: MAIN world → content → service worker.
- `call-tool`: service worker → gateway WebSocket.
- `control-ready`: MagicPicker page → service worker, registra la tab de fallback.
- `control-state` / `control-heartbeat` / `control-deactivate`: ciclo de vida de la sesión temporal.
- `session-state`: service worker → todas las tabs, activa o duerme los content scripts.
- `control-request` / `resolve-file-response`: service worker ↔ control page.
- `file-ready`: service worker → tab objetivo.
- `file-attached`: tab objetivo → service worker para diagnóstico.
- `bridge-request` / `bridge-response`: control page ↔ extensión para listar tabs y hacer handoff cross-tab.

Cada request usa un `requestId`. La extensión no lee la IndexedDB de la webapp: los orígenes son distintos y compartir el nombre de la base no comparte handles. La control page es el único lugar que usa el `FileSystemDirectoryHandle`.

## Instalación

No existe instalación silenciosa dentro de un navegador ya abierto. El usuario/launcher debe cargar la extensión:

```text
--load-extension=C:\path\to\magicpicker-extension
```

También puede extraerse `public/extension.zip` y cargarse como unpacked desde el modo developer. CDP puede inspeccionar tabs y el service worker, pero no reemplaza el permiso del usuario ni la carga de la extensión.

### Runtime Codex

El comando `scripts/codex-magic-picker.cjs` recibe el consentimiento de la control page mediante el `sessionId`, escucha en `127.0.0.1:8766` y usa CDP para operar el Chromium embebido. No intenta instalar la extensión en caliente ni abrir un navegador externo: si no existe un endpoint CDP, devuelve un estado no disponible y la app conserva la ruta MV3.

## Seguridad

- La ruta la decide el agente a partir del pedido del usuario.
- La página pública exige una acción visible para conceder el directorio.
- El acceso amplio de navegador se concede con un botón explícito y solo dura mientras la control page mantiene heartbeat.
- El gateway local solo se conecta durante una sesión activa; tener la extensión cargada no inicia el puente.
- Cerrar/navegar la control page o pulsar Deactivate limpia la cola y desactiva la intercepción.
- Esto no elimina las aprobaciones propias de Codex para comandos locales ni instala la extensión silenciosamente.
- La extensión limita los archivos transferidos a 25 MB.
- No se usa un servidor de terceros para transportar archivos.
- `<all_urls>` es necesario para llegar a páginas de upload; se debe usar un perfil local confiable.
