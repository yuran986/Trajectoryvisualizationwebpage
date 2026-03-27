import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ChevronDown, ChevronRight, Code2, Terminal, Zap, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';

interface CodeBlock {
  code: string;
  result: {
    stdout: string;
    stderr: string;
    locals: Record<string, any>;
    execution_time: number;
    rlm_calls: any[];
  };
}

interface IterationData {
  type: string;
  iteration: number;
  timestamp: string;
  prompt: Array<{ role: string; content: string }>;
  response: string;
  code_blocks: CodeBlock[];
  final_answer: any;
  iteration_time: number;
  completion_id?: number;
  completion_iteration?: number;
}

interface TrajectoryTimelineProps {
  iterations: IterationData[];
}

const DepthBadge = ({ depth }: { depth: number }) => {
  const colors = [
    'bg-green-500/20 text-green-400 border-green-500/50',
    'bg-blue-500/20 text-blue-400 border-blue-500/50',
    'bg-purple-500/20 text-purple-400 border-purple-500/50',
    'bg-orange-500/20 text-orange-400 border-orange-500/50',
    'bg-pink-500/20 text-pink-400 border-pink-500/50',
  ];
  
  return (
    <Badge className={`${colors[depth % colors.length]} border font-mono`}>
      depth={depth}
    </Badge>
  );
};

const clampByLines = (text: string, maxLines = 4) => {
  const lines = text.split('\n');
  const isClamped = lines.length > maxLines;
  return {
    text: isClamped ? lines.slice(0, maxLines).join('\n') : text,
    isClamped,
  };
};

const stripLeadingBlankLines = (text: string) => text.replace(/^(?:[ \t]*\n)+/, '');
const stripReplCodeBlocks = (text: string) =>
  text.replace(/```repl[\s\S]*?```/gi, '').replace(/\n{3,}/g, '\n\n');

