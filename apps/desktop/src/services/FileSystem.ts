
export interface FileStat {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number;
    extension?: string;
    mimeType?: string;
}

export interface FileSystemProvider {
    readDirectory(path: string): Promise<FileStat[]>;
    readFile(path: string): Promise<Uint8Array>;
    writeFile(path: string, content: Uint8Array): Promise<void>;
    createDirectory(path: string): Promise<void>;
    delete(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    copyFile(source: string, destination: string): Promise<void>;
    writeTextFile(path: string, content: string): Promise<void>;
}

import { invoke } from '@tauri-apps/api/core';
import { copyFile } from '@tauri-apps/plugin-fs';

// Tauri backend implementation
export class TauriFileSystem implements FileSystemProvider {
    async readDirectory(path: string): Promise<FileStat[]> {
        interface TauriEntry {
            name: string;
            is_dir: boolean;
            path: string;
        }

        // Abstracting the backend call
        const entries = await invoke<TauriEntry[]>('list_directory', { path });

        return entries.map(entry => ({
            name: entry.name,
            path: entry.path,
            isDirectory: entry.is_dir,
            extension: entry.name.includes('.') ? entry.name.split('.').pop()?.toLowerCase() : undefined
        }));
    }

    async readFile(_path: string): Promise<Uint8Array> {
        // This would wrap tauri fs.read
        return new Uint8Array();
    }

    async writeFile(_path: string, _content: Uint8Array): Promise<void> {
        // This would wrap tauri fs.write
    }

    async writeTextFile(path: string, content: string): Promise<void> {
        await invoke('write_file', { path, content });
    }

    async createDirectory(path: string): Promise<void> {
        await invoke('create_directory', { path });
    }

    async delete(_path: string): Promise<void> {
        // Wrapper
    }

    async exists(_path: string): Promise<boolean> {
        // Wrapper
        return true;
    }

    async copyFile(source: string, destination: string): Promise<void> {
        await copyFile(source, destination);
    }
}

// Memory backend for Web/Testing
export class MemoryFileSystem implements FileSystemProvider {
    private files: Record<string, Uint8Array> = {};
    private textFiles: Record<string, string> = {};

    async readDirectory(_path: string): Promise<FileStat[]> {
        return [];
    }

    async readFile(path: string): Promise<Uint8Array> {
        return this.files[path] || new Uint8Array();
    }

    async writeFile(path: string, content: Uint8Array): Promise<void> {
        this.files[path] = content;
    }

    async writeTextFile(path: string, content: string): Promise<void> {
        this.textFiles[path] = content;
    }

    async createDirectory(_path: string): Promise<void> { }
    async delete(_path: string): Promise<void> { }
    async exists(path: string): Promise<boolean> { return !!this.files[path] || !!this.textFiles[path]; }
    async copyFile(source: string, destination: string): Promise<void> {
        // Mock copy in memory
        if (this.files[source]) {
            this.files[destination] = this.files[source];
        } else if (this.textFiles[source]) {
            this.textFiles[destination] = this.textFiles[source];
        }
    }
}

export const fileSystem = new TauriFileSystem();
