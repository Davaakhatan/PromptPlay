// ShaderEditor - Code-based shader editor with real-time preview
// Supports GLSL and WGSL with Monaco editor, error highlighting, and uniform controls

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import * as THREE from 'three';
import { shaderEditor, type ShaderUniform, type CustomShader, type ShaderTemplate } from '../services/ShaderEditor';

type ShaderLanguage = 'glsl' | 'wgsl';
type PreviewMesh = 'sphere' | 'cube' | 'plane' | 'torus' | 'cylinder';

interface ShaderError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning';
}

interface ShaderEditorProps {
  shaderId?: string;
  onShaderChange?: (shader: CustomShader) => void;
  onClose?: () => void;
}

// WGSL to GLSL basic structure template
const WGSL_VERTEX_TEMPLATE = `@group(0) @binding(0) var<uniform> uTime: f32;
@group(0) @binding(1) var<uniform> uResolution: vec2<f32>;

struct VertexInput {
  @location(0) position: vec3<f32>,
  @location(1) uv: vec2<f32>,
  @location(2) normal: vec3<f32>,
}

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
  @location(1) normal: vec3<f32>,
}

@vertex
fn main(input: VertexInput) -> VertexOutput {
  var output: VertexOutput;
  output.position = vec4<f32>(input.position, 1.0);
  output.uv = input.uv;
  output.normal = input.normal;
  return output;
}`;

const WGSL_FRAGMENT_TEMPLATE = `@group(0) @binding(0) var<uniform> uTime: f32;
@group(0) @binding(1) var<uniform> uColor: vec3<f32>;

struct FragmentInput {
  @location(0) uv: vec2<f32>,
  @location(1) normal: vec3<f32>,
}

@fragment
fn main(input: FragmentInput) -> @location(0) vec4<f32> {
  let color = uColor;
  return vec4<f32>(color, 1.0);
}`;

