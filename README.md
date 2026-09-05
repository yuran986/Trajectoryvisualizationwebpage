[English](README.md) | [简体中文](README_zh-CN.md)

# RLM Trajectory Viewer

An interactive web interface for inspecting Recursive Language Model (RLM) execution traces alongside ARC-AGI-3 environment frames. It was developed to diagnose long-horizon agent behavior by aligning model responses, REPL execution, actions, visual states, and timing in one place.

<p align="center">
  <img src="https://raw.githubusercontent.com/yuran986/arc-agi-3-agent-post-training/main/fig/rlm-trajectory-viewer.png" alt="RLM Trajectory Viewer displaying an ARC-AGI-3 frame and its execution trace" width="100%">
</p>

## Features

- **RLM trace inspection:** browse run metadata, queries, system prompts, model responses, REPL code, stdout/stderr, nested model calls, and execution time.
- **ARC-AGI-3 frame playback:** render color-grid observations with step, action, coordinates, game state, and completed-level metadata.
- **Action-to-frame alignment:** associate RLM iterations and action events with the corresponding environment frames.
- **Long-trajectory navigation:** group records by completion and iteration, collapse verbose sections, and move through frame sequences.
- **Multiple input modes:** drag and drop local JSONL files, load JSONLs bundled with the project, or monitor a locally generated live snapshot.
- **Local file handling:** uploaded trajectories are parsed in the browser and are not sent to a backend by this application.

## Quick start

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. For a production build:

```bash
npm run build
```

## Loading trajectories

### Upload local files

Click **Upload Files** or drag one or more `.jsonl` files into the upload area. Loading both an RLM trace and its ARC frame log enables synchronized inspection. When several frame logs are present, the viewer pairs the closest run using timestamps and then aligns frames with trajectory actions.

### Load project JSONLs

Place development fixtures in `jsonl/`, restart the Vite server if necessary, and click **Load Project JSONLs**. These files are discovered through `import.meta.glob` and become build assets, so private or large experiment logs should not be committed or included in a public deployment.

## Supported records

The viewer is tailored to the JSONL output of the accompanying RLM and ARC-AGI-3 integration. It recognizes two main streams:

| Stream | Record types | Important fields |
|---|---|---|
| RLM execution log | `metadata`, `iteration` | model/backend settings, prompt, response, `code_blocks`, execution results, completion/iteration IDs |
| ARC frame log | `arg_agi_frame` | `timestamp`, `step`, `state`, `levels_completed`, `action`, `action_xy`, `frame` |

Each line must contain one valid JSON object. Frame payloads are expected to contain a color-index grid, commonly shaped as `[1, height, width]`.

## Live monitoring

The page polls a latest-frame JSON snapshot once per second and displays it in the live monitor. This mode is currently configured for the local ARC-AGI-3 research workspace rather than as a portable server API.

To use it in another workspace, update:

- `LIVE_FEED_URL` in `src/app/App.tsx` to point to the generated snapshot;
- `server.fs.allow` in `vite.config.ts` if the snapshot is outside this repository.

The expected payload is either an `arg_agi_frame` record or an object whose `record` field contains one. Offline upload remains the simplest portable mode.

## Project structure

```text
.
├── jsonl/                         # Local development trajectories (ignored by Git)
├── src/app/App.tsx                # File pairing and live-monitor orchestration
├── src/app/components/
│   ├── ArgAgiFrameViewer.tsx      # ARC frame rendering and playback
│   ├── FileUpload.tsx             # JSONL loading and run selection
│   ├── MetadataView.tsx           # Run-level metadata
│   └── TrajectoryTimeline.tsx     # RLM iterations, actions, and REPL details
└── vite.config.ts                 # Vite and local-file access configuration
```

## Limitations

- Parsing is schema-tolerant but still specialized for the current RLM/ARC logging format.
- Live monitoring depends on a locally configured file path and the Vite development server.
- Full frame histories can create very large JSONL files and browser memory usage.
- This is a research debugging tool; it does not edit trajectories or calculate benchmark metrics.

## Related project

The viewer accompanies [Long-Horizon LLM Agent Post-Training for ARC-AGI-3](https://github.com/yuran986/arc-agi-3-agent-post-training).

The initial interface was prototyped with [Figma Make](https://www.figma.com/design/cYp0fr79jqgMOx5XeJgYkk/Trajectory-Visualization-Web-Page). Third-party notices are listed in [ATTRIBUTIONS.md](ATTRIBUTIONS.md).
