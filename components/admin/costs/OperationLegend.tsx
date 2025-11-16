'use client';

import { useEffect, useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

interface SourceDefinition {
  source: string;
  displayName: string;
  description: string;
  icon: string;
  exampleServices: string[];
}

const OPERATION_DEFINITIONS: Record<string, SourceDefinition> = {
  learning_material_generation: {
    source: 'learning_material_generation',
    displayName: 'Learning Material Generation',
    description:
      'Full pipeline operation: extracts video transcript and generates comprehensive learning materials including flashcards, quizzes, timestamps, prerequisites, and mind maps in a single operation.',
    icon: '📚',
    exampleServices: ['Transcript Extraction', 'LLM Processing'],
  },
  learning_chatbot: {
    source: 'learning_chatbot',
    displayName: 'Learning Chatbot',
    description:
      'User query about video content. Processes questions about the material and provides intelligent answers based on the video transcript.',
    icon: '💬',
    exampleServices: ['LLM Processing'],
  },
  challenge_chatbot: {
    source: 'challenge_chatbot',
    displayName: 'Challenge Chatbot',
    description:
      'User query for help with real-world coding problems. Provides hints, explanations, and guidance related to the challenge without giving away the solution.',
    icon: '🎯',
    exampleServices: ['LLM Processing'],
  },
};

interface SourceData {
  source: string;
  cost: number;
  operations: number;
  percentage: number;
}

export default function OperationLegend() {
  const [sources, setSources] = useState<SourceData[]>([]);
  const [expandedSource, setExpandedSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSources();
  }, []);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/analytics/costs/by-source');

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setSources(data.sources);
          // Auto-expand first source initially
          if (data.sources.length > 0) {
            setExpandedSource(data.sources[0].source);
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch source data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  // Get all operation types that exist in the database
  const activeSources = sources.map((s) => s.source);
  const relevantDefinitions = activeSources
    .map((source) => OPERATION_DEFINITIONS[source])
    .filter(Boolean);

  if (relevantDefinitions.length === 0) {
    return null;
  }

  return (
    <div className="bg-card-bg border border-border rounded-xl p-6">
      <div className="flex items-start space-x-3 mb-4">
        <Info className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="text-lg font-semibold text-foreground">About Operations</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Understanding what each operation type represents and its associated costs
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {relevantDefinitions.map((definition) => {
          const isExpanded = expandedSource === definition.source;
          const sourceData = sources.find((s) => s.source === definition.source);

          return (
            <div
              key={definition.source}
              className="border border-border rounded-lg overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() =>
                  setExpandedSource(isExpanded ? null : definition.source)
                }
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-background/50 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3 flex-1">
                  <span className="text-2xl">{definition.icon}</span>
                  <div className="text-left">
                    <p className="font-medium text-foreground text-sm">
                      {definition.displayName}
                    </p>
                    {sourceData && (
                      <p className="text-xs text-muted-foreground">
                        {sourceData.operations} operation{sourceData.operations !== 1 ? 's' : ''} • $
                        {sourceData.cost.toFixed(4)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {sourceData && (
                    <span className="text-xs font-medium text-accent bg-accent/10 px-2 py-1 rounded">
                      {sourceData.percentage.toFixed(1)}%
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 py-3 bg-background/30 border-t border-border space-y-3">
                  <p className="text-sm text-foreground leading-relaxed">
                    {definition.description}
                  </p>

                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">
                      Associated Services:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {definition.exampleServices.map((service) => (
                        <span
                          key={service}
                          className="inline-block bg-accent/10 text-accent text-xs px-2 py-1 rounded"
                        >
                          {service}
                        </span>
                      ))}
                    </div>
                  </div>

                  {sourceData && (
                    <div className="grid grid-cols-3 gap-3 pt-2 border-t border-border/50">
                      <div>
                        <p className="text-xs text-muted-foreground">Operations</p>
                        <p className="font-semibold text-foreground">
                          {sourceData.operations}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total Cost</p>
                        <p className="font-semibold text-foreground">
                          ${sourceData.cost.toFixed(4)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Of Total</p>
                        <p className="font-semibold text-accent">
                          {sourceData.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground mt-4 pt-4 border-t border-border">
        💡 <strong>Tip:</strong> New operation types will automatically appear here as they are added to the system.
      </p>
    </div>
  );
}
