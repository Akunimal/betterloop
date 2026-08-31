# BetterLoop — neutral English voice-over

This is the exact narration track for the demo video. It is written for a neutral English voice, short sentences, and clean synchronization with the screen recording.

## Recording setup

- Target length: 90–110 seconds, depending on pauses and tool-call timing.
- Voice: neutral English, conversational but controlled; avoid an exaggerated commercial tone.
- Pace: 0.95–1.00x. Leave a short pause after each paragraph.
- Export: MP3 or WAV, 44.1 kHz if the tool offers it.
- Record the screen first, then adjust pauses or split the narration into the time blocks below.
- Keep the application audio low or muted. The optional BetterLoop alert should be audible only at the quota-recovery moment.

## Timed shot list and narration

| Time | Screen direction | Narration |
| --- | --- | --- |
| 0:00–0:09 | Show the BetterLoop page and the Codex browser context. | **“An agent can stop before the work is actually complete. A response may end while the task is unverified, blocked, or waiting for quota.”** |
| 0:09–0:16 | Point to the product name and the OFF state. | **“BetterLoop is a user-activated continuity layer for agentic work.”** |
| 0:16–0:25 | Press **Turn BetterLoop ON**. | **“Open the page in Codex’s built-in browser, and press Turn BetterLoop On. This visible click is the consent boundary.”** |
| 0:25–0:34 | Show the capability status and the four compact toggles. | **“BetterLoop registers its page tools and opens a short-lived host session. The user can see which capabilities are active.”** |
| 0:34–0:44 | Have the agent call `betterloop_start`; show **CODEX HOST RUN** and the event log. | **“The agent starts a run with the original request, saves a checkpoint, and records the next action in the visual log.”** |
| 0:44–0:53 | Show a failed evidence check. | **“If the evidence is not sufficient, BetterLoop keeps the task open instead of accepting a confident sentence.”** |
| 0:53–1:03 | Have the agent report quota; show the recovery state and optional sound. | **“If a usage limit pauses the work, BetterLoop records a recovery window and keeps the browser responsive.”** |
| 1:03–1:12 | Make the window available and resume from the checkpoint. | **“When work can resume, the agent continues from the last checkpoint.”** |
| 1:12–1:21 | Show the completion verification and the exact final question. | **“Before stopping, BetterLoop asks: Is the job one hundred percent done? Completion requires evidence for every important outcome.”** |
| 1:21–1:30 | Show the research-first state or the workaround requirement. | **“If research first is enabled, the agent investigates viable workarounds before declaring a real blocker.”** |
| 1:30–1:39 | Show the final timeline and **100% verified** state. | **“The log shows the phase, the decision, and the next action, so the entire loop is easy to follow.”** |
| 1:39–1:47 | End on the compact BetterLoop interface. | **“BetterLoop helps agents verify, recover, research, and keep going, while the user stays in control.”** |

## Copy-ready narration

Paste this block into the TTS tool. Keep the paragraph breaks: they make the edit points easier to find.

```text
An agent can stop before the work is actually complete. A response may end while the task is unverified, blocked, or waiting for quota.

BetterLoop is a user-activated continuity layer for agentic work.

Open the page in Codex’s built-in browser, and press Turn BetterLoop On. This visible click is the consent boundary.

BetterLoop registers its page tools and opens a short-lived host session. The user can see which capabilities are active.

The agent starts a run with the original request, saves a checkpoint, and records the next action in the visual log.

If the evidence is not sufficient, BetterLoop keeps the task open instead of accepting a confident sentence.

If a usage limit pauses the work, BetterLoop records a recovery window and keeps the browser responsive. When work can resume, the agent continues from the last checkpoint.

Before stopping, BetterLoop asks: Is the job one hundred percent done? Completion requires evidence for every important outcome.

If research first is enabled, the agent investigates viable workarounds before declaring a real blocker.

The log shows the phase, the decision, and the next action, so the entire loop is easy to follow.

BetterLoop helps agents verify, recover, research, and keep going, while the user stays in control.
```

## Free TTS route for this submission

### Recommended: TTSMaker

Use [TTSMaker](https://ttsmaker.com/), choose an English voice with a neutral delivery, paste the copy-ready narration, and download MP3 or WAV. Keep the paragraphs separate so the editor can align each block with the timeline. Its current site states that the free version supports downloads and free use of generated audio, with a weekly character quota; verify the displayed terms at export because service policies can change.

### Higher-polish alternative: ElevenLabs

[ElevenLabs](https://elevenlabs.io/pricing) has a free plan with monthly credits and usually produces a more polished narrator. Its current help policy says that free-plan published content requires attribution and does not include a commercial license. If it is used for this hackathon video, add an ElevenLabs credit and confirm that the submission is covered by the applicable non-commercial terms.

### No-account local fallback: Kokoro

[Kokoro](https://github.com/hexgrad/kokoro) can run locally and its model weights are Apache 2.0 licensed. It is a good ownership and privacy fallback, but installing the runtime and voice dependencies on Windows takes more time than the online route. Use it only if the online export is unavailable or if a fully local workflow is important.

### Editing checklist

1. Generate the narration with TTSMaker first; do not spend the recording deadline tuning voices.
2. Put each paragraph on its own audio segment if the generated full track does not match the shot timing.
3. Align the first word of each segment with the time block above, then trim silence rather than speeding the voice aggressively.
4. Add a quiet, original or properly licensed background bed only after the narration is clear.
5. If an external TTS service is used, list it in the video description or credits according to its current terms.
