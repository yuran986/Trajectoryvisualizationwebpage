# Trajectory Visualization Web Page

This is a code bundle for Trajectory Visualization Web Page. The original project is available at https://www.figma.com/design/cYp0fr79jqgMOx5XeJgYkk/Trajectory-Visualization-Web-Page.

## Running the code

Run `npm i` to install the dependencies.

Run `npm run dev` to start the development server.

## ARG-AGI visualization

The app now supports two simple ARG-AGI paths:

1. Realtime monitor
- While `rlm/arg-agi/run_arg_agi_rlm.py` is running, it writes:
  - `jsonl/arg_agi_live_latest.json` (latest frame snapshot)
- The web page polls this file and shows it in **ARG-AGI Live Monitor**.

2. Offline playback
- Each run also writes:
  - `jsonl/arg_agi_frames_<run_id>.jsonl` (full frame trajectory)
- Upload this file in the UI to scrub through all recorded frames.
