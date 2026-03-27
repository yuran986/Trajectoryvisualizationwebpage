import React from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./ui/accordion";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Clock, Code, Terminal, MessageSquare } from 'lucide-react';

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

interface IterationViewProps {
  iteration: IterationData;
}

const stripReplCodeBlocks = (text: string) =>
  text.replace(/```repl[\s\S]*?```/gi, '').replace(/\n{3,}/g, '\n\n').trim();

export function IterationView({ iteration }: IterationViewProps) {
  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatTime = (time: number) => {
    return `${time.toFixed(3)}s`;
  };
  const filteredResponse = stripReplCodeBlocks(iteration.response || '');

  return (
    <Card className="p-6 mb-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl">Iteration {iteration.iteration}</h2>
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="size-3" />
            {formatTime(iteration.iteration_time)}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          {formatTimestamp(iteration.timestamp)}
        </span>
      </div>

      <Accordion type="multiple" className="w-full">
        {/* Response Section */}
        {filteredResponse && (
          <AccordionItem value="response">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4" />
                <span>Response</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="p-4 bg-muted/50 rounded-md overflow-x-auto max-w-full" style={{ overflowX: 'auto' }}>
                <pre className="whitespace-pre text-sm font-mono inline-block min-w-full w-max">
                  {filteredResponse}
                </pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Code Blocks Section */}
        {iteration.code_blocks && iteration.code_blocks.length > 0 && (
          <AccordionItem value="code-blocks">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <Code className="size-4" />
                <span>Code Blocks ({iteration.code_blocks.length})</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-4">
                {iteration.code_blocks.map((block, index) => (
                  <div key={index} className="border rounded-md overflow-hidden">
                    <div className="bg-muted px-4 py-2 flex items-center justify-between">
                      <span className="text-sm">Code Block {index + 1}</span>
                      {block.result.execution_time && (
                        <Badge variant="secondary" className="text-xs">
                          {formatTime(block.result.execution_time)}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="p-0 overflow-x-auto max-w-full" style={{ overflowX: 'auto' }}>
                      <div className="min-w-max">
                        <SyntaxHighlighter
                          language="python"
                          style={vscDarkPlus}
                          wrapLongLines={false}
                          codeTagProps={{ style: { whiteSpace: 'pre' } }}
                          customStyle={{
                            margin: 0,
                            borderRadius: 0,
                            whiteSpace: 'pre',
                            minWidth: '100%',
                            width: 'max-content',
                          }}
                        >
                          {block.code}
                        </SyntaxHighlighter>
                      </div>
                    </div>

                    {/* Stdout Output */}
                    {block.result.stdout && (
                      <div>
                        <div className="bg-muted px-4 py-2 flex items-center gap-2 border-t">
                          <Terminal className="size-4" />
                          <span className="text-sm">Standard Output</span>
                        </div>
                        <div className="p-4 bg-black text-green-400 font-mono text-sm overflow-x-auto max-w-full" style={{ overflowX: 'auto' }}>
                          <pre className="whitespace-pre inline-block min-w-full w-max">
                            {block.result.stdout}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Stderr Output */}
                    {block.result.stderr && (
                      <div>
                        <div className="bg-muted px-4 py-2 flex items-center gap-2 border-t">
                          <Terminal className="size-4" />
                          <span className="text-sm">Standard Error</span>
                        </div>
                        <div className="p-4 bg-black text-red-400 font-mono text-sm overflow-x-auto max-w-full" style={{ overflowX: 'auto' }}>
                          <pre className="whitespace-pre inline-block min-w-full w-max">
                            {block.result.stderr}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* RLM Calls Info */}
                    {block.result.rlm_calls && block.result.rlm_calls.length > 0 && (
                      <div className="px-4 py-2 bg-muted border-t">
                        <span className="text-sm">
                          RLM Calls: {block.result.rlm_calls.length}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}

        {/* Prompt Section */}
        <AccordionItem value="prompt">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <MessageSquare className="size-4" />
              <span>Prompt ({iteration.prompt?.length || 0} messages)</span>
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {iteration.prompt?.map((message, index) => (
                <div key={index} className="border rounded-md overflow-hidden">
                  <div className="bg-muted px-4 py-2">
                    <Badge variant={message.role === 'system' ? 'default' : 'secondary'}>
                      {message.role}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <div className="overflow-x-auto max-w-full" style={{ overflowX: 'auto' }}>
                      <pre className="whitespace-pre text-sm font-mono inline-block min-w-full w-max">
                        {message.content}
                      </pre>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Final Answer Section */}
        {iteration.final_answer && (
          <AccordionItem value="final-answer">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-2">
                <MessageSquare className="size-4" />
                <span>Final Answer</span>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800 overflow-x-auto max-w-full" style={{ overflowX: 'auto' }}>
                <pre className="whitespace-pre text-sm font-mono inline-block min-w-full w-max">
                  {typeof iteration.final_answer === 'string'
                    ? iteration.final_answer
                    : JSON.stringify(iteration.final_answer, null, 2)}
                </pre>
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>
    </Card>
  );
}