export default function ShaderEditor({ shaderId, onShaderChange, onClose }: ShaderEditorProps) {
  // Shader state
  const [shader, setShader] = useState<CustomShader | null>(null);
  const [language, setLanguage] = useState<ShaderLanguage>('glsl');
  const [activeTab, setActiveTab] = useState<'vertex' | 'fragment'>('fragment');
  const [vertexCode, setVertexCode] = useState('');
  const [fragmentCode, setFragmentCode] = useState('');
  const [uniforms, setUniforms] = useState<ShaderUniform[]>([]);
  const [errors, setErrors] = useState<ShaderError[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Preview state
  const [previewMesh, setPreviewMesh] = useState<PreviewMesh>('sphere');
  const [autoRotate, setAutoRotate] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [showUniforms, setShowUniforms] = useState(true);

  // Templates
  const [showTemplates, setShowTemplates] = useState(false);
  const templates = useMemo(() => shaderEditor.getTemplates(), []);

  // Monaco refs
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  // Three.js refs
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const animationRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());

  // Load shader on mount or ID change
  useEffect(() => {
    let loadedShader: CustomShader | undefined;

    if (shaderId) {
      loadedShader = shaderEditor.getShader(shaderId);
    }

    if (!loadedShader) {
      // Create default shader
      loadedShader = shaderEditor.createShader({
        name: 'New Shader',
        category: 'custom',
      });
    }

    setShader(loadedShader);
    setVertexCode(loadedShader.vertexShader);
    setFragmentCode(loadedShader.fragmentShader);
    setUniforms([...loadedShader.uniforms]);
    setIsDirty(false);
  }, [shaderId]);

  // Initialize Three.js preview
  useEffect(() => {
    if (!previewContainerRef.current || !showPreview) return;

    const container = previewContainerRef.current;
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
      if (!previewContainerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = previewContainerRef.current.clientWidth;
      const h = previewContainerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [showPreview]);

  // Create/update geometry based on preview mesh
  useEffect(() => {
    if (!sceneRef.current || !showPreview) return;
    const scene = sceneRef.current;

    // Remove old mesh
    if (meshRef.current) {
      scene.remove(meshRef.current);
      meshRef.current.geometry.dispose();
    }

    // Create geometry
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

    // Create shader material with uniforms
    const threeUniforms: Record<string, THREE.IUniform> = {
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(1920, 1080) },
    };

    // Add custom uniforms
    uniforms.forEach(u => {
      if (u.type === 'vec2') {
        threeUniforms[u.name] = { value: new THREE.Vector2(...(u.value as number[])) };
      } else if (u.type === 'vec3') {
        threeUniforms[u.name] = { value: new THREE.Vector3(...(u.value as number[])) };
      } else if (u.type === 'vec4') {
        threeUniforms[u.name] = { value: new THREE.Vector4(...(u.value as number[])) };
      } else {
        threeUniforms[u.name] = { value: u.value };
      }
    });

    const material = new THREE.ShaderMaterial({
      uniforms: threeUniforms,
      vertexShader: vertexCode || `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: fragmentCode || `
        void main() {
          gl_FragColor = vec4(0.5, 0.5, 1.0, 1.0);
        }
      `,
      transparent: true,
    });

    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;
    materialRef.current = material;
  }, [previewMesh, showPreview, uniforms]);

  // Update shader code in material
  useEffect(() => {
    if (!materialRef.current || language !== 'glsl') return;

    try {
      materialRef.current.vertexShader = vertexCode;
      materialRef.current.fragmentShader = fragmentCode;
      materialRef.current.needsUpdate = true;

      // Clear errors if compilation succeeded
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        try {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
          // If render succeeds, clear errors
        } catch {
          // Shader compilation error - handled by Three.js console
        }
      }
    } catch (e) {
      console.error('Shader update error:', e);
    }
  }, [vertexCode, fragmentCode, language]);

  // Animation loop
  useEffect(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current || !showPreview) return;

    const renderer = rendererRef.current;
    const scene = sceneRef.current;
    const camera = cameraRef.current;

    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      const elapsed = clockRef.current.getElapsedTime();

      // Update time uniform
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
  }, [autoRotate, showPreview]);

  // Validate shader code
  const validateShader = useCallback((code: string, type: 'vertex' | 'fragment') => {
    const result = shaderEditor.validateGLSL(code, type);
    const newErrors: ShaderError[] = result.errors.map((msg, idx) => ({
      line: 1 + idx,
      column: 1,
      message: msg,
      severity: 'error' as const,
    }));
    return newErrors;
  }, []);

  // Update Monaco markers for errors
  const updateMonacoMarkers = useCallback((errors: ShaderError[]) => {
    if (!monacoRef.current || !editorRef.current) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const markers = errors.map(err => ({
      severity: err.severity === 'error'
        ? monacoRef.current.MarkerSeverity.Error
        : monacoRef.current.MarkerSeverity.Warning,
      startLineNumber: err.line,
      startColumn: err.column,
      endLineNumber: err.line,
      endColumn: err.column + 20,
      message: err.message,
      source: language === 'glsl' ? 'GLSL' : 'WGSL',
    }));

    monacoRef.current.editor.setModelMarkers(model, 'shader', markers);
  }, [language]);

  // Handle code changes with validation
  const handleCodeChange = useCallback((value: string | undefined, type: 'vertex' | 'fragment') => {
    if (value === undefined) return;

    if (type === 'vertex') {
      setVertexCode(value);
    } else {
      setFragmentCode(value);
    }
    setIsDirty(true);

    // Validate after a short delay
    setTimeout(() => {
      if (language === 'glsl') {
        const newErrors = validateShader(value, type);
        setErrors(newErrors);
        updateMonacoMarkers(newErrors);
      }
    }, 500);
  }, [language, validateShader, updateMonacoMarkers]);

  // Handle uniform value changes
  const handleUniformChange = useCallback((name: string, value: ShaderUniform['value']) => {
    setUniforms(prev => prev.map(u => u.name === name ? { ...u, value } : u));
    setIsDirty(true);

    // Update Three.js uniform
    if (materialRef.current && materialRef.current.uniforms[name]) {
      const uniform = materialRef.current.uniforms[name];
      if (Array.isArray(value)) {
        if (value.length === 2) {
          uniform.value = new THREE.Vector2(...value);
        } else if (value.length === 3) {
          uniform.value = new THREE.Vector3(...value);
        } else if (value.length === 4) {
          uniform.value = new THREE.Vector4(...value);
        }
      } else {
        uniform.value = value;
      }
    }
  }, []);

  // Add new uniform
  const addUniform = useCallback(() => {
    const newUniform: ShaderUniform = {
      name: `uCustom${uniforms.length + 1}`,
      type: 'float',
      value: 1.0,
      min: 0,
      max: 1,
    };
    setUniforms(prev => [...prev, newUniform]);
    setIsDirty(true);
  }, [uniforms.length]);

  // Remove uniform
  const removeUniform = useCallback((name: string) => {
    setUniforms(prev => prev.filter(u => u.name !== name));
    setIsDirty(true);
  }, []);

  // Save shader
  const handleSave = useCallback(() => {
    if (!shader) return;

    const updatedShader: CustomShader = {
      ...shader,
      vertexShader: vertexCode,
      fragmentShader: fragmentCode,
      uniforms,
    };

    shaderEditor.updateShaderCode(shader.id, vertexCode, fragmentCode);
    uniforms.forEach(u => shaderEditor.updateUniform(shader.id, u.name, u.value));

    setShader(updatedShader);
    setIsDirty(false);
    onShaderChange?.(updatedShader);
  }, [shader, vertexCode, fragmentCode, uniforms, onShaderChange]);

  // Apply template
  const applyTemplate = useCallback((template: ShaderTemplate) => {
    setVertexCode(template.vertexShader);
    setFragmentCode(template.fragmentShader);
    setUniforms([...template.uniforms]);
    setIsDirty(true);
    setShowTemplates(false);
  }, []);

  // Switch language
  const handleLanguageSwitch = useCallback((newLang: ShaderLanguage) => {
    if (newLang === language) return;

    if (newLang === 'wgsl') {
      // Convert to WGSL template (basic conversion - user needs to adapt)
      setVertexCode(WGSL_VERTEX_TEMPLATE);
      setFragmentCode(WGSL_FRAGMENT_TEMPLATE);
    }
    setLanguage(newLang);
    setIsDirty(true);
  }, [language]);

  // Monaco editor mount handler
  const handleEditorDidMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register GLSL language
    monaco.languages.register({ id: 'glsl' });
    monaco.languages.setMonarchTokensProvider('glsl', {
      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/\/\*/, 'comment', '@comment'],
          [/#\w+/, 'keyword.preprocessor'],
          [/\b(void|bool|int|uint|float|double|vec[234]|mat[234]|sampler2D|samplerCube)\b/, 'type'],
          [/\b(const|uniform|varying|attribute|in|out|inout|layout|precision|highp|mediump|lowp)\b/, 'keyword'],
          [/\b(if|else|for|while|do|switch|case|default|break|continue|return|discard)\b/, 'keyword.control'],
          [/\b(struct|gl_Position|gl_FragColor|gl_PointSize|gl_FragCoord)\b/, 'variable.predefined'],
          [/\b(sin|cos|tan|asin|acos|atan|pow|exp|log|sqrt|abs|sign|floor|ceil|fract|mod|min|max|clamp|mix|step|smoothstep|length|distance|dot|cross|normalize|reflect|refract|texture2D)\b/, 'support.function'],
          [/[0-9]+\.[0-9]*([eE][\-+]?[0-9]+)?/, 'number.float'],
          [/[0-9]+/, 'number'],
          [/[a-zA-Z_]\w*/, 'identifier'],
        ],
        comment: [
          [/[^/*]+/, 'comment'],
          [/\*\//, 'comment', '@pop'],
          [/[/*]/, 'comment'],
        ],
      },
    });

    // Register WGSL language
    monaco.languages.register({ id: 'wgsl' });
    monaco.languages.setMonarchTokensProvider('wgsl', {
      tokenizer: {
        root: [
          [/\/\/.*$/, 'comment'],
          [/@\w+/, 'annotation'],
          [/\b(fn|var|let|const|struct|return|if|else|for|while|loop|break|continue|switch|case|default)\b/, 'keyword'],
          [/\b(bool|i32|u32|f32|f16|vec[234]|mat[234]x[234]|array|ptr|sampler|texture_2d)\b/, 'type'],
          [/\b(true|false)\b/, 'constant'],
          [/[0-9]+\.[0-9]*([eE][\-+]?[0-9]+)?[fh]?/, 'number.float'],
          [/[0-9]+[iu]?/, 'number'],
          [/[a-zA-Z_]\w*/, 'identifier'],
        ],
      },
    });

    // Save shortcut
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      handleSave();
    });
  }, [handleSave]);

  const currentCode = activeTab === 'vertex' ? vertexCode : fragmentCode;
  const meshOptions: { value: PreviewMesh; label: string; icon: string }[] = [
    { value: 'sphere', label: 'Sphere', icon: '⬤' },
    { value: 'cube', label: 'Cube', icon: '◼' },
    { value: 'plane', label: 'Plane', icon: '▬' },
    { value: 'torus', label: 'Torus', icon: '◯' },
    { value: 'cylinder', label: 'Cylinder', icon: '▮' },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0a0a12]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a28] border-b border-[#3f3f5a]">
        <div className="flex items-center gap-3">
          <span className="text-lg font-semibold text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
            Shader Editor
          </span>
          {isDirty && (
            <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
              Unsaved
            </span>
          )}
          {errors.length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-red-500/20 text-red-400 rounded">
              {errors.length} error{errors.length > 1 ? 's' : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Language Toggle */}
          <div className="flex bg-[#2a2a3e] rounded overflow-hidden">
            <button
              onClick={() => handleLanguageSwitch('glsl')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                language === 'glsl'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              GLSL
            </button>
            <button
              onClick={() => handleLanguageSwitch('wgsl')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                language === 'wgsl'
                  ? 'bg-purple-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              WGSL
            </button>
          </div>

          <div className="w-px h-5 bg-[#3f3f5a]" />

          {/* Templates */}
          <div className="relative">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-3 py-1 text-sm text-gray-300 hover:text-white hover:bg-white/10 rounded flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              Templates
            </button>

            {showTemplates && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-[#1a1a28] border border-[#3f3f5a] rounded-lg shadow-xl z-50 max-h-80 overflow-y-auto">
                {templates.map(template => (
                  <button
                    key={template.id}
                    onClick={() => applyTemplate(template)}
                    className="w-full px-4 py-3 text-left hover:bg-white/5 border-b border-[#3f3f5a] last:border-0"
                  >
                    <div className="text-sm font-medium text-white">{template.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{template.description}</div>
                    <div className="text-xs text-purple-400 mt-1">{template.category}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Toggle Buttons */}
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-1 text-sm rounded flex items-center gap-1.5 ${
              showPreview
                ? 'bg-purple-600/20 text-purple-300 border border-purple-600/50'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Preview
          </button>

          <button
            onClick={() => setShowUniforms(!showUniforms)}
            className={`px-3 py-1 text-sm rounded flex items-center gap-1.5 ${
              showUniforms
                ? 'bg-purple-600/20 text-purple-300 border border-purple-600/50'
                : 'text-gray-400 hover:text-white hover:bg-white/10'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            Uniforms
          </button>

          <div className="w-px h-5 bg-[#3f3f5a]" />

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className="px-3 py-1 text-sm bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Editor Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Shader Type Tabs */}
          <div className="flex items-center bg-[#1a1a28] border-b border-[#3f3f5a]">
            <button
              onClick={() => setActiveTab('vertex')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'vertex'
                  ? 'text-purple-400 border-purple-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              Vertex Shader
            </button>
            <button
              onClick={() => setActiveTab('fragment')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'fragment'
                  ? 'text-purple-400 border-purple-400'
                  : 'text-gray-400 border-transparent hover:text-white'
              }`}
            >
              Fragment Shader
            </button>
          </div>

          {/* Monaco Editor */}
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              language={language}
              value={currentCode}
              onChange={(value) => handleCodeChange(value, activeTab)}
              onMount={handleEditorDidMount}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                rulers: [],
                wordWrap: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                insertSpaces: true,
                formatOnPaste: true,
                formatOnType: true,
                padding: { top: 8 },
                renderLineHighlight: 'all',
                folding: true,
                bracketPairColorization: { enabled: true },
              }}
            />
          </div>

          {/* Errors Panel */}
          {errors.length > 0 && (
            <div className="border-t border-[#3f3f5a] bg-[#1a1a28] max-h-32 overflow-auto">
              <div className="px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border-b border-[#3f3f5a]">
                Problems ({errors.length})
              </div>
              <div className="divide-y divide-[#3f3f5a]">
                {errors.map((err, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 text-xs hover:bg-white/5 cursor-pointer"
                    onClick={() => {
                      if (editorRef.current) {
                        editorRef.current.revealLineInCenter(err.line);
                        editorRef.current.setPosition({ lineNumber: err.line, column: err.column });
                        editorRef.current.focus();
                      }
                    }}
                  >
                    <span className="text-red-400">[{err.line}:{err.column}]</span>
                    <span className="text-gray-400 ml-2">{err.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Uniforms Panel */}
        {showUniforms && (
          <div className="w-64 border-l border-[#3f3f5a] bg-[#0f0f1a] flex flex-col">
            <div className="px-4 py-3 bg-[#1a1a28] border-b border-[#3f3f5a] flex items-center justify-between">
              <span className="text-sm font-medium text-white">Uniforms</span>
              <button
                onClick={addUniform}
                className="p-1 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded"
                title="Add Uniform"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {uniforms.map(uniform => (
                <UniformControl
                  key={uniform.name}
                  uniform={uniform}
                  onChange={(value) => handleUniformChange(uniform.name, value)}
                  onRemove={() => removeUniform(uniform.name)}
                />
              ))}
              {uniforms.length === 0 && (
                <div className="text-center text-gray-500 text-xs py-8">
                  No uniforms defined
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-80 border-l border-[#3f3f5a] bg-[#0f0f1a] flex flex-col">
            {/* Preview Header */}
            <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a28] border-b border-[#3f3f5a]">
              <span className="text-sm font-medium text-gray-300">Preview</span>
              <div className="flex items-center gap-1">
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
            <div ref={previewContainerRef} className="flex-1" />
          </div>
        )}
      </div>
    </div>
  );
}

// Uniform control component
function UniformControl({
  uniform,
  onChange,
  onRemove,
}: {
  uniform: ShaderUniform;
  onChange: (value: ShaderUniform['value']) => void;
  onRemove: () => void;
}) {
  const renderInput = () => {
    switch (uniform.type) {
      case 'float':
      case 'int':
        return (
          <div className="space-y-1">
            <input
              type="range"
              min={uniform.min ?? 0}
              max={uniform.max ?? 1}
              step={uniform.step ?? 0.01}
              value={uniform.value as number}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-[#3f3f5a] rounded-full appearance-none cursor-pointer accent-purple-500"
            />
            <input
              type="number"
              value={uniform.value as number}
              onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
              step={uniform.step ?? 0.01}
              className="w-full px-2 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-xs text-white focus:outline-none focus:border-purple-500"
            />
          </div>
        );

      case 'bool':
        return (
          <button
            onClick={() => onChange(!uniform.value)}
            className={`w-full px-3 py-1.5 text-xs rounded transition-colors ${
              uniform.value
                ? 'bg-purple-600 text-white'
                : 'bg-[#2a2a3e] text-gray-400 border border-[#3f3f5a]'
            }`}
          >
            {uniform.value ? 'True' : 'False'}
          </button>
        );

      case 'vec2':
      case 'vec3':
      case 'vec4': {
        const values = uniform.value as number[];
        const labels = ['X', 'Y', 'Z', 'W'].slice(0, values.length);
        return (
          <div className="space-y-1">
            {values.map((val, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-4">{labels[i]}</span>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => {
                    const newValues = [...values];
                    newValues[i] = parseFloat(e.target.value) || 0;
                    onChange(newValues);
                  }}
                  step={0.01}
                  className="flex-1 px-2 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            ))}
            {uniform.type === 'vec3' && (
              <input
                type="color"
                value={rgbToHex(values[0] * 255, values[1] * 255, values[2] * 255)}
                onChange={(e) => {
                  const rgb = hexToRgb(e.target.value);
                  if (rgb) {
                    onChange([rgb.r / 255, rgb.g / 255, rgb.b / 255]);
                  }
                }}
                className="w-full h-8 rounded cursor-pointer"
              />
            )}
          </div>
        );
      }

      default:
        return (
          <input
            type="text"
            value={String(uniform.value)}
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-2 py-1 bg-[#2a2a3e] border border-[#3f3f5a] rounded text-xs text-white focus:outline-none focus:border-purple-500"
          />
        );
    }
  };

  return (
    <div className="bg-[#1a1a28] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-white">{uniform.name}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs text-purple-400">{uniform.type}</span>
          <button
            onClick={onRemove}
            className="p-0.5 text-gray-500 hover:text-red-400 rounded"
            title="Remove"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      {renderInput()}
    </div>
  );
}

// Helper functions
function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

export type { ShaderEditorProps };
