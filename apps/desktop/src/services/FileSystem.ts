import { invoke } from '@tauri-apps/api/core';
import { copyFile } from '@tauri-apps/plugin-fs';

export interface FileStat {
    name: string;
    path: string;
    isDirectory: boolean;
    size?: number;
    extension?: string;
    mimeType?: string;
}

export interface FileMetadata {
    size: number;
    isFile: boolean;
    isDirectory: boolean;
    readonly: boolean;
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
    getFileInfo?(path: string): Promise<FileMetadata>;
}

export class FileSystemError extends Error {
    constructor(
        message: string,
        public readonly code: 'NOT_FOUND' | 'PERMISSION_DENIED' | 'ALREADY_EXISTS' | 'DISK_FULL' | 'UNKNOWN',
        public readonly path?: string
    ) {
        super(message);
        this.name = 'FileSystemError';
    }

    static fromError(error: unknown, path?: string): FileSystemError {
        const message = error instanceof Error ? error.message : String(error);

        // Parse error message to determine error type
        if (message.includes('not found') || message.includes('No such file')) {
            return new FileSystemError(message, 'NOT_FOUND', path);
        }
        if (message.includes('permission') || message.includes('denied') || message.includes('access')) {
            return new FileSystemError(message, 'PERMISSION_DENIED', path);
        }
        if (message.includes('already exists')) {
            return new FileSystemError(message, 'ALREADY_EXISTS', path);
        }
        if (message.includes('disk full') || message.includes('no space')) {
            return new FileSystemError(message, 'DISK_FULL', path);
        }
        return new FileSystemError(message, 'UNKNOWN', path);
    }
}

// Tauri backend implementation
export class TauriFileSystem implements FileSystemProvider {
    async readDirectory(path: string): Promise<FileStat[]> {
        interface TauriEntry {
            name: string;
            is_dir: boolean;
            path: string;
        }

        try {
            const entries = await invoke<TauriEntry[]>('list_directory', { path });

            return entries.map(entry => ({
                name: entry.name,
                path: entry.path,
                isDirectory: entry.is_dir,
                extension: entry.name.includes('.') ? entry.name.split('.').pop()?.toLowerCase() : undefined
            }));
        } catch (error) {
            throw FileSystemError.fromError(error, path);
        }
    }

    async readFile(path: string): Promise<Uint8Array> {
        try {
            const data = await invoke<number[]>('read_binary_file', { path });
            return new Uint8Array(data);
        } catch (error) {
            throw FileSystemError.fromError(error, path);
        }
    }

    async writeFile(path: string, content: Uint8Array): Promise<void> {
        try {
            await invoke('write_binary_file', { path, data: Array.from(content) });
        } catch (error) {
            throw FileSystemError.fromError(error, path);
        }
    }

    async writeTextFile(path: string, content: string): Promise<void> {
        try {
            await invoke('write_file', { path, content });
        } catch (error) {
            throw FileSystemError.fromError(error, path);
        }
    }

    async createDirectory(path: string): Promise<void> {
        try {
            await invoke('create_directory', { path });
        } catch (error) {
            throw FileSystemError.fromError(error, path);
        }
    }

    async delete(path: string): Promise<void> {
        try {
            await invoke('delete_path', { path });
        } catch (error) {
            throw FileSystemError.fromError(error, path);
        }
    }

    async exists(path: string): Promise<boolean> {
        try {
            return await invoke<boolean>('path_exists', { path });
        } catch {
            return false;
        }
    }

    async copyFile(source: string, destination: string): Promise<void> {
        try {
            await copyFile(source, destination);
        } catch (error) {
            throw FileSystemError.fromError(error, `${source} -> ${destination}`);
        }
    }

    async getFileInfo(path: string): Promise<FileMetadata> {
        interface TauriMetadata {
            size: number;
            is_file: boolean;
            is_directory: boolean;
            readonly: boolean;
        }

        try {
            const metadata = await invoke<TauriMetadata>('get_file_info', { path });
            return {
                size: metadata.size,
                isFile: metadata.is_file,
                isDirectory: metadata.is_directory,
                readonly: metadata.readonly
            };
        } catch (error) {
            throw FileSystemError.fromError(error, path);
        }
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
        const data = this.files[path];
        if (!data) {
            throw new FileSystemError(`File not found: ${path}`, 'NOT_FOUND', path);
        }
        return data;
    }

    async writeFile(path: string, content: Uint8Array): Promise<void> {
        this.files[path] = content;
    }

    async writeTextFile(path: string, content: string): Promise<void> {
        this.textFiles[path] = content;
    }

    async createDirectory(_path: string): Promise<void> { }

    async delete(path: string): Promise<void> {
        delete this.files[path];
        delete this.textFiles[path];
    }

    async exists(path: string): Promise<boolean> {
        return !!this.files[path] || !!this.textFiles[path];
    }

    async copyFile(source: string, destination: string): Promise<void> {
        if (this.files[source]) {
            this.files[destination] = this.files[source];
        } else if (this.textFiles[source]) {
            this.textFiles[destination] = this.textFiles[source];
        } else {
            throw new FileSystemError(`Source file not found: ${source}`, 'NOT_FOUND', source);
        }
    }

    async getFileInfo(path: string): Promise<FileMetadata> {
        const file = this.files[path] || this.textFiles[path];
        if (!file) {
            throw new FileSystemError(`File not found: ${path}`, 'NOT_FOUND', path);
        }
        const size = this.files[path]?.length ?? new TextEncoder().encode(this.textFiles[path]).length;
        return {
            size,
            isFile: true,
            isDirectory: false,
            readonly: false
        };
    }
}

export const fileSystem = new TauriFileSystem();
