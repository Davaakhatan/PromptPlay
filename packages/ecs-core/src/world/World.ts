import { createWorld, IWorld, addEntity, removeEntity, addComponent, hasComponent } from 'bitecs';
import { ISystem, GameSpec, GameMetadata, GameConfig } from '@promptplay/shared-types';

export class GameWorld {
  private world: IWorld;
  private systems: ISystem[] = [];
  private entityMap: Map<number, string> = new Map(); // eid -> name
  private tagMap: Map<string, Set<number>> = new Map(); // tag -> Set<eid>
  private entityTags: Map<number, Set<string>> = new Map(); // eid -> Set<tag>
  private textureRegistry: Map<string, number> = new Map(); // texture name -> id
  private nextTextureId = 0;

  private metadata: GameMetadata = {
    title: '',
    genre: 'platformer',
    description: '',
  };

  private config: GameConfig = {
    gravity: { x: 0, y: 1 },
    worldBounds: { width: 800, height: 600 },
  };

  constructor() {
    this.world = createWorld();
  }

  getWorld(): IWorld {
    return this.world;
  }

  // System management
  addSystem(system: ISystem): void {
    system.init(this.world);
    this.systems.push(system);
  }

  removeSystem(system: ISystem): void {
    const index = this.systems.indexOf(system);
    if (index > -1) {
      if (system.cleanup) {
        system.cleanup(this.world);
      }
      this.systems.splice(index, 1);
    }
  }

  getSystems(): ISystem[] {
    return this.systems;
  }

  getSystemNames(): string[] {
    return this.systems.map(s => s.constructor.name);
  }

  update(deltaTime: number): void {
    for (const system of this.systems) {
      system.update(this.world, deltaTime);
    }
  }

  // Entity management
  createEntity(name?: string): number {
    const eid = addEntity(this.world);
    if (name) {
      this.entityMap.set(eid, name);
    }
    return eid;
  }

  destroyEntity(eid: number): void {
    this.entityMap.delete(eid);

    // Remove from all tag sets
    const tags = this.entityTags.get(eid);
    if (tags) {
      for (const tag of tags) {
        this.tagMap.get(tag)?.delete(eid);
      }
      this.entityTags.delete(eid);
    }

    removeEntity(this.world, eid);
  }

  getEntityName(eid: number): string | undefined {
    return this.entityMap.get(eid);
  }

  getEntityIdByName(name: string): number | undefined {
    for (const [eid, entityName] of this.entityMap) {
      if (entityName === name) return eid;
    }
    return undefined;
  }

  getEntities(): number[] {
    const entities: number[] = [];
    for (const [eid] of this.entityMap) {
      entities.push(eid);
    }
    return entities;
  }

  // Tag system
  addTag(eid: number, tag: string): void {
    if (!this.tagMap.has(tag)) {
      this.tagMap.set(tag, new Set());
    }
    this.tagMap.get(tag)!.add(eid);

    if (!this.entityTags.has(eid)) {
      this.entityTags.set(eid, new Set());
    }
    this.entityTags.get(eid)!.add(tag);
  }

  removeTag(eid: number, tag: string): void {
    this.tagMap.get(tag)?.delete(eid);
    this.entityTags.get(eid)?.delete(tag);
  }

  hasTag(eid: number, tag: string): boolean {
    return this.entityTags.get(eid)?.has(tag) ?? false;
  }

  getEntitiesByTag(tag: string): number[] {
    return Array.from(this.tagMap.get(tag) ?? []);
  }

  getTags(eid: number): string[] {
    return Array.from(this.entityTags.get(eid) ?? []);
  }

  // Texture registry
  getTextureId(textureName: string): number {
    if (!this.textureRegistry.has(textureName)) {
      this.textureRegistry.set(textureName, this.nextTextureId++);
    }
    return this.textureRegistry.get(textureName)!;
  }

  getTextureName(textureId: number): string | undefined {
    for (const [name, id] of this.textureRegistry) {
      if (id === textureId) return name;
    }
    return undefined;
  }

  // Metadata and config
  setMetadata(metadata: GameMetadata): void {
    this.metadata = metadata;
  }

  getMetadata(): GameMetadata {
    return this.metadata;
  }

  setConfig(config: GameConfig): void {
    this.config = config;
  }

  getConfig(): GameConfig {
    return this.config;
  }

  // Query helper (delegates to bitecs)
  query(components: any[]): number[] {
    // For now, simple implementation
    // In production, use bitecs defineQuery for performance
    const entities = this.getEntities();
    return entities.filter(eid => {
      return components.every(component => hasComponent(this.world, component, eid));
    });
  }

  // Clear all
  clear(): void {
    const entities = this.getEntities();
    for (const eid of entities) {
      this.destroyEntity(eid);
    }

    for (const system of this.systems) {
      if (system.cleanup) {
        system.cleanup(this.world);
      }
    }
    this.systems = [];
    this.textureRegistry.clear();
    this.nextTextureId = 0;
  }
}
