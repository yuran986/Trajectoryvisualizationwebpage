import React from 'react';
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Info, Database, Layers, Clock } from 'lucide-react';

interface MetadataProps {
  metadata: {
    type: string;
    timestamp?: string;
    root_model?: string;
    max_depth?: number;
    max_iterations?: number;
    backend?: string;
    environment_type?: string;
    [key: string]: any;
  } | null;
}

export function MetadataView({ metadata }: MetadataProps) {
  if (!metadata) return null;

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  return (
    <Card className="p-4 mb-4 bg-gray-900 border-gray-700">
      <div className="flex items-center gap-2 mb-3">
        <Info className="size-5 text-blue-400" />
        <h3 className="text-gray-200">Trajectory Metadata</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
        {metadata.root_model && (
          <div className="flex items-start gap-2">
            <Database className="size-4 mt-0.5 text-gray-400" />
            <div>
              <p className="text-gray-400">Model</p>
              <p className="font-mono text-gray-200">{metadata.root_model}</p>
            </div>
          </div>
        )}

        {metadata.backend && (
          <div className="flex items-start gap-2">
            <Layers className="size-4 mt-0.5 text-gray-400" />
            <div>
              <p className="text-gray-400">Backend</p>
              <p className="font-mono text-gray-200">{metadata.backend}</p>
            </div>
          </div>
        )}

        {metadata.environment_type && (
          <div className="flex items-start gap-2">
            <Layers className="size-4 mt-0.5 text-gray-400" />
            <div>
              <p className="text-gray-400">Environment</p>
              <p className="font-mono text-gray-200">{metadata.environment_type}</p>
            </div>
          </div>
        )}

        {metadata.max_iterations !== undefined && (
          <div className="flex items-start gap-2">
            <Info className="size-4 mt-0.5 text-gray-400" />
            <div>
              <p className="text-gray-400">Max Iterations</p>
              <Badge variant="outline" className="border-gray-600 text-gray-300">{metadata.max_iterations}</Badge>
            </div>
          </div>
        )}

        {metadata.max_depth !== undefined && (
          <div className="flex items-start gap-2">
            <Info className="size-4 mt-0.5 text-gray-400" />
            <div>
              <p className="text-gray-400">Max Depth</p>
              <Badge variant="outline" className="border-gray-600 text-gray-300">{metadata.max_depth}</Badge>
            </div>
          </div>
        )}

        {metadata.timestamp && (
          <div className="flex items-start gap-2">
            <Clock className="size-4 mt-0.5 text-gray-400" />
            <div>
              <p className="text-gray-400">Started</p>
              <p className="text-xs text-gray-300">{formatTimestamp(metadata.timestamp)}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}