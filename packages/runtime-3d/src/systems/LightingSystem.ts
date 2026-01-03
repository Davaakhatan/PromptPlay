import { defineQuery, enterQuery, exitQuery, IWorld } from 'bitecs';
import * as THREE from 'three';
import { Transform3D, Light } from '../components';
import { ThreeRenderer } from '../renderers/ThreeRenderer';

// Query for light entities
const lightQuery = defineQuery([Transform3D, Light]);
const lightEnterQuery = enterQuery(lightQuery);
const lightExitQuery = exitQuery(lightQuery);

// Light type constants
const LIGHT_TYPES = ['ambient', 'directional', 'point', 'spot', 'hemisphere'] as const;

/**
 * System for managing dynamic lighting
 */
export class LightingSystem {
  private renderer: ThreeRenderer;
  private lights: Map<number, THREE.Light> = new Map();
  private lightHelpers: Map<number, THREE.Object3D> = new Map();
  private showHelpers = false;

  constructor(renderer: ThreeRenderer) {
    this.renderer = renderer;
  }

  /**
   * Execute the lighting system
   */
  execute(world: IWorld): void {
    // Handle new light entities
    const enteredLights = lightEnterQuery(world);
    for (const eid of enteredLights) {
      this.createLight(eid);
    }

    // Handle removed light entities
    const exitedLights = lightExitQuery(world);
    for (const eid of exitedLights) {
      this.removeLight(eid);
    }

    // Update existing lights
    const lights = lightQuery(world);
    for (const eid of lights) {
      this.updateLight(eid);
    }
  }

  /**
   * Create a light for an entity
   */
  private createLight(eid: number): void {
    const lightType = LIGHT_TYPES[Light.type[eid]] || 'point';
    const color = new THREE.Color(Light.color[eid] || 0xffffff);
    const intensity = Light.intensity[eid] || 1;

    let light: THREE.Light;
    let helper: THREE.Object3D | null = null;

    switch (lightType) {
      case 'ambient':
        light = new THREE.AmbientLight(color, intensity);
        break;

      case 'directional': {
        const dirLight = new THREE.DirectionalLight(color, intensity);
        dirLight.castShadow = Light.castShadow[eid] === 1;

        if (dirLight.castShadow) {
          this.configureShadow(dirLight, eid);
        }

        // Set target
        dirLight.target.position.set(
          Light.targetX[eid] || 0,
          Light.targetY[eid] || 0,
          Light.targetZ[eid] || 0
        );
        this.renderer.scene.add(dirLight.target);

        light = dirLight;

        if (this.showHelpers) {
          helper = new THREE.DirectionalLightHelper(dirLight, 1);
        }
        break;
      }

      case 'point': {
        const pointLight = new THREE.PointLight(
          color,
          intensity,
          Light.distance[eid] || 0,
          Light.decay[eid] || 2
        );
        pointLight.castShadow = Light.castShadow[eid] === 1;

        if (pointLight.castShadow) {
          this.configurePointShadow(pointLight, eid);
        }

        light = pointLight;

        if (this.showHelpers) {
          helper = new THREE.PointLightHelper(pointLight, 0.5);
        }
        break;
      }

      case 'spot': {
        const spotLight = new THREE.SpotLight(
          color,
          intensity,
          Light.distance[eid] || 0,
          Light.angle[eid] || Math.PI / 4,
          Light.penumbra[eid] || 0,
          Light.decay[eid] || 2
        );
        spotLight.castShadow = Light.castShadow[eid] === 1;

        if (spotLight.castShadow) {
          this.configureSpotShadow(spotLight, eid);
        }

        // Set target
        spotLight.target.position.set(
          Light.targetX[eid] || 0,
          Light.targetY[eid] || 0,
          Light.targetZ[eid] || 0
        );
        this.renderer.scene.add(spotLight.target);

        light = spotLight;

        if (this.showHelpers) {
          helper = new THREE.SpotLightHelper(spotLight);
        }
        break;
      }

      case 'hemisphere': {
        const skyColor = new THREE.Color(Light.color[eid] || 0xffffff);
        const groundColor = new THREE.Color(Light.groundColor[eid] || 0x444444);
        light = new THREE.HemisphereLight(skyColor, groundColor, intensity);

        if (this.showHelpers) {
          helper = new THREE.HemisphereLightHelper(light as THREE.HemisphereLight, 1);
        }
        break;
      }

      default:
        light = new THREE.PointLight(color, intensity);
    }

    // Set position
    light.position.set(
      Transform3D.x[eid],
      Transform3D.y[eid],
      Transform3D.z[eid]
    );

    // Store and add to scene
    this.lights.set(eid, light);
    this.renderer.scene.add(light);

    if (helper) {
      this.lightHelpers.set(eid, helper);
      this.renderer.scene.add(helper);
    }
  }

  /**
   * Configure shadow for directional light
   */
  private configureShadow(light: THREE.DirectionalLight, eid: number): void {
    const mapSize = Light.shadowMapSize[eid] || 2048;
    light.shadow.mapSize.width = mapSize;
    light.shadow.mapSize.height = mapSize;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = 500;
    light.shadow.camera.left = -50;
    light.shadow.camera.right = 50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;
    light.shadow.bias = Light.shadowBias[eid] || -0.0001;
  }

