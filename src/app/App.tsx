import { useEffect, useMemo, useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { TrajectoryTimeline } from './components/TrajectoryTimeline';
import { MetadataView } from './components/MetadataView';
import { Card } from './components/ui/card';
import { AlertCircle, ChevronDown, ChevronRight, FileCode2 } from 'lucide-react';
import { ArgAgiFrameRecord, ArgAgiFrameViewer } from './components/ArgAgiFrameViewer';

interface TrajectoryFile {
  id: string;
  name: string;
  data: any[];
  uploadedAt: Date;
}

type LiveStatus = 'idle' | 'waiting' | 'ok' | 'error';

const LIVE_FEED_URL = '/@fs/home/users/yz1051/rlm/arg-agi/log_frame/arg_agi_live_latest.json';
const LIVE_POLL_MS = 1000;

function parseTimestampFromFileName(name: string): number | null {
  const match = name.match(/(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})/);
  if (!match) {
    return null;
  }
  const [, day, hh, mm, ss] = match;
  const iso = `${day}T${hh}:${mm}:${ss}`;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? null : parsed;
}

function firstTimestampFromData(data: any[]): number | null {
  for (const item of data) {
    const timestamp = item?.timestamp;
    if (typeof timestamp !== 'string') {
      continue;
    }
    const parsed = Date.parse(timestamp);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return null;
}

export default function App() {
  const [loadedFiles, setLoadedFiles] = useState<TrajectoryFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<TrajectoryFile | null>(null);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const [liveRecord, setLiveRecord] = useState<ArgAgiFrameRecord | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>('idle');

  useEffect(() => {
    let cancelled = false;

    const pollLiveFeed = async () => {
      try {
        const response = await fetch(`${LIVE_FEED_URL}?t=${Date.now()}`, {
          cache: 'no-store',
        });

        if (response.status === 404) {
          if (!cancelled) {
            setLiveStatus('waiting');
          }
          return;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const payload = await response.json();
        const record = payload?.type === 'arg_agi_frame' ? payload : payload?.record;
        if (!cancelled && record?.type === 'arg_agi_frame') {
          setLiveRecord(record as ArgAgiFrameRecord);
          setLiveStatus('ok');
        }
      } catch {
        if (!cancelled) {
          setLiveStatus('error');
        }
      }
    };

    pollLiveFeed();
    const timer = window.setInterval(pollLiveFeed, LIVE_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const liveStatusBadge =
    liveStatus === 'ok'
      ? 'live'
      : liveStatus === 'waiting'
        ? 'waiting'
        : liveStatus === 'error'
          ? 'error'
          : 'idle';

  const handleFilesLoaded = (files: TrajectoryFile[]) => {
    setLoadedFiles(files);
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

  const argAgiFrames = useMemo(
    () => (selectedFile?.data.filter((item) => item.type === 'arg_agi_frame') as ArgAgiFrameRecord[]) || [],
    [selectedFile]
  );
  const isArgAgiFrameFile = argAgiFrames.length > 0;
  const pairedArgAgiFrames = useMemo(() => {
    if (!selectedFile || isArgAgiFrameFile) {
      return [] as ArgAgiFrameRecord[];
    }

    const candidates = loadedFiles
      .filter((file) => file.id !== selectedFile.id)
      .map((file) => ({
        file,
        frames: file.data.filter((item) => item.type === 'arg_agi_frame') as ArgAgiFrameRecord[],
      }))
      .filter((entry) => entry.frames.length > 0);

    if (candidates.length === 0) {
      return [] as ArgAgiFrameRecord[];
    }

    const selectedTs =
      parseTimestampFromFileName(selectedFile.name) ?? firstTimestampFromData(selectedFile.data);

    if (selectedTs === null) {
      return candidates[0].frames;
    }

    let bestFrames = candidates[0].frames;
    let bestDistance = Number.POSITIVE_INFINITY;

    candidates.forEach(({ file, frames }) => {
      const frameTs = parseTimestampFromFileName(file.name) ?? firstTimestampFromData(file.data);
      if (frameTs === null) {
        return;
      }
      const distance = Math.abs(frameTs - selectedTs);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestFrames = frames;
      }
    });

    return bestFrames;
  }, [loadedFiles, selectedFile, isArgAgiFrameFile]);

  const trajectoryQuery =
    iterations[0]?.result?.context ||
    iterations[0]?.code_blocks?.[0]?.result?.locals?.context ||
    '';

  const systemPrompt =
    iterations[0]?.prompt?.find((message: { role: string; content: string }) => message.role === 'system')
      ?.content || '';

  return (
    <div className="min-h-screen bg-gray-950">
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
              <p className="text-sm text-gray-400">Recursive Language Model Trajectory</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <FileUpload
              onFilesLoaded={handleFilesLoaded}
              selectedFile={selectedFile}
              onSelectFile={setSelectedFile}
              loadedFiles={loadedFiles}
              onRemoveFile={handleRemoveFile}
            />
          </div>

          <div className="lg:col-span-2 space-y-4">
            <ArgAgiFrameViewer
              title="ARG-AGI Live Monitor"
              compact
              records={liveRecord ? [liveRecord] : []}
              statusBadge={liveStatusBadge}
              emptyMessage="Live feed not detected yet. Start arg-agi runner to publish rlm/arg-agi/log_frame/arg_agi_live_latest.json."
            />

            {selectedFile ? (
              <div className="space-y-4">
                {isArgAgiFrameFile ? (
                  <ArgAgiFrameViewer
                    title={`ARG-AGI Offline Playback: ${selectedFile.name}`}
                    records={argAgiFrames}
                    emptyMessage="This file does not contain arg_agi_frame records."
                  />
                ) : (
                  <>
                    <MetadataView metadata={metadata} query={trajectoryQuery} />

                    {iterations.length > 0 ? (
                      <div className="h-[calc(100vh-260px)] overflow-y-auto pr-4">
                        <TrajectoryTimeline iterations={iterations} argAgiFrames={pairedArgAgiFrames} />
                      </div>
                    ) : (
                      <Card className="p-8 bg-gray-900 border-gray-700">
                        <div className="flex flex-col items-center justify-center gap-3 text-center text-gray-400">
                          <AlertCircle className="size-12" />
                          <div>
                            <p>No iterations found in this file</p>
                            <p className="text-sm">Make sure the JSONL file contains iteration data</p>
                          </div>
                        </div>
                      </Card>
                    )}
                  </>
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
                    <p className="text-sm">Upload JSONL files to start visualizing RLM trajectories</p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {selectedFile && !isArgAgiFrameFile && systemPrompt && (
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
                <pre className="m-0 text-xs text-gray-300 whitespace-pre-wrap">{systemPrompt}</pre>
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
