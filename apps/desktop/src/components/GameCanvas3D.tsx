import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { Game3DSpec } from '@promptplay/shared-types';
import {
  Game3D,
  OrbitControls,
} from '@promptplay/runtime-3d';

interface GameCanvas3DProps {
  gameSpec: Game3DSpec | null;
  isPlaying: boolean;
  selectedEntities: Set<string>;
  onEntitySelect: (name: string | null, options?: { ctrlKey?: boolean }) => void;
  onEntityTransformChange?: (name: string, transform: { x: number; y: number; z: number }) => void;
  showGrid?: boolean;
  showAxes?: boolean;
}

export function GameCanvas3D({
  gameSpec,
  isPlaying,
  selectedEntities,
  onEntitySelect,
  onEntityTransformChange,
  showGrid = true,
  showAxes = true,
}: GameCanvas3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const game3DRef = useRef<Game3D | null>(null);
  const animationFrameRef = useRef<number>(0);
  const isPlayingRef = useRef(isPlaying);

  const [isDragging, setIsDragging] = useState(false);
  const [draggedEntity, setDraggedEntity] = useState<string | null>(null);

  // Selection visualization
  const selectionBoxesRef = useRef<Map<string, THREE.BoxHelper>>(new Map());

  // Keep isPlayingRef in sync
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // Initialize Game3D (which has its own renderer)
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // Create game instance (Game3D creates its own ThreeRenderer internally)
    const game = new Game3D({
      canvas: canvasRef.current,
      width,
      height,
    });
    game3DRef.current = game;

    // Get the renderer from the game instance
    const renderer = game.renderer;

    // Add grid helper
    if (showGrid) {
      renderer.addGridHelper(20, 20);
    }

    // Add axes helper
    if (showAxes) {
      renderer.addAxesHelper(5);
    }

    // Create orbit controls for editor using the game's camera
    const controls = new OrbitControls(renderer.camera, canvasRef.current);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // Animation loop - OrbitControls always update so camera can be rotated during play
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      // Always update controls for camera movement (works during play mode too)
      controls.update();

      // Only render in editor mode - Game3D handles its own rendering when playing
      if (!isPlayingRef.current) {
        renderer.render();
      }
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      controls.dispose();
      game.dispose();
    };
  }, [showGrid, showAxes]);

  // Handle play/stop state changes
  useEffect(() => {
    const game = game3DRef.current;
    if (!game || !gameSpec) return;

    if (isPlaying) {
      // Load the spec and start the game loop
      game.loadSpec(gameSpec);
      game.start();
    } else {
      // Stop the game loop
      game.stop();
    }
  }, [isPlaying, gameSpec]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current || !game3DRef.current || !controlsRef.current) return;

      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;

      game3DRef.current.resize(width, height);
      controlsRef.current.updateAspect(width, height);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => resizeObserver.disconnect();
  }, []);

  // Load game spec for editor preview (when not playing)
  useEffect(() => {
    if (!gameSpec || !game3DRef.current) return;

    const renderer = game3DRef.current.renderer;

    // When playing, Game3D handles all rendering - don't create preview meshes
    if (isPlaying) {
      return;
    }

    // Clear existing preview meshes before creating new ones
    renderer.clearAllMeshes();

    // Create meshes for each entity (editor preview only)
    gameSpec.entities.forEach((entity, index) => {
      if (entity.components.transform3d && entity.components.mesh) {
        const t = entity.components.transform3d;
        const m = entity.components.mesh;
        const mat = entity.components.material;

        renderer.createMesh(
          index,
          m.geometry,
          {
            width: m.width,
            height: m.height,
            depth: m.depth,
            radius: m.radius,
          },
          mat ? {
            color: mat.color,
            metallic: mat.metallic,
            roughness: mat.roughness,
          } : undefined,
          {
            castShadow: m.castShadow ?? true,
            receiveShadow: m.receiveShadow ?? true,
          }
        );

        renderer.updateMeshTransform(
          index,
          { x: t.x, y: t.y, z: t.z },
          { x: t.rotationX ?? 0, y: t.rotationY ?? 0, z: t.rotationZ ?? 0 },
          { x: t.scaleX ?? 1, y: t.scaleY ?? 1, z: t.scaleZ ?? 1 }
        );
      }
    });
  }, [gameSpec, isPlaying]);

  // Update selection visualization
  useEffect(() => {
    if (!game3DRef.current || !gameSpec) return;

    const renderer = game3DRef.current.renderer;

    // Remove old selection boxes
    selectionBoxesRef.current.forEach((box) => {
      renderer.scene.remove(box);
      box.dispose();
    });
    selectionBoxesRef.current.clear();

    // Add selection boxes for selected entities
    selectedEntities.forEach((entityName) => {
      const entityIndex = gameSpec.entities.findIndex((e) => e.name === entityName);
      if (entityIndex >= 0) {
        const mesh = renderer.getMesh(entityIndex);
        if (mesh) {
          const boxHelper = new THREE.BoxHelper(mesh, 0x00ff00);
          renderer.scene.add(boxHelper);
          selectionBoxesRef.current.set(entityName, boxHelper);
        }
      }
    });
  }, [selectedEntities, gameSpec]);

  // Handle click to select entity
  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!game3DRef.current || !gameSpec || isDragging) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      // Raycast to find clicked entity
      const renderer = game3DRef.current.renderer;
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(x, y), renderer.camera);

      const meshes: THREE.Object3D[] = [];
      gameSpec.entities.forEach((_, index) => {
        const mesh = renderer.getMesh(index);
        if (mesh) meshes.push(mesh);
      });

      const intersects = raycaster.intersectObjects(meshes, true);

      if (intersects.length > 0) {
        // Find entity by userData
        const intersected = intersects[0].object;
        let entityId = intersected.userData?.entityId;

        // Check parent if not found
        if (entityId === undefined && intersected.parent) {
          entityId = intersected.parent.userData?.entityId;
        }

        if (entityId !== undefined && gameSpec.entities[entityId]) {
          onEntitySelect(gameSpec.entities[entityId].name, { ctrlKey: event.ctrlKey });
        }
      } else {
        // Click on empty space - deselect
        if (!event.ctrlKey) {
          onEntitySelect(null);
        }
      }
    },
    [gameSpec, isDragging, onEntitySelect]
  );

  // Handle mouse down for dragging
  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (event.button !== 0 || !selectedEntities.size) return;

      // Check if clicking on selected entity
      // For now, simplified - just track drag state
      setIsDragging(false);
    },
    [selectedEntities]
  );

  // Handle mouse move for dragging
  const handleMouseMove = useCallback(
    (_event: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging || !draggedEntity || !onEntityTransformChange) return;

      // Transform dragging would go here
      // This requires more complex 3D position calculation
    },
    [isDragging, draggedEntity, onEntityTransformChange]
  );

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggedEntity(null);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-gray-900 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className="w-full h-full"
      />

      {/* Toolbar overlay */}
      <div className="absolute top-2 left-2 flex gap-1 bg-panel/80 backdrop-blur-sm rounded-lg p-1">
        <button
          className="p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Move Tool (W)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
        <button
          className="p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Rotate Tool (E)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
        <button
          className="p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Scale Tool (R)"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>

        <div className="w-px bg-subtle mx-1" />

        <button
          className="p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Focus on selection (F)"
          onClick={() => {
            // Focus camera on selected entity
            if (selectedEntities.size > 0 && controlsRef.current && gameSpec) {
              const entityName = Array.from(selectedEntities)[0];
              const entity = gameSpec.entities.find((e) => e.name === entityName);
              if (entity?.components.transform3d) {
                const t = entity.components.transform3d;
                controlsRef.current.focusOn(new THREE.Vector3(t.x, t.y, t.z), 10);
              }
            }
          }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <button
          className="p-2 text-text-secondary hover:text-white hover:bg-white/10 rounded transition-colors"
          title="Reset View"
          onClick={() => controlsRef.current?.reset()}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
        </button>
      </div>

      {/* Camera info overlay */}
      <div className="absolute bottom-2 left-2 text-xs text-text-tertiary bg-panel/60 px-2 py-1 rounded">
        3D View • Left-click: Select • Right-click: Pan • Scroll: Zoom
      </div>

      {/* Playing indicator */}
      {isPlaying && (
        <div className="absolute top-2 right-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
          Playing
        </div>
      )}
    </div>
  );
}

export default GameCanvas3D;
