# AI-Friendly Game Engine MVP Plan  
## Prompt-to-Playable 2D/3D Games with Built-In TRELLIS.2 3D Asset Generation  
**Date:** December 30, 2025  
**Goal:** Build a web-first, modular, ECS-based game engine where users create playable games (2D, 3D, FPS/TPS) via natural language prompts. Include self-hosted TRELLIS.2 for native text/image/sketch-to-3D asset generation.  
**Developer:** Solo (you)  
**Target MVP Timeline:** 8–10 weeks  

---

### Project Vision
Create an innovative “prompt-to-game” platform:
- User types: “platformer with jumping fox chasing apples” or “FPS with cyberpunk gun in neon city”
- Engine generates ECS JSON spec + optional 3D assets via TRELLIS.2
- Instant playable scene runs in the browser
- Editor UI allows tweaking, saving, and exporting

No external 3D generation APIs — everything self-hosted with TRELLIS.2 (Microsoft’s SOTA open-source 3D model, MIT license).

---

### Core Architecture (Layered ECS)

1. **AI Layer**  
   - Claude/Cursor API → structured ECS JSON specs  
   - TRELLIS.2 pipeline (text → image → 3D or direct image/sketch → 3D)

2. **ECS Core**  
   - Library: `bitecs.ts` (TypeScript-native, archetype-based)  
   - Components: Position, Velocity, Mesh (Three.js object), Collider, Camera (FPS/TPS), etc.  
   - Systems: Physics, Input, Render, AIBehavior

3. **Render Layer**  
   - 2D: PixiJS (sprites, animations)  
   - 3D: Three.js + WebGPU (PBR support for TRELLIS.2 textures)

4. **Platform Layer**  
   - Web-first (browser events, Canvas/WebGPU)  
   - Later: Electron (desktop), Capacitor (mobile)

5. **Editor/Tools Layer**  
   - Next.js dashboard (prompt input, spec editor, 3D preview, asset generator)

6. **Inference Backend**  
   - Python server (FastAPI/Gradio) running TRELLIS.2 on dedicated GPU

---

### Tech Stack

| Layer              | Technology                                                                 |
|--------------------|----------------------------------------------------------------------------|
| Frontend/Engine    | TypeScript, Next.js, Three.js, PixiJS, bitecs.ts                           |
| Physics            | Matter.js (2D), Cannon.js (3D)                                             |
| AI Specs           | Claude API (via Node.js)                                                   |
| 3D Generation      | TRELLIS.2 (PyTorch), optional Flux/SD3 for text-to-image chaining          |
| Backend (Inference)| Python 3.10, FastAPI/Gradio, Docker                                        |
| GPU Hosting        | RunPod / Vast.ai / local RTX 4090+ (24GB VRAM required)                    |
| Deployment         | Vercel (web UI), Docker (inference server)                                 |

---

### MVP Scope & Success Criteria

- Web-based prototype (browser only)
- Prompt → JSON spec → playable 2D or simple 3D scene
- Built-in TRELLIS.2 generation: text, image upload, or sketch → game-ready GLB (PBR)
- Test with 3 genres: platformer, shooter, puzzle (one with custom TRELLIS.2 asset)
- FPS/TPS camera stubs included
- Editor UI with localStorage saves and embed/export links

---

### Development Roadmap (8–10 Weeks)

| Phase | Focus                              | Weeks | Key Deliverables                                                                                  | Main Tech Additions                          |
|-------|------------------------------------|-------|---------------------------------------------------------------------------------------------------|----------------------------------------------|
| 1     | Core ECS & 2D Runtime              | 1–3   | Playable 2D prototypes from prompts (e.g., platformer, shooter, puzzle)                           | bitecs.ts, PixiJS, Matter.js, Claude API     |
| 2     | Editor UI & Basic 3D Rendering     | 3–5   | Next.js dashboard, spec tweaking, 3D preview canvas, manual GLB loading                           | Next.js, Three.js, GLTFLoader                |
| 3     | TRELLIS.2 Integration              | 5–7   | Self-hosted 3D generation UI: text/image/sketch → GLB → auto-add to ECS scene                     | Python FastAPI, TRELLIS.2 pipeline, Docker   |
| 4     | Polish & Cross-Platform Stubs      | 7–9   | Full prompt-to-3D-game flow, FPS/TPS demos, performance tweaks, mobile preview                    | WebGPU, Capacitor stub, LOD/Draco compression|
| 5     | Final MVP & Iteration              | 9–10  | Deployable demo, user testing, documentation                                                      | Vercel + Docker deploy                       |

---

### TRELLIS.2 Integration Details

#### Requirements
- NVIDIA GPU with ≥24GB VRAM (RTX 4090, A100, H100)
- CUDA 12.x (or 11.8 for compatibility)
- Python 3.10 Conda environment

#### Setup Steps (Phase 3)
1. Rent/deploy GPU instance (RunPod recommended)
2. `git clone https://github.com/microsoft/TRELLIS.2`
3. Create Conda env + install requirements (spconv, nvdiffrast, kaolin, etc.)
4. Download model: `huggingface-cli download microsoft/TRELLIS.2-4B`
5. Build FastAPI server with endpoints:
   - `/image-to-3d` (POST image file → GLB)
   - `/text-to-3d` (optional: chain with Flux/SD3 → TRELLIS.2)
6. Dockerize for reliable deployment
7. Enable memory optimizations:
   ```bash
   export PYTORCH_CUDA_ALLOC_CONF="expandable_segments:True"
   export SPCONV_ALGO="native"