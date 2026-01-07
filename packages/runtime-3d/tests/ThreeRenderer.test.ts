/**
 * Tests for ThreeRenderer - Three.js-based 3D renderer
 *
 * Note: Detailed ThreeRenderer functionality is tested through Game3D integration tests.
 * These tests verify the module exports and basic type contracts.
 */
import { describe, it, expect } from 'vitest';

describe('ThreeRenderer Module', () => {
  it('should export ThreeRenderer class', async () => {
    // Verify the module can be imported
    const module = await import('../src/renderers/ThreeRenderer');
    expect(module.ThreeRenderer).toBeDefined();
    expect(typeof module.ThreeRenderer).toBe('function');
  });

  it('should export ThreeRendererOptions interface', async () => {
    // TypeScript compile-time check for interface
    type AssertOptions = import('../src/renderers/ThreeRenderer').ThreeRendererOptions;
    const options: AssertOptions = { width: 800, height: 600 };
    expect(options.width).toBe(800);
  });

  it('should export TextureProps interface', async () => {
    // TypeScript compile-time check for interface
    type AssertProps = import('../src/renderers/ThreeRenderer').TextureProps;
    const props: AssertProps = { diffuseMap: '/textures/test.png' };
    expect(props.diffuseMap).toBe('/textures/test.png');
  });
});

// Note: Full ThreeRenderer functionality is tested via Game3D.test.ts
// which creates ThreeRenderer instances and tests:
// - Mesh creation (box, sphere, plane, etc.)
// - Transform updates
// - Light creation (ambient, directional, point, spot)
// - Scene configuration
// - Resize handling
// - Dispose/cleanup
