import React from 'react';
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Info, Database, Layers, Clock, MessageSquare } from 'lucide-react';

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
  query?: unknown;
}

export function MetadataView({ metadata, query = '' }: MetadataProps) {
  if (!metadata) return null;

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const formatQuery = (value: unknown): string => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  };

  const queryText = formatQuery(query);

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

      {queryText && (
        <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
          <div className="flex items-center gap-2 text-gray-400">
            <MessageSquare className="size-4" />
            <span className="text-sm">Query</span>
          </div>
          <div className="overflow-x-auto">
            <pre className="m-0 text-sm text-gray-300 whitespace-pre font-mono leading-relaxed">
              {queryText}
            </pre>
          </div>
        </div>
      )}
    </Card>
  );
}
