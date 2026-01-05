import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sparkles, Zap, Brain } from 'lucide-react';

export type AIModel = 'gemini-flash' | 'gemini-pro' | 'gpt-5';

interface ModelSelectorProps {
  value: AIModel;
  onChange: (model: AIModel) => void;
  disabled?: boolean;
}

const models = [
  {
    id: 'gemini-flash' as AIModel,
    name: 'Gemini Flash',
    description: 'Fast & efficient',
    icon: Zap,
  },
  {
    id: 'gemini-pro' as AIModel,
    name: 'Gemini Pro',
    description: 'Advanced reasoning',
    icon: Brain,
  },
  {
    id: 'gpt-5' as AIModel,
    name: 'GPT-5',
    description: 'Most powerful',
    icon: Sparkles,
  },
];

export function ModelSelector({ value, onChange, disabled }: ModelSelectorProps) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as AIModel)} disabled={disabled}>
      <SelectTrigger className="w-[180px] glass-card">
        <SelectValue placeholder="Select model" />
      </SelectTrigger>
      <SelectContent>
        {models.map((model) => (
          <SelectItem key={model.id} value={model.id}>
            <div className="flex items-center gap-2">
              <model.icon className="h-4 w-4 text-accent" />
              <div>
                <p className="font-medium">{model.name}</p>
                <p className="text-xs text-muted-foreground">{model.description}</p>
              </div>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
