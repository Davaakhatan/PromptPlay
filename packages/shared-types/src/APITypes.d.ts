import { GameSpec } from './GameTypes';
export interface GenerateGameRequest {
    prompt: string;
    genre?: 'platformer' | 'shooter' | 'puzzle';
}
export interface GenerateGameResponse {
    spec: GameSpec;
    error?: string;
}
export interface SaveGameRequest {
    name: string;
    spec: GameSpec;
}
export interface LoadGameRequest {
    name: string;
}
export interface LoadGameResponse {
    spec: GameSpec;
    error?: string;
}
//# sourceMappingURL=APITypes.d.ts.map