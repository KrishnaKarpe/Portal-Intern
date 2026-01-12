import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, File } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileNode {
  name: string;
  type: 'folder' | 'file';
  children?: FileNode[];
}

interface FileTreeProps {
  data: FileNode[];
  onFileSelect?: (path: string) => void;
  selectedPath?: string;
}

const FileTreeItem: React.FC<{
  node: FileNode;
  level: number;
  path: string;
  onFileSelect?: (path: string) => void;
  selectedPath?: string;
}> = ({ node, level, path, onFileSelect, selectedPath }) => {
  const [isOpen, setIsOpen] = useState(level < 2); // Auto-expand first 2 levels
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedPath === path;

  const handleClick = () => {
    if (node.type === 'folder' && hasChildren) {
      setIsOpen(!isOpen);
    } else if (node.type === 'file' && onFileSelect) {
      onFileSelect(path);
    }
  };

  return (
    <div>
      <div
        onClick={handleClick}
        className={cn(
          "flex items-center gap-1 px-2 py-1 text-sm cursor-pointer hover:bg-gray-100 rounded",
          isSelected && "bg-blue-100 text-blue-700",
          node.type === 'file' && "ml-4"
        )}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
      >
        {node.type === 'folder' && hasChildren && (
          <span className="w-4 h-4 flex items-center justify-center">
            {isOpen ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </span>
        )}
        {node.type === 'folder' && !hasChildren && <span className="w-4" />}
        {node.type === 'folder' ? (
          <Folder className="w-4 h-4 text-blue-500" />
        ) : (
          <File className="w-4 h-4 text-gray-500" />
        )}
        <span className="ml-1">{node.name}</span>
      </div>
      {isOpen && hasChildren && (
        <div>
          {node.children!.map((child, index) => (
            <FileTreeItem
              key={index}
              node={child}
              level={level + 1}
              path={`${path}/${child.name}`}
              onFileSelect={onFileSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileTree: React.FC<FileTreeProps> = ({ data, onFileSelect, selectedPath }) => {
  return (
    <div className="h-full overflow-y-auto">
      {data.map((node, index) => (
        <FileTreeItem
          key={index}
          node={node}
          level={0}
          path={node.name}
          onFileSelect={onFileSelect}
          selectedPath={selectedPath}
        />
      ))}
    </div>
  );
};

// Helper function to build file tree from proxy structure
// This is a template structure - in production, this would be fetched from the API
export const buildProxyFileTree = (proxyName: string, customStructure?: FileNode[]): FileNode[] => {
  // If custom structure is provided, use it
  if (customStructure) {
    return customStructure;
  }

  // Default structure based on the example provided
  return [
    {
      name: 'apiproxy',
      type: 'folder',
      children: [
        {
          name: 'policies',
          type: 'folder',
          children: [
            { name: 'AM-InvalidAPIKey.xml', type: 'file' },
            { name: 'FC-Syng-ErrorHandling.xml', type: 'file' },
            { name: 'FC-Syng-IS-Auth.xml', type: 'file' },
            { name: 'FC-Syng-Logging.xml', type: 'file' },
            { name: 'FC-Syng-Preflow.xml', type: 'file' },
            { name: 'RF-APINotFound.xml', type: 'file' },
          ],
        },
        {
          name: 'proxies',
          type: 'folder',
          children: [
            { name: 'default.xml', type: 'file' },
          ],
        },
        {
          name: 'targets',
          type: 'folder',
          children: [
            { name: 'dynamicsoql.xml', type: 'file' },
          ],
        },
        {
          name: `${proxyName}.xml`,
          type: 'file',
        },
      ],
    },
  ];
};

