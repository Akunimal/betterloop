# MagicPicker — Puente local y límites

## Alcance real

MagicPicker resuelve un handoff de archivos para agentes WebMCP. La app pública registra tools para leer archivos y observar una sesión temporal autorizada. La extensión local añade routing entre pestañas y preparación de uploads.

## Matriz de soporte

| Escenario | Estado | Mecanismo |
|---|---:|---|
| Leer archivo en la página pública | ✅ | WebMCP + File System Access API |
| Ruta relativa o absoluta exacta | ✅ | `path` explícito; no se adivina |
| Leer por gateway local | ✅* | `devin/filesystem.read_file` por WebSocket |
| Preparar upload en otra pestaña | ✅* | `magic_picker_attach` + extensión MV3 |
| Click normal del usuario | ✅ | Pasa al comportamiento nativo |
| Sesión temporal con un click | ✅ | `Activate MagicPicker` + heartbeat |
| Diálogo nativo ya abierto | ❌ | Debe prepararse antes del click |
| Google OAuth popup | ❌ MVP | Es un flujo de autenticación, no un HTML file input |
| Prompt de terminal/gcloud | ❌ MVP | Requiere integración de terminal separada |
| Página `chrome://` o diálogo del SO | ❌ | Fuera del alcance de content scripts |

`*` Requiere Chromium con la extensión cargada y, para la ruta preferida, el gateway local funcionando. El fallback binario usa la control page abierta y autorizada.

## Flujo cross-tab

```text
1. Cargar la extensión al iniciar Chromium con --load-extension.
2. Abrir MagicPicker en esa misma instancia.
3. Pulsar **Activate MagicPicker — full browser access**.
4. Abrir la página que contiene el upload.
5. Codex llama `magic_picker_attach({ path: exactPath })`.
6. La extensión resuelve por gateway o control page y encola bytes en esa tab.
7. Codex hace click en el input de archivo.
8. El listener captura solo ese click preparado, asigna File con DataTransfer y dispara input/change.

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

Cada request usa un `requestId`. La extensión no lee la IndexedDB de la webapp: los orígenes son distintos y compartir el nombre de la base no comparte handles. La control page es el único lugar que usa el `FileSystemDirectoryHandle`.

## Instalación

No existe instalación silenciosa dentro de un navegador ya abierto. El usuario/launcher debe cargar la extensión:

```text
--load-extension=C:\path\to\magicpicker-extension
```

También puede extraerse `public/extension.zip` y cargarse como unpacked desde el modo developer. CDP puede inspeccionar tabs y el service worker, pero no reemplaza el permiso del usuario ni la carga de la extensión.

### Integración on-demand estudiada

Investigamos un launcher local o integración administrada con Chromium/CDP que reciba el consentimiento de **Activate MagicPicker**, cargue la extensión en una instancia controlada y la mantenga durante esa sesión. El enfoque es viable como siguiente fase y encaja con el modelo de Codex, pero todavía no está implementado en el build entregado. La página pública no puede hacer esa instalación por sí sola.

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
