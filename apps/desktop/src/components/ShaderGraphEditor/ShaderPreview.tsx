// Shader Preview - Real-time 3D preview of compiled shaders

import { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import type { CompiledShader } from '../../types/ShaderGraph';

interface ShaderPreviewProps {
  shader: CompiledShader | null;
  error: string | null;
}

type PreviewMesh = 'sphere' | 'cube' | 'plane' | 'torus' | 'cylinder';

export default function ShaderPreview({ shader, error }: ShaderPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animationRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  const [previewMesh, setPreviewMesh] = useState<PreviewMesh>('sphere');
  const [autoRotate, setAutoRotate] = useState(true);
  const [showCode, setShowCode] = useState(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a12, 1);
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.z = 3;
    cameraRef.current = camera;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // Create/update geometry based on preview mesh type
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    // Remove old mesh
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
    }

    // Create new geometry
    let geometry: THREE.BufferGeometry;
    switch (previewMesh) {
      case 'sphere':
        geometry = new THREE.SphereGeometry(1, 64, 64);
        break;
      case 'cube':
        geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        break;
      case 'plane':
        geometry = new THREE.PlaneGeometry(2, 2);
        break;
      case 'torus':
        geometry = new THREE.TorusGeometry(0.8, 0.3, 32, 64);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(0.7, 0.7, 1.5, 64);
        break;
      default:
        geometry = new THREE.SphereGeometry(1, 64, 64);
    }

    // Create material
    const material = materialRef.current || new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: new THREE.Vector2(1920, 1080) },
        uTexture: { value: null },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        void main() {
          vUv = uv;
          vPosition = position;
          vNormal = normalize(normalMatrix * normal);
          vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        varying vec3 vNormal;
        void main() {
          gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0);
        }
      `,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;
    materialRef.current = material;
  }, [previewMesh]);

  // Update shader when it changes
  useEffect(() => {
    if (!materialRef.current || !shader) return;

    try {
      materialRef.current.vertexShader = shader.vertexShader;
      materialRef.current.fragmentShader = shader.fragmentShader;
      materialRef.current.needsUpdate = true;
    } catch (e) {
      console.error('Shader update error:', e);
    }
  }, [shader]);

  // Animation loop
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      const elapsed = clockRef.current.getElapsedTime();

      // Update uniforms
      if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = elapsed;
      }

      // Auto rotate
      if (meshRef.current && autoRotate) {
        meshRef.current.rotation.y = elapsed * 0.5;
        meshRef.current.rotation.x = Math.sin(elapsed * 0.3) * 0.2;
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [autoRotate]);

  const meshOptions: { value: PreviewMesh; label: string; icon: string }[] = [
    { value: 'sphere', label: 'Sphere', icon: '⬤' },
    { value: 'cube', label: 'Cube', icon: '◼' },
    { value: 'plane', label: 'Plane', icon: '▬' },
    { value: 'torus', label: 'Torus', icon: '◯' },
    { value: 'cylinder', label: 'Cylinder', icon: '▮' },
  ];

  return (
    <div className="h-full flex flex-col">
      {/* Preview Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a28] border-b border-[#3f3f5a]">
        <span className="text-sm font-medium text-gray-300">Preview</span>
        <div className="flex items-center gap-1">
          {/* Mesh selector */}
          {meshOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setPreviewMesh(opt.value)}
              className={`p-1.5 rounded text-sm ${
                previewMesh === opt.value
                  ? 'bg-purple-600/30 text-purple-300'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              title={opt.label}
            >
              {opt.icon}
            </button>
          ))}
          <div className="w-px h-4 bg-[#3f3f5a] mx-1" />
          {/* Auto rotate */}
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            className={`p-1.5 rounded ${
              autoRotate
                ? 'bg-purple-600/30 text-purple-300'
                : 'text-gray-500 hover:text-gray-300'
            }`}
            title="Auto Rotate"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {/* Preview Canvas */}
      <div ref={containerRef} className="flex-1 relative">
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/10">
            <div className="text-center px-4">
              <div className="text-red-400 text-sm font-medium mb-1">Shader Error</div>
              <div className="text-red-300/70 text-xs max-w-xs">{error}</div>
            </div>
          </div>
        )}
      </div>

      {/* Code Toggle */}
      <div className="border-t border-[#3f3f5a]">
        <button
          onClick={() => setShowCode(!showCode)}
          className="w-full px-3 py-2 text-xs text-gray-500 hover:text-gray-300 flex items-center justify-between"
        >
          <span>Generated GLSL</span>
          <svg
            className={`w-3 h-3 transition-transform ${showCode ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showCode && shader && (
          <div className="max-h-48 overflow-auto bg-[#0a0a12] border-t border-[#3f3f5a]">
            <div className="p-3">
              <div className="text-xs text-gray-500 mb-1">Fragment Shader:</div>
              <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap break-all">
                {shader.fragmentShader}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
