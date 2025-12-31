import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { FolderIcon, FileIcon, ChevronRightIcon, ChevronDownIcon } from './Icons';

interface FileInfo {
  name: string;
  path: string;
  is_directory: boolean;
}

interface FileTreeProps {
  projectPath: string | null;
  onFileSelect: (filePath: string) => void;
  selectedFile: string | null;
}

export default function FileTree({ projectPath, onFileSelect, selectedFile }: FileTreeProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (projectPath) {
      loadDirectory(projectPath);
      setExpandedDirs(new Set([projectPath]));
    } else {
      setFiles([]);
      setExpandedDirs(new Set());
    }
  }, [projectPath]);

  const loadDirectory = async (path: string) => {
    try {
      setLoading(true);
      const result = await invoke<FileInfo[]>('list_directory', { path });

      // Filter out hidden files and directories
      const filtered = result.filter(f => !f.name.startsWith('.'));

      setFiles(prev => {
        const newFiles = [...prev.filter(f => !f.path.startsWith(path + '/')), ...filtered];
        return newFiles;
      });
    } catch (err) {
      console.error('Failed to load directory:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleDirectory = async (dirPath: string) => {
    const newExpanded = new Set(expandedDirs);
    if (newExpanded.has(dirPath)) {
      newExpanded.delete(dirPath);
    } else {
      newExpanded.add(dirPath);
      await loadDirectory(dirPath);
    }
    setExpandedDirs(newExpanded);
  };

  const renderFileTree = (basePath: string, level: number = 0): JSX.Element[] => {
    const items = files.filter(f => {
      const parentPath = f.path.substring(0, f.path.lastIndexOf('/'));
      return parentPath === basePath;
    });

    return items.map(file => {
      const isExpanded = expandedDirs.has(file.path);
      const isSelected = selectedFile === file.path;
      const isEditable = file.name.endsWith('.ts') ||
        file.name.endsWith('.tsx') ||
        file.name.endsWith('.js') ||
        file.name.endsWith('.jsx') ||
        file.name.endsWith('.json');

      return (
        <div key={file.path}>
          <div
            className={`
              flex items-center gap-1.5 px-2 py-1 cursor-pointer hover:bg-white/5 rounded transition-colors
              ${isSelected ? 'bg-primary/20 text-white' : 'text-text-secondary'}
            `}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => {
              if (file.is_directory) {
                toggleDirectory(file.path);
              } else if (isEditable) {
                onFileSelect(file.path);
              }
            }}
          >
            {file.is_directory ? (
              <>
                <span className="w-3 text-text-tertiary">
                  {isExpanded ? <ChevronDownIcon size={12} /> : <ChevronRightIcon size={12} />}
                </span>
                <FolderIcon size={14} className={isExpanded ? 'text-yellow-400' : 'text-yellow-500/80'} />
              </>
            ) : (
              <>
                <span className="w-3" />
                <FileIcon size={14} className="text-text-tertiary" />
              </>
            )}
            <span className={`text-sm truncate flex-1 ${isSelected ? 'font-medium' : ''}`} title={file.name}>
              {file.name}
            </span>
          </div>
          {file.is_directory && isExpanded && renderFileTree(file.path, level + 1)}
        </div>
      );
    });
  };

  if (!projectPath) {
    return (
      <div className="text-sm text-text-tertiary text-center py-4">
        No project open
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-panel">
      <div className="flex-1 py-2 px-2">
        {loading && files.length === 0 ? (
          <div className="text-sm text-text-tertiary text-center py-4">Loading...</div>
        ) : (
          renderFileTree(projectPath)
        )}
      </div>
    </div>
  );
}
