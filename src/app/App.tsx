import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { TrajectoryTimeline } from './components/TrajectoryTimeline';
import { MetadataView } from './components/MetadataView';
import { Card } from './components/ui/card';
import { AlertCircle, ChevronDown, ChevronRight, FileCode2 } from 'lucide-react';

interface TrajectoryFile {
  id: string;
  name: string;
  data: any[];
  uploadedAt: Date;
}

export default function App() {
  const [loadedFiles, setLoadedFiles] = useState<TrajectoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<TrajectoryFile | null>(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const handleFilesLoaded = (files: TrajectoryFile[]) => {
    setLoadedFiles(files);
    // Auto-select the first file if none selected
    if (!selectedFile && files.length > 0) {
      setSelectedFile(files[files.length - 1]);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    const newFiles = loadedFiles.filter((f) => f.id !== fileId);
    setLoadedFiles(newFiles);
    if (selectedFile?.id === fileId) {
      setSelectedFile(newFiles.length > 0 ? newFiles[0] : null);
    }
  };

  const iterations = selectedFile?.data.filter((item) => item.type === 'iteration') || [];
  const metadata = selectedFile?.data.find((item) => item.type === 'metadata') || null;
  const trajectoryQuery =
    iterations[0]?.result?.context ||
    iterations[0]?.code_blocks?.[0]?.result?.locals?.context ||
    '';
  const systemPrompt =
    iterations[0]?.prompt?.find((message: { role: string; content: string }) => message.role === 'system')
      ?.content || '';

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-lg border border-green-500/30">
              <FileCode2 className="size-6 text-green-400" />
            </div>
            <div>
              <h1 className="text-xl text-gray-100 flex items-center gap-2">
                <span className="font-mono">rlm_execution.log</span>
              </h1>
              <p className="text-sm text-gray-400">
                Recursive Language Model Trajectory
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar - File Upload */}
          <div className="lg:col-span-1">
            <FileUpload
              onFilesLoaded={handleFilesLoaded}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              loadedFiles={loadedFiles}
              onRemoveFile={handleRemoveFile}
            />
          </div>

          {/* Main Content Area - Trajectory */}
          <div className="lg:col-span-2">
            {selectedFile ? (
              <div className="space-y-4">
                {/* Metadata */}
                <MetadataView metadata={metadata} query={trajectoryQuery} />

                {/* Trajectory Timeline */}
                {iterations.length > 0 ? (
                  <div className="h-[calc(100vh-180px)] overflow-y-auto pr-4">
                    <TrajectoryTimeline iterations={iterations} />
                  </div>
                ) : (
                  <Card className="p-8 bg-gray-900 border-gray-700">
                    <div className="flex flex-col items-center justify-center gap-3 text-center text-gray-400">
                      <AlertCircle className="size-12" />
                      <div>
                        <p>No iterations found in this file</p>
                        <p className="text-sm">
                          Make sure the JSONL file contains iteration data
                        </p>
                      </div>
                    </div>
                  </Card>
                )}
              </div>
            ) : (
              <Card className="p-12 bg-gray-900 border-gray-700">
                <div className="flex flex-col items-center justify-center gap-4 text-center text-gray-400">
                  <div className="p-4 bg-gray-800 rounded-full">
                    <FileCode2 className="size-12" />
                  </div>
                  <div>
                    <h3 className="mb-2 text-gray-300">No Trajectory Selected</h3>
                    <p className="text-sm">
                      Upload JSONL files to start visualizing RLM trajectories
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {selectedFile && systemPrompt && (
        <div className="fixed bottom-4 left-4 z-20 w-[min(420px,calc(100vw-2rem))]">
          <Card className="bg-gray-900/95 border-gray-700 backdrop-blur-sm p-3">
            <button
              type="button"
              className="w-full flex items-center justify-between text-left text-gray-200"
              onClick={() => setShowSystemPrompt((prev) => !prev)}
            >
              <span className="text-sm font-mono">System Prompt</span>
              {showSystemPrompt ? (
                <ChevronDown className="size-4 text-gray-400" />
              ) : (
                <ChevronRight className="size-4 text-gray-400" />
              )}
            </button>
            {showSystemPrompt && (
              <div className="mt-3 max-h-72 overflow-auto rounded-md border border-gray-800 bg-gray-950 p-3">
                <pre className="m-0 text-xs text-gray-300 whitespace-pre-wrap">
                  {systemPrompt}
                </pre>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