const IterationCard = ({ iteration, index }: { iteration: IterationData; index: number }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isResponseExpanded, setIsResponseExpanded] = useState(false);
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState<Set<number>>(new Set());
  const [expandedOutputs, setExpandedOutputs] = useState<Set<number>>(new Set());

  const toggleCodeExpand = (blockIndex: number) => {
    const next = new Set(expandedCodeBlocks);
    if (next.has(blockIndex)) {
      next.delete(blockIndex);
    } else {
      next.add(blockIndex);
    }
    setExpandedCodeBlocks(next);
  };

  const toggleOutputExpand = (blockIndex: number) => {
    const next = new Set(expandedOutputs);
    if (next.has(blockIndex)) {
      next.delete(blockIndex);
    } else {
      next.add(blockIndex);
    }
    setExpandedOutputs(next);
  };

  const normalizedResponse = stripLeadingBlankLines(
    stripReplCodeBlocks(iteration.response || '')
  ).trim();
  const hasVisibleResponse = normalizedResponse.length > 0;
  const displayedResponse = isResponseExpanded
    ? normalizedResponse
    : clampByLines(normalizedResponse).text;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="relative"
    >
      {/* Timeline connector */}
      {index > 0 && (
        <div className="absolute left-6 -top-4 w-0.5 h-4 bg-gradient-to-b from-green-500/50 to-transparent" />
      )}
      
      <Card className="bg-gray-900 border-gray-700/50 overflow-hidden">
        {/* Header */}
        <div 
          className="bg-gray-800/50 border-b border-gray-700/50 p-4 cursor-pointer hover:bg-gray-800/70 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isExpanded ? (
                  <ChevronDown className="size-5 text-gray-400" />
                ) : (
                  <ChevronRight className="size-5 text-gray-400" />
                )}
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 border font-mono">
                  Iteration {iteration.iteration}
                </Badge>
                {typeof iteration.completion_iteration === "number" && (
                  <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/50 border font-mono">
                    step {iteration.completion_iteration}
                  </Badge>
                )}
                <DepthBadge depth={0} />
              </div>
              <span className="text-blue-400 font-mono">RLM Call</span>
              {iteration.final_answer && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/50 border flex items-center gap-1">
                  <CheckCircle2 className="size-3" />
                  Complete
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span className="font-mono">{iteration.iteration_time.toFixed(2)}s</span>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="p-6 space-y-4">
            {/* Response */}
            {hasVisibleResponse && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <Code2 className="size-4" />
                  <span className="text-sm">Response:</span>
                </div>
                <div className="pl-6 border-l-2 border-gray-700 ml-2">
                  <div className="overflow-x-auto max-w-full" style={{ overflowX: 'auto' }}>
                    <pre className="m-0 text-sm text-gray-300 whitespace-pre font-mono inline-block min-w-full w-max">
                      {displayedResponse}
                    </pre>
                  </div>
                  {clampByLines(normalizedResponse).isClamped && (
                    <button
                      type="button"
                      className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                      onClick={() => setIsResponseExpanded(!isResponseExpanded)}
                    >
                      {isResponseExpanded ? 'Collapse' : 'Expand'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Code Blocks */}
            {iteration.code_blocks?.map((block, blockIndex) => (
              <div key={blockIndex} className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <Code2 className="size-4" />
                  <span className="text-sm">Code Block {blockIndex + 1}</span>
                  {block.result.execution_time && (
                    <span className="text-xs font-mono">
                      ({block.result.execution_time.toFixed(3)}s)
                    </span>
                  )}
                </div>
                <div className="pl-6 border-l-2 border-blue-500/50 ml-2 space-y-3">
                  {/* Code */}
                  <div
                    className="rounded-lg border border-gray-700/50 overflow-x-auto max-w-full"
                    style={{ overflowX: 'auto' }}
                  >
                    <div className="min-w-max">
                      <SyntaxHighlighter
                        language="python"
                        style={vscDarkPlus}
                        wrapLongLines={false}
                        codeTagProps={{ style: { whiteSpace: 'pre' } }}
                        customStyle={{
                          margin: 0,
                          background: '#1a1a1a',
                          fontSize: '0.875rem',
                          whiteSpace: 'pre',
                          minWidth: '100%',
                          width: 'max-content',
                        }}
                      >
                        {expandedCodeBlocks.has(blockIndex)
                          ? block.code
                          : clampByLines(block.code).text}
                      </SyntaxHighlighter>
                    </div>
                  </div>
                  {clampByLines(block.code).isClamped && (
                    <button
                      type="button"
                      className="text-xs text-blue-400 hover:text-blue-300"
                      onClick={() => toggleCodeExpand(blockIndex)}
                    >
                      {expandedCodeBlocks.has(blockIndex) ? 'Collapse' : 'Expand'}
                    </button>
                  )}

                  {/* Stdout Output */}
                  {block.result.stdout && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <Terminal className="size-4" />
                        <span>Output:</span>
                      </div>
                      <div
                        className="bg-black/50 rounded-lg p-3 border border-green-500/20 overflow-x-auto max-w-full"
                        style={{ overflowX: 'auto' }}
                      >
                        <pre className="m-0 text-sm text-green-400/90 whitespace-pre font-mono inline-block min-w-full w-max">
                          {expandedOutputs.has(blockIndex)
                            ? block.result.stdout
                            : clampByLines(block.result.stdout).text}
                        </pre>
                        {clampByLines(block.result.stdout).isClamped && (
                          <button
                            type="button"
                            className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                            onClick={() => toggleOutputExpand(blockIndex)}
                          >
                            {expandedOutputs.has(blockIndex) ? 'Collapse' : 'Expand'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* RLM Calls Indicator */}
                  {block.result.rlm_calls && block.result.rlm_calls.length > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-purple-400 text-sm">
                        <Zap className="size-4" />
                        <span>Spawning recursive call for detailed analysis...</span>
                      </div>
                      <div className="bg-purple-500/10 rounded-lg p-3 border border-purple-500/30">
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <CheckCircle2 className="size-4" />
                          <span>Received result from depth={iteration.iteration} call</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Stderr */}
                  {block.result.stderr && (
                    <div
                      className="bg-red-500/10 rounded-lg p-3 border border-red-500/30 overflow-x-auto max-w-full"
                      style={{ overflowX: 'auto' }}
                    >
                      <pre className="m-0 text-sm text-red-400 whitespace-pre font-mono inline-block min-w-full w-max">
                        {block.result.stderr}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Final Answer */}
            {iteration.final_answer && (
              <div className="space-y-2 mt-4">
                <div className="flex items-center gap-2 text-green-400">
                  <CheckCircle2 className="size-4" />
                  <span className="text-sm font-semibold">Final Answer:</span>
                </div>
                <div className="pl-6 border-l-2 border-green-500 ml-2">
                  <div
                    className="bg-green-500/10 rounded-lg p-4 border border-green-500/30 overflow-x-auto max-w-full"
                    style={{ overflowX: 'auto' }}
                  >
                    <pre className="m-0 text-sm text-green-300 whitespace-pre font-mono inline-block min-w-full w-max">
                      {typeof iteration.final_answer === 'string'
                        ? iteration.final_answer
                        : JSON.stringify(iteration.final_answer, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
};

export function TrajectoryTimeline({ iterations }: TrajectoryTimelineProps) {
  const groups = (() => {
    const grouped: Array<{
      key: string;
      completionId: number | null;
      items: IterationData[];
    }> = [];
    const indexByKey = new Map<string, number>();

    iterations.forEach((iteration, idx) => {
      const hasCompletionId = typeof iteration.completion_id === "number";
      const key = hasCompletionId ? `c:${iteration.completion_id}` : `legacy:${idx}`;
      const completionId = hasCompletionId ? (iteration.completion_id as number) : null;
      const existing = indexByKey.get(key);
      if (existing === undefined) {
        indexByKey.set(key, grouped.length);
        grouped.push({ key, completionId, items: [iteration] });
      } else {
        grouped[existing].items.push(iteration);
      }
    });

    return grouped;
  })();

  return (
    <div className="space-y-6">
      {groups.map((group, groupIdx) => (
        <div key={group.key} className="space-y-3">
          {group.completionId !== null && (
            <div className="sticky top-0 z-10">
              <div className="inline-flex items-center gap-2 rounded-md border border-gray-700 bg-gray-900/90 px-3 py-1 backdrop-blur-sm">
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/50 border font-mono">
                  Completion {group.completionId}
                </Badge>
                <span className="text-xs text-gray-400">
                  {group.items.length} iterations
                </span>
              </div>
            </div>
          )}
          {group.items.map((iteration, itemIdx) => (
            <IterationCard
              key={`${group.key}-${iteration.iteration}-${itemIdx}`}
              iteration={iteration}
              index={groupIdx === 0 ? itemIdx : itemIdx + 1}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