  /**
   * Configure shadow for point light
   */
  private configurePointShadow(light: THREE.PointLight, eid: number): void {
    const mapSize = Light.shadowMapSize[eid] || 1024;
    light.shadow.mapSize.width = mapSize;
    light.shadow.mapSize.height = mapSize;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = Light.distance[eid] || 500;
    light.shadow.bias = Light.shadowBias[eid] || -0.0001;
  }

  /**
   * Configure shadow for spot light
   */
  private configureSpotShadow(light: THREE.SpotLight, eid: number): void {
    const mapSize = Light.shadowMapSize[eid] || 1024;
    light.shadow.mapSize.width = mapSize;
    light.shadow.mapSize.height = mapSize;
    light.shadow.camera.near = 0.5;
    light.shadow.camera.far = Light.distance[eid] || 500;
    light.shadow.bias = Light.shadowBias[eid] || -0.0001;
  }

  /**
   * Update light properties
   */
  private updateLight(eid: number): void {
    const light = this.lights.get(eid);
    if (!light) return;

    // Update position
    light.position.set(
      Transform3D.x[eid],
      Transform3D.y[eid],
      Transform3D.z[eid]
    );

    // Update color and intensity
    if ('color' in light && light.color instanceof THREE.Color) {
      light.color.setHex(Light.color[eid] || 0xffffff);
    }
    light.intensity = Light.intensity[eid] || 1;

    // Update light-specific properties
    if (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) {
      light.target.position.set(
        Light.targetX[eid] || 0,
        Light.targetY[eid] || 0,
        Light.targetZ[eid] || 0
      );
    }

    if (light instanceof THREE.SpotLight) {
      light.angle = Light.angle[eid] || Math.PI / 4;
      light.penumbra = Light.penumbra[eid] || 0;
      light.distance = Light.distance[eid] || 0;
      light.decay = Light.decay[eid] || 2;
    }

    if (light instanceof THREE.PointLight) {
      light.distance = Light.distance[eid] || 0;
      light.decay = Light.decay[eid] || 2;
    }

    // Update helper
    const helper = this.lightHelpers.get(eid);
    if (helper) {
      if ('update' in helper && typeof helper.update === 'function') {
        (helper as THREE.DirectionalLightHelper).update();
      }
    }
  }

  /**
   * Remove a light
   */
  removeLight(eid: number): void {
    const light = this.lights.get(eid);
    if (light) {
      this.renderer.scene.remove(light);

      // Remove target if it's a directional or spot light
      if (light instanceof THREE.DirectionalLight || light instanceof THREE.SpotLight) {
        this.renderer.scene.remove(light.target);
      }

      // Dispose shadow map
      if (light.shadow?.map) {
        light.shadow.map.dispose();
      }

      this.lights.delete(eid);
    }

    const helper = this.lightHelpers.get(eid);
    if (helper) {
      this.renderer.scene.remove(helper);
      if ('dispose' in helper && typeof helper.dispose === 'function') {
        (helper as THREE.DirectionalLightHelper).dispose();
      }
      this.lightHelpers.delete(eid);
    }
  }

  /**
   * Toggle light helpers visibility
   */
  setHelpersVisible(visible: boolean): void {
    this.showHelpers = visible;

    if (visible) {
      // Create helpers for existing lights
      this.lights.forEach((light, eid) => {
        if (!this.lightHelpers.has(eid)) {
          const helper = this.createHelper(light);
          if (helper) {
            this.lightHelpers.set(eid, helper);
            this.renderer.scene.add(helper);
          }
        }
      });
    } else {
      // Remove all helpers
      this.lightHelpers.forEach((helper) => {
        this.renderer.scene.remove(helper);
        if ('dispose' in helper && typeof helper.dispose === 'function') {
          (helper as THREE.DirectionalLightHelper).dispose();
        }
      });
      this.lightHelpers.clear();
    }
  }

  /**
   * Create a helper for a light
   */
  private createHelper(light: THREE.Light): THREE.Object3D | null {
    if (light instanceof THREE.DirectionalLight) {
      return new THREE.DirectionalLightHelper(light, 1);
    }
    if (light instanceof THREE.PointLight) {
      return new THREE.PointLightHelper(light, 0.5);
    }
    if (light instanceof THREE.SpotLight) {
      return new THREE.SpotLightHelper(light);
    }
    if (light instanceof THREE.HemisphereLight) {
      return new THREE.HemisphereLightHelper(light, 1);
    }
    return null;
  }

  /**
   * Get light by entity ID
   */
  getLight(eid: number): THREE.Light | undefined {
    return this.lights.get(eid);
  }

  /**
   * Set ambient light color and intensity
   */
  setAmbientLight(color: number, intensity: number): void {
    // Find or create ambient light
    let ambientLight: THREE.AmbientLight | undefined;

    this.lights.forEach((light) => {
      if (light instanceof THREE.AmbientLight) {
        ambientLight = light;
      }
    });

    if (ambientLight !== undefined) {
      (ambientLight as THREE.AmbientLight).color.setHex(color);
      (ambientLight as THREE.AmbientLight).intensity = intensity;
    } else {
      const newAmbient = new THREE.AmbientLight(color, intensity);
      this.renderer.scene.add(newAmbient);
    }
  }
}
