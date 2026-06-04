# Tutorial Video Capsule Generator Skill

This skill automates the generation of video tutorial capsules for the Abastible AI platform. It uses a browser automation engine to execute the walkthroughs defined in `tutorials.json` and records the session into `.webm` files.

## Workflow

1.  **Analyze Manifest**: Read `front/src/data/tutorials.json` to identify available tutorials and their steps.
2.  **Environment Setup**: Ensure the local dev server is running (usually `npm run dev` at port 5173).
3.  **Execute & Record**:
    *   For each tutorial, use a browser automation tool (like `browser_subagent`) to visit the `startUrl`.
    *   Perform a login if necessary.
    *   Iterate through the `steps` defined in the manifest.
    *   Wait for the UI to respond to each interaction.
4.  **Export & Link**:
    *   Save the recording to `front/public/videos/<tutorial-id>.webm`.
    *   Update the `tutorials.json` (or a dedicated meta file) to include the `videoUrl` reference.

## Technical Details

- **Input**: `front/src/data/tutorials.json`
- **Output Directory**: `front/public/videos/`
- **Recording Format**: WEBM (Optimized for web playback).
- **Resolution**: 1280x720 (Standard HD).

## Usage via Antigravity

When asked to "generate video tutorials", the agent will:
1.  Verify the frontend is running.
2.  Identify a valid user for the role specified in the tutorial.
3.  Invoke the browser subagent with the specific task of recording the walkthrough.
4.  Verify the file existence in the public directory.
