import React, { useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { ChevronDown, ChevronRight, Code2, Terminal, Zap, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { ArgAgiFrameViewer, ArgAgiFrameRecord } from './ArgAgiFrameViewer';

interface CodeBlock {
  code: string;
  result: {
    stdout: string;
    stderr: string;
    locals: Record<string, any>;
    execution_time: number;
    rlm_calls: any[];
    action_events?: Record<string, any>[];
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
  argAgiFrames?: ArgAgiFrameRecord[];
}

interface ActionFrameItem {
  id: string;
  varName: string;
  record: ArgAgiFrameRecord;
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

function asObject(value: unknown): Record<string, any> | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : null;
}

function hasKeys(obj: Record<string, any>, keys: string[]): boolean {
  return keys.every((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

function extractFramePayload(source: Record<string, any>): unknown {
  const observation = asObject(source.observation);
  const directFrame = asObject(source.frame);

  if (observation && Object.prototype.hasOwnProperty.call(observation, 'frame')) {
    const rawObservationFrame = observation.frame;
    const observationFrameObject = asObject(rawObservationFrame);
    if (observationFrameObject && Object.prototype.hasOwnProperty.call(observationFrameObject, 'frame')) {
      return observationFrameObject.frame;
    }
    return rawObservationFrame;
  }

  if (directFrame && Object.prototype.hasOwnProperty.call(directFrame, 'frame')) {
    return directFrame.frame;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'frame')) {
    return source.frame;
  }
  return null;
}

function toActionFrameRecord(source: Record<string, any>, timestamp: string): ArgAgiFrameRecord | null {
  const frame = extractFramePayload(source);
  if (frame === null || frame === undefined) {
    return null;
  }

  const gameState = asObject(source.game_state);
  const observation = asObject(source.observation);
  const stepRaw = source.step_count ?? source.step ?? 0;
  const step = typeof stepRaw === 'number' ? stepRaw : Number(stepRaw) || 0;

  return {
    type: 'arg_agi_frame',
    timestamp,
    step,
    state: (gameState?.state ?? observation?.state ?? source.state ?? null) as string | null,
    levels_completed: (gameState?.levels_completed ?? observation?.levels_completed ?? source.levels_completed ?? null) as number | null,
    action: (source.executed_action ?? source.action ?? source.last_action ?? null) as string | null,
    action_xy: (asObject(source.executed_action_data) ?? asObject(source.action_xy)) as {
      x?: number | string | null;
      y?: number | string | null;
    } | null,
    frame,
  };
}

function extractActionFrameItemsFromEvents(
  actionEvents: Record<string, any>[] | undefined,
  timestamp: string
): ActionFrameItem[] {
  if (!Array.isArray(actionEvents) || actionEvents.length === 0) {
    return [];
  }

  return actionEvents
    .map((event, index) => {
      const record = toActionFrameRecord(event, timestamp);
      if (!record) {
        return null;
      }

      const step = typeof record.step === 'number' ? record.step : index;
      return {
        id: `event-${step}-${index}`,
        varName: `action_events[${index}]`,
        record,
      };
    })
    .filter((item): item is ActionFrameItem => item !== null);
}

function extractActionRecordFromStdout(stdout: string, timestamp: string): ArgAgiFrameRecord | null {
  if (!stdout || (!stdout.includes("'executed_action'") && !stdout.includes("'action'"))) {
    return null;
  }

  const actionMatch =
    stdout.match(/'executed_action':\s*'([^']+)'/) ?? stdout.match(/'action':\s*'([^']+)'/);
  const stepMatch = stdout.match(/'step_count':\s*(-?\d+)/);
  const levelsCompletedMatch = stdout.match(/'levels_completed':\s*(-?\d+)/);
  const frameMatch = stdout.match(/'frame':\s*(\[\[\[[\s\S]*?\]\]\])/);
  const actionDataMatch =
    stdout.match(/'executed_action_data':\s*\{\s*'x':\s*(-?\d+)\s*,\s*'y':\s*(-?\d+)\s*\}/) ??
    stdout.match(/'action_xy':\s*\{\s*'x':\s*(-?\d+)\s*,\s*'y':\s*(-?\d+)\s*\}/);

  if (!actionMatch || !frameMatch) {
    return null;
  }

  let parsedFrame: unknown;
  try {
    parsedFrame = JSON.parse(frameMatch[1]);
  } catch {
    return null;
  }

  const source: Record<string, any> = {
    action: actionMatch[1],
    step_count: stepMatch ? Number(stepMatch[1]) : 0,
    frame: parsedFrame,
    levels_completed: levelsCompletedMatch ? Number(levelsCompletedMatch[1]) : null,
    action_xy: actionDataMatch
      ? { x: Number(actionDataMatch[1]), y: Number(actionDataMatch[2]) }
      : null,
  };

  return toActionFrameRecord(source, timestamp);
}

function extractAssignedLocalNames(code?: string): Set<string> {
  const names = new Set<string>();
  if (!code) {
    return names;
  }

  // Minimal Python assignment matcher: captures `var = ...` at line start.
  const assignmentRegex = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/;
  code.split('\n').forEach((line) => {
    const match = line.match(assignmentRegex);
    if (!match) {
      return;
    }
    names.add(match[1]);
  });
  return names;
}

function extractFrameAssignmentTargets(code?: string): Set<string> {
  const names = new Set<string>();
  if (!code) {
    return names;
  }

  const regex =
    /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*make_action\([\s\S]*?\)\s*\[\s*['"]frame['"]\s*\]\s*$/;

  code.split('\n').forEach((line) => {
    const match = line.match(regex);
    if (!match) {
      return;
    }
    names.add(match[1]);
  });

  return names;
}

function extractActionResultAssignmentTargets(code?: string): Set<string> {
  const names = new Set<string>();
  if (!code) {
    return names;
  }

  const regex =
    /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*make_action\([\s\S]*?\)\s*$/;

  code.split('\n').forEach((line) => {
    const match = line.match(regex);
    if (!match) {
      return;
    }
    names.add(match[1]);
  });

  return names;
}

function formatSeconds(value: unknown, digits = 2): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return `${value.toFixed(digits)}s`;
}

function extractLastRendererStep(stdout?: string): number | null {
  const steps = extractRendererSteps(stdout);
  return steps.length > 0 ? steps[steps.length - 1] : null;
}

function extractRendererSteps(stdout?: string): number[] {
  if (!stdout) {
    return [];
  }
  const regex = /\[renderer\]\s*step=(\d+)/g;
  const steps: number[] = [];
  let match: RegExpExecArray | null = null;
  while ((match = regex.exec(stdout)) !== null) {
    steps.push(Number(match[1]));
  }
  return steps;
}

function countActionCallsInCode(code?: string): number {
  if (!code) {
    return 0;
  }

  const executable = code
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');

  return executable.match(/\bmake_action\s*\(/g)?.length ?? 0;
}

function countIterationActions(iteration: IterationData): number {
  return (iteration.code_blocks ?? []).reduce((total, block) => {
    const actionEvents = block.result?.action_events;
    if (Array.isArray(actionEvents) && actionEvents.length > 0) {
      return total + actionEvents.length;
    }

    const rendererSteps = extractRendererSteps(block.result?.stdout);
    if (rendererSteps.length > 0) {
      return total + rendererSteps.length;
    }

    return total + countActionCallsInCode(block.code);
  }, 0);
}

function extractActionCallFromCode(code?: string): { action: string; x?: number; y?: number } | null {
  if (!code || !code.includes('make_action(')) {
    return null;
  }

  const executable = code
    .split('\n')
    .filter((line) => !line.trim().startsWith('#'))
    .join('\n');

  const regex =
    /make_action\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*(?:,\s*x\s*=\s*(-?\d+)\s*,\s*y\s*=\s*(-?\d+))?\s*\)/g;

  let match: RegExpExecArray | null = null;
  let last: RegExpExecArray | null = null;
  while ((match = regex.exec(executable)) !== null) {
    last = match;
  }

  if (!last) {
    return null;
  }

  return {
    action: last[1],
    x: last[2] !== undefined ? Number(last[2]) : undefined,
    y: last[3] !== undefined ? Number(last[3]) : undefined,
  };
}

function findBestFrameInLocals(
  locals: Record<string, any>,
  candidateNames: Set<string>
): unknown | null {
  const preferredNames = ['cf', 'frame', 'current_frame', 'obs', 'observation'];

  for (const name of preferredNames) {
    if (!candidateNames.has(name)) {
      continue;
    }
    const value = asObject(locals[name]);
    if (!value) {
      continue;
    }
    const frame = extractFramePayload(value);
    if (frame !== null && frame !== undefined) {
      return frame;
    }
  }

  for (const name of candidateNames) {
    const value = asObject(locals[name]);
    if (!value) {
      continue;
    }
    const frame = extractFramePayload(value);
    if (frame !== null && frame !== undefined) {
      return frame;
    }
  }

  return null;
}

function findBestRawFrameInLocals(
  locals: Record<string, any>,
  frameAssignmentTargets: Set<string>
): unknown | null {
  for (const name of frameAssignmentTargets) {
    if (!Object.prototype.hasOwnProperty.call(locals, name)) {
      continue;
    }
    const value = locals[name];
    if (Array.isArray(value)) {
      return value;
    }
  }

  return null;
}

function extractActionRecordFromCodeAndLocals(
  code: string | undefined,
  locals: Record<string, any>,
  stdout: string | undefined,
  timestamp: string
): ActionFrameItem | null {
  const call = extractActionCallFromCode(code);
  if (!call) {
    return null;
  }

  const resultAssignmentTargets = extractActionResultAssignmentTargets(code);
  const frameAssignmentTargets = extractFrameAssignmentTargets(code);

  let varName = 'code.make_action';
  const frame =
    (resultAssignmentTargets.size > 0
      ? findBestFrameInLocals(locals, resultAssignmentTargets)
      : null) ??
    findBestRawFrameInLocals(locals, frameAssignmentTargets);
  if (frame === null || frame === undefined) {
    return null;
  }

  if (resultAssignmentTargets.size > 0) {
    varName = Array.from(resultAssignmentTargets)[0];
  } else if (frameAssignmentTargets.size > 0) {
    varName = Array.from(frameAssignmentTargets)[0];
  }

  const guessedState =
    asObject(locals.state)?.state ??
    asObject(locals.gs)?.state ??
    asObject(locals.game_state)?.state ??
    null;
  const guessedLevels =
    asObject(locals.state)?.levels_completed ??
    asObject(locals.gs)?.levels_completed ??
    asObject(locals.game_state)?.levels_completed ??
    null;

  return {
    id: `code-call-${extractLastRendererStep(stdout) ?? 0}-${call.action ?? 'UNKNOWN_ACTION'}`,
    varName,
    record: {
      type: 'arg_agi_frame',
      timestamp,
      step: extractLastRendererStep(stdout) ?? 0,
      state: guessedState as string | null,
      levels_completed:
        typeof guessedLevels === 'number' ? guessedLevels : guessedLevels === null ? null : Number(guessedLevels) || null,
      action: call.action,
      action_xy:
        call.action === 'ACTION6' && call.x !== undefined && call.y !== undefined
          ? { x: call.x, y: call.y }
          : null,
      frame,
    },
  };
}

function extractActionFrameItems(
  actionEvents: Record<string, any>[] | undefined,
  locals: Record<string, any> | undefined,
  argAgiFrames: ArgAgiFrameRecord[] | undefined,
  timestamp: string,
  code?: string,
  stdout?: string
): ActionFrameItem[] {
  const eventItems = extractActionFrameItemsFromEvents(actionEvents, timestamp);
  if (eventItems.length > 0) {
    return eventItems;
  }

  const rendererSteps = extractRendererSteps(stdout);
  if (rendererSteps.length > 0 && Array.isArray(argAgiFrames) && argAgiFrames.length > 0) {
    const stepSet = new Set(rendererSteps);
    const externalItems = argAgiFrames
      .filter((record) => typeof record.step === 'number' && stepSet.has(record.step))
      .map((record) => ({
        id: `frame-log-${record.step}`,
        varName: `frame_log[step ${record.step}]`,
        record,
      }));
    if (externalItems.length > 0) {
      return externalItems;
    }
  }

  if (!locals) {
    const fallbackRecord =
      code && code.includes('print(make_action(') && stdout
        ? extractActionRecordFromStdout(stdout, timestamp)
        : null;
    return fallbackRecord
      ? [{ id: `stdout-${fallbackRecord.step}`, varName: 'stdout.make_action', record: fallbackRecord }]
      : [];
  }

  const items: ActionFrameItem[] = [];
  const assignedLocals = extractAssignedLocalNames(code);
  const resultAssignmentTargets = extractActionResultAssignmentTargets(code);

  Object.entries(locals).forEach(([name, rawValue]) => {
    if (!resultAssignmentTargets.has(name)) {
      return;
    }

    const value = asObject(rawValue);
    if (!value) {
      return;
    }

    const hasLegacyShape = hasKeys(value, ['done', 'executed_action', 'observation']);
    const hasFlatShape = hasKeys(value, ['done', 'action', 'frame']);
    if (!hasLegacyShape && !hasFlatShape) {
      return;
    }

    const record = toActionFrameRecord(value, timestamp);
    if (!record) {
      return;
    }

    const step = typeof record.step === 'number' ? record.step : 0;
    items.push({
      id: `${name}-${step}-${items.length}`,
      varName: name,
      record,
    });
  });

  if (items.length === 0 && code && code.includes('print(make_action(') && stdout) {
    const fallbackRecord = extractActionRecordFromStdout(stdout, timestamp);
    if (fallbackRecord) {
      items.push({
        id: `stdout-${fallbackRecord.step}`,
        varName: 'stdout.make_action',
        record: fallbackRecord,
      });
    }
  }

  if (items.length === 0 && code && code.includes('make_action(')) {
    const fallbackItem = extractActionRecordFromCodeAndLocals(code, locals, stdout, timestamp);
    if (fallbackItem) {
      items.push(fallbackItem);
    }
  }

  return items;
}

const IterationCard = ({
  iteration,
  index,
  argAgiFrames,
}: {
  iteration: IterationData;
  index: number;
  argAgiFrames: ArgAgiFrameRecord[];
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isResponseExpanded, setIsResponseExpanded] = useState(false);
  const [expandedCodeBlocks, setExpandedCodeBlocks] = useState<Set<number>>(new Set());
  const [expandedOutputs, setExpandedOutputs] = useState<Set<number>>(new Set());
  const [expandedActionFrames, setExpandedActionFrames] = useState<Set<string>>(new Set());

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

  const toggleActionFrameExpand = (frameKey: string) => {
    const next = new Set(expandedActionFrames);
    if (next.has(frameKey)) {
      next.delete(frameKey);
    } else {
      next.add(frameKey);
    }
    setExpandedActionFrames(next);
  };

  const normalizedResponse = stripLeadingBlankLines(
    stripReplCodeBlocks(iteration.response || '')
  ).trim();
  const iterationDurationLabel = formatSeconds(iteration.iteration_time, 2) ?? 'N/A';
  const actionCount = countIterationActions(iteration);
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
      {index > 0 && (
        <div className="absolute left-6 -top-4 w-0.5 h-4 bg-gradient-to-b from-green-500/50 to-transparent" />
      )}

      <Card className="bg-gray-900 border-gray-700/50 overflow-hidden">
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
                <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/50 border font-mono">
                  {actionCount} {actionCount === 1 ? 'action' : 'actions'}
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
              <span className="font-mono">{iterationDurationLabel}</span>
            </div>
          </div>
        </div>

        {isExpanded && (
          <div className="p-6 space-y-4">
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

            {iteration.code_blocks?.map((block, blockIndex) => {
              const actionItems = extractActionFrameItems(
                block.result?.action_events,
                block.result?.locals,
                argAgiFrames,
                iteration.timestamp,
                block.code,
                block.result?.stdout
              );

              return (
                <div key={blockIndex} className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-400">
                    <Code2 className="size-4" />
                    <span className="text-sm">Code Block {blockIndex + 1}</span>
                      {formatSeconds(block.result.execution_time, 3) && (
                        <span className="text-xs font-mono">
                          ({formatSeconds(block.result.execution_time, 3)})
                        </span>
                      )}
                  </div>
                  <div className="pl-6 border-l-2 border-blue-500/50 ml-2 space-y-3">
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

                    {actionItems.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-cyan-300 text-sm">
                          <Terminal className="size-4" />
                          <span>Action Frames:</span>
                        </div>
                        {actionItems.map((item) => {
                          const frameKey = `${blockIndex}-${item.id}`;
                          const isOpen = expandedActionFrames.has(frameKey);
                          const actionName = item.record.action || 'UNKNOWN_ACTION';

                          return (
                            <div key={frameKey} className="space-y-2">
                              <button
                                type="button"
                                className="inline-flex items-center gap-2 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-200 hover:bg-cyan-500/20"
                                onClick={() => toggleActionFrameExpand(frameKey)}
                              >
                                {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                                <span className="font-mono">{item.varName}</span>
                                <span className="font-mono">{String(actionName)}</span>
                                <span className="font-mono">step {item.record.step}</span>
                              </button>
                              {isOpen && (
                                <ArgAgiFrameViewer
                                  title={`${item.varName} -> ${String(actionName)}`}
                                  records={[item.record]}
                                  statusBadge="post-action"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

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
              );
            })}

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

export function TrajectoryTimeline({ iterations, argAgiFrames = [] }: TrajectoryTimelineProps) {
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
              argAgiFrames={argAgiFrames}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
