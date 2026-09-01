# BetterLoop Demo Recording Runbook

## Execution contract

Execute this file as a recording task. Do not research, browse the web, search for recording tools, inspect whether Codex has a video API, invoke Graphify, change OBS settings, open a terminal, or ask the user for a new plan. OBS is already configured and the red capture rectangle is the only recorded area.

Use a strict two-channel workflow. Use the already-open in-app browser control for every BetterLoop interaction. Use Computer Use only for the prepared OBS window and only to press the user-configured `Shift+G` recording hotkey at the beginning and end. Do not use Computer Use on the Codex/ChatGPT desktop window, the embedded browser, terminals, settings, or any other app. Do not research, browse the web, invoke Graphify, or inspect whether Codex has a video API. Keep every visible message in this conversation concise, neutral English. Do not expose private chats, account information, unrelated tabs, settings, terminals, credentials, or local file paths.

The user has prepared OBS. If recording is stopped, use Computer Use to target the already-open OBS window and press `Shift+G` once to start it. Do not open OBS or its settings. Press `Shift+G` once at the end to stop recording.

## Starting state

1. Work in the already-open Codex embedded browser tab at `https://betterloop-akunimal.vercel.app/`.
2. Ensure the BetterLoop page is visible inside the capture rectangle.
3. Begin with `Turn BetterLoop ON` available and no active run. If the page is already ON or has an old run, turn it OFF and use `Clear log` before starting the recording.
4. Do not type into the Codex conversation after the recording starts unless a short English status is required. The screen recording must show the product, not a planning discussion.

## Recording sequence

Perform the following actions in order. After each action, pause long enough for the state named in bold to be readable. Never click repeatedly while waiting.

1. Use Computer Use only on the already-open OBS window. Press `Shift+G` once if recording is not already active. Do not perform any other OBS action. Show the clean BetterLoop page in its OFF state for about 10 seconds.
2. Click `Turn BetterLoop ON` once. Wait for `Tools registered` and then `READY: Codex received BetterLoop tools.` If the current Codex host can execute `betterloop_activation_check`, allow that check to run and show `READY: Codex verified BetterLoop tools.` If that command is unavailable, do not investigate or loop; keep the honest received-tools state and continue.
3. Leave the capability strip and the enabled controls visible for about 8 seconds. The key controls are `Auto-continue`, `Ask “100% done?”`, `Quota recovery`, `Evidence check`, and `Research before blocking`.
4. Click `Start guided demo →` once. Scroll down until `LIVE RUN` and `OBSERVABILITY` are readable. Hold on the running state and the first checkpoint.
5. Click `Needs more work` once. Hold on the failed verification and the continuation instruction.
6. Click `Simulate quota` once. Hold on `Waiting for quota` and the visible five-hour recovery countdown.
7. Click `Quota available` once. Hold on `Resuming`, the continuation event, and the browser alert tone.
8. Click `Mark 100% done →` once. Hold on `100% verified`, `1/1 checks passed`, and the evidence line.
9. Scroll to the bottom of the page so the complete activity log is visible. Hold the final state for at least 5 seconds.
10. Use Computer Use only on the already-open OBS window. Press `Shift+G` once to stop OBS. Do not interact with any other Windows app.

## Timing target

The screen capture should be approximately 1:35–1:40. The English narration is 204 words and should be generated as separate TTS clips, aligned to these visual blocks:

| Time | Visual block |
| --- | --- |
| 0:00–0:11 | Problem and BetterLoop OFF |
| 0:11–0:16 | Product identity |
| 0:16–0:25 | ON click and activation status |
| 0:25–0:34 | Registered tools and controls |
| 0:34–0:43 | Start run and checkpoint |
| 0:43–0:52 | Incomplete evidence |
| 0:52–1:00 | Quota pause |
| 1:00–1:06 | Quota available and resume |
| 1:06–1:15 | 100% completion verification |
| 1:15–1:22 | Research-first capability |
| 1:22–1:31 | Activity log |
| 1:31–1:38 | Final verified state |

## Stop conditions

Stop only after the final `100% verified` state and the bottom activity log are visible. If an expected browser state is delayed, wait up to 4 seconds and inspect once; do not start a research detour. If the native Codex activation check is unavailable, the public guided flow is the intended functional fallback and must be recorded honestly.
