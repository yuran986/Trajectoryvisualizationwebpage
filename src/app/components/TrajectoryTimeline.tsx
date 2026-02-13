import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ChevronDown, ChevronRight, MessageSquare, Code2, Terminal, Zap, CheckCircle2 } from 'lucide-react';
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

const IterationCard = ({ iteration, index }: { iteration: IterationData; index: number }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [expandedBlocks, setExpandedBlocks] = useState<Set<number>>(new Set([0]));

  const toggleBlock = (blockIndex: number) => {
    const newExpanded = new Set(expandedBlocks);
    if (newExpanded.has(blockIndex)) {
      newExpanded.delete(blockIndex);
    } else {
      newExpanded.add(blockIndex);
    }
    setExpandedBlocks(newExpanded);
  };

  // Extract query from prompt
  const userMessage = iteration.prompt?.find(m => m.role === 'user');
  const query = userMessage?.content || '';

  const hasRLMCalls = iteration.code_blocks?.some(block => 
    block.result.rlm_calls && block.result.rlm_calls.length > 0
  );

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
            {/* Query */}
            {query && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <MessageSquare className="size-4" />
                  <span className="text-sm">Query:</span>
                </div>
                <div className="pl-6 text-gray-300 text-sm border-l-2 border-gray-700 ml-2">
                  "{query.substring(0, 200)}{query.length > 200 ? '...' : ''}"
                </div>
              </div>
            )}

            {/* Response */}
            {iteration.response && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400">
                  <Code2 className="size-4" />
                  <span className="text-sm">Response:</span>
                </div>
                <div className="pl-6 border-l-2 border-gray-700 ml-2">
                  <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                    {iteration.response}
                  </pre>
                </div>
              </div>
            )}

            {/* Code Blocks */}
            {iteration.code_blocks?.map((block, blockIndex) => (
              <div key={blockIndex} className="space-y-2">
                <div 
                  className="flex items-center gap-2 text-gray-400 cursor-pointer hover:text-gray-300"
                  onClick={() => toggleBlock(blockIndex)}
                >
                  {expandedBlocks.has(blockIndex) ? (
                    <ChevronDown className="size-4" />
                  ) : (
                    <ChevronRight className="size-4" />
                  )}
                  <Code2 className="size-4" />
                  <span className="text-sm">Code Block {blockIndex + 1}</span>
                  {block.result.execution_time && (
                    <span className="text-xs font-mono">
                      ({block.result.execution_time.toFixed(3)}s)
                    </span>
                  )}
                </div>

                {expandedBlocks.has(blockIndex) && (
                  <div className="pl-6 border-l-2 border-blue-500/50 ml-2 space-y-3">
                    {/* Code */}
                    <div className="rounded-lg overflow-hidden border border-gray-700/50">
                      <SyntaxHighlighter
                        language="python"
                        style={vscDarkPlus}
                        customStyle={{
                          margin: 0,
                          background: '#1a1a1a',
                          fontSize: '0.875rem',
                        }}
                      >
                        {block.code}
                      </SyntaxHighlighter>
                    </div>

                    {/* Stdout Output */}
                    {block.result.stdout && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-green-400 text-sm">
                          <Terminal className="size-4" />
                          <span>Output:</span>
                        </div>
                        <div className="bg-black/50 rounded-lg p-3 border border-green-500/20">
                          <pre className="text-sm text-green-400/90 whitespace-pre-wrap font-mono">
                            {block.result.stdout}
                          </pre>
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
                      <div className="bg-red-500/10 rounded-lg p-3 border border-red-500/30">
                        <pre className="text-sm text-red-400 whitespace-pre-wrap font-mono">
                          {block.result.stderr}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
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
                  <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                    <pre className="text-sm text-green-300 whitespace-pre-wrap">
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
  return (
    <div className="space-y-6">
      {iterations.map((iteration, index) => (
        <IterationCard key={index} iteration={iteration} index={index} />
      ))}
    </div>
  );
}