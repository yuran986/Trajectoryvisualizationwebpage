import React, { useState } from 'react';
import { Button } from "./ui/button";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Upload, FileJson, X, Trash2 } from 'lucide-react';
import { ScrollArea } from "./ui/scroll-area";

interface TrajectoryFile {
  id: string;
  name: string;
  data: any[];
  uploadedAt: Date;
}

interface FileUploadProps {
  onFilesLoaded: (files: TrajectoryFile[]) => void;
  selectedFile: TrajectoryFile | null;
  onSelectFile: (file: TrajectoryFile) => void;
  loadedFiles: TrajectoryFile[];
  onRemoveFile: (fileId: string) => void;
}

export function FileUpload({
  onFilesLoaded,
  selectedFile,
  onSelectFile,
  loadedFiles,
  onRemoveFile,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileRead = async (files: FileList) => {
    const newFiles: TrajectoryFile[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.name.endsWith('.jsonl')) {
        try {
          const text = await file.text();
          // Parse JSONL format (one JSON object per line)
          const lines = text.split('\n').filter(line => line.trim());
          const parsedData = lines.map(line => JSON.parse(line));

          newFiles.push({
            id: `${file.name}-${Date.now()}-${i}`,
            name: file.name,
            data: parsedData,
            uploadedAt: new Date(),
          });
        } catch (error) {
          console.error(`Error parsing ${file.name}:`, error);
          alert(`Failed to parse ${file.name}. Please ensure it's valid JSONL format.`);
        }
      }
    }

    if (newFiles.length > 0) {
      onFilesLoaded([...loadedFiles, ...newFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      handleFileRead(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileRead(e.target.files);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <Card
        className={`p-8 border-2 border-dashed transition-colors bg-gray-900 ${
          isDragging
            ? 'border-green-500 bg-green-500/5'
            : 'border-gray-700'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div className="p-4 bg-gray-800 rounded-full">
            <Upload className="size-8 text-gray-400" />
          </div>
          <div>
            <h3 className="mb-2 text-gray-200">Upload Trajectory JSONL Files</h3>
            <p className="text-sm text-gray-400 mb-4">
              Drag and drop JSONL files here, or click to browse
            </p>
          </div>
          <label htmlFor="file-upload">
            <Button type="button" asChild className="bg-green-600 hover:bg-green-700 text-white">
              <span>
                <FileJson className="size-4 mr-2" />
                Select Files
              </span>
            </Button>
            <input
              id="file-upload"
              type="file"
              multiple
              accept=".jsonl"
              onChange={handleFileInput}
              className="hidden"
            />
          </label>
        </div>
      </Card>

      {/* Loaded Files List */}
      {loadedFiles.length > 0 && (
        <Card className="p-4 bg-gray-900 border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-gray-200">Loaded Trajectories</h3>
            <Badge variant="secondary" className="bg-gray-800 text-gray-300">{loadedFiles.length} files</Badge>
          </div>
          <ScrollArea className="max-h-[300px]">
            <div className="space-y-2">
              {loadedFiles.map((file) => (
                <div
                  key={file.id}
                  className={`flex items-center justify-between p-3 rounded-md border cursor-pointer transition-colors ${
                    selectedFile?.id === file.id
                      ? 'border-green-500 bg-green-500/10'
                      : 'border-gray-700 hover:bg-gray-800'
                  }`}
                  onClick={() => onSelectFile(file)}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileJson className="size-4 text-gray-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate text-gray-200">{file.name}</p>
                      <p className="text-xs text-gray-400">
                        {file.data.length} iterations • Uploaded{' '}
                        {file.uploadedAt.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFile(file.id);
                    }}
                    className="ml-2 shrink-0 hover:bg-gray-800"
                  >
                    <Trash2 className="size-4 text-red-400" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
}