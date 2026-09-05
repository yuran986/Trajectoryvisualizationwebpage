[English](README.md) | [简体中文](README_zh-CN.md)

# RLM Trajectory Viewer

An interactive analysis tool developed for [Long-Horizon LLM Agent Post-Training for ARC-AGI-3](https://github.com/yuran986/arc-agi-3-agent-post-training). The viewer reconstructs long-horizon agent behavior from RLM execution logs and ARC-AGI-3 frame streams, aligning reasoning, code execution, actions, visual state, and timing for trajectory-level diagnosis.

## Overview

Aggregate reward curves cannot distinguish genuine task learning from repeated actions that exploit a shaping signal. This tool makes that distinction inspectable. It supports both live environment monitoring and offline analysis, and preserves the hierarchy from run metadata to completion, iteration, code block, action event, and post-action frame.

<p align="center">
  <img src="docs/images/viewer-demo.gif" alt="RLM Trajectory Viewer demo showing ARC-AGI-3 offline playback and action-level trace inspection" width="100%">
</p>

<p align="center"><em>Load paired logs, scrub through recorded environment states, switch to the associated RLM trace, and expand an iteration to inspect its executed actions.</em></p>

## Supported analyses

| Analysis question | Viewer evidence |
|---|---|
| Did reward correspond to task progress? | Environment state, `levels_completed`, action sequence, and frame transitions |
| Did the policy act or only reason? | Per-iteration executed-action count and completion step |
| What did one action change? | Action name/coordinates aligned with the post-action frame |
| Did the model use the observation correctly? | Model response, REPL code, stdout/stderr, and rendered transition in one iteration |
| Where did a long rollout fail? | Completion-grouped timeline, duration, final answer, and terminal state |
| Is the issue in one log stream? | Timestamp-based pairing of RLM and environment-frame JSONLs |

## Interface

<details>
<summary><strong>Live and offline frame playback</strong></summary>

<p align="center">
  <img src="docs/images/offline-playback.png" alt="ARC-AGI-3 live monitor and offline frame playback with a timeline slider" width="100%">
</p>

Live and recorded frames share the same rendering scale. The offline slider retrieves the state, action, coordinates, and level progress at any recorded step.

</details>

<details>
<summary><strong>Iteration and action-level inspection</strong></summary>

<p align="center">
  <img src="docs/images/action-level-inspection.png" alt="Expanded RLM iteration showing its action count, Action Frames, and renderer output" width="100%">
</p>

Iterations are collapsed by default and summarize completion step, executed actions, depth, status, and duration. Expanding an iteration reveals the model response, REPL code, individual Action Frames, output/error streams, recursive calls, and final answer.

</details>

## Installation

```bash
git clone https://github.com/yuran986/Trajectoryvisualizationwebpage.git
cd Trajectoryvisualizationwebpage
npm install
npm run dev
```

Open the local URL printed by Vite. To verify a production build:

```bash
npm run build
```

## Input data

The viewer consumes newline-delimited JSON, with one object per line. It recognizes two complementary streams:

| Stream | Record types | Required or commonly used fields |
|---|---|---|
| RLM execution | `metadata`, `iteration` | model/backend settings, prompt, response, `code_blocks`, execution results, completion/iteration IDs |
| ARC environment | `arg_agi_frame` | `timestamp`, `step`, `state`, `levels_completed`, `action`, `action_xy`, `frame` |

Frame payloads should contain a numeric color-index grid, typically `[1, height, width]`. The parser accepts several historical action-result layouts to preserve compatibility with earlier experiments.

### Loading modes

- **Upload Files:** parse one or more local `.jsonl` files entirely in the browser. The application does not upload them to a backend.
- **Load Project JSONLs:** load development fixtures from `jsonl/` through Vite's `import.meta.glob`. These files become build assets; do not place private or large experiment logs there for public deployment.
- **Live Monitor:** poll a latest-frame JSON snapshot once per second in the local development environment.

## Trace alignment

When an RLM log is selected, the viewer chooses the frame log with the nearest run timestamp. Within each code block, post-action frames are recovered in the following order:

1. structured `action_events` emitted by the current logger;
2. step IDs reported by renderer output, matched against the paired frame log;
3. action-result objects retained in REPL locals;
4. legacy `make_action(...)` payloads parsed from stdout/code as a fallback.

This precedence avoids double counting while retaining useful visualization for older logs. Per-iteration action summaries use the same structured events first, then renderer steps and static calls when necessary.

## Live-monitor integration

Live mode is currently a local research integration rather than a portable server API. To use it in another workspace, update:

- `LIVE_FEED_URL` in `src/app/App.tsx` to the generated snapshot;
- `server.fs.allow` in `vite.config.ts` when the snapshot is outside this repository.

The snapshot may be an `arg_agi_frame` record directly or an object containing that record under `record`. Offline upload is the portable path and requires no filesystem configuration.

## Repository structure

```text
.
├── docs/images/                    # README demo and interface figures
├── jsonl/                          # Local fixtures; ignored by Git
├── src/app/App.tsx                 # Pairing and live-monitor orchestration
├── src/app/components/
│   ├── ArgAgiFrameViewer.tsx       # Grid rendering and frame playback
│   ├── FileUpload.tsx              # JSONL ingestion and run selection
│   ├── MetadataView.tsx            # Run-level metadata
│   └── TrajectoryTimeline.tsx      # Iterations, actions, and REPL traces
└── vite.config.ts                  # Build and local filesystem configuration
```

## Limitations

- The schema adapters are intentionally tolerant but remain specialized for the accompanying RLM/ARC integration.
- Large full-frame histories can consume substantial build size and browser memory.
- The live feed depends on a locally configured path and the Vite development server.
- The tool audits trajectories; it does not edit logs, aggregate benchmark metrics, or replace a reproducible evaluation harness.

## Acknowledgments

The viewer was developed as the trajectory-analysis component of the ARC-AGI-3 agent post-training study. The initial interface was prototyped with [Figma Make](https://www.figma.com/design/cYp0fr79jqgMOx5XeJgYkk/Trajectory-Visualization-Web-Page). Third-party notices are recorded in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
