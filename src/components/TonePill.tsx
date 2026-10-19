import type { ReactNode } from 'react';
import type { AttentionTone } from '../lib/vehicleAttention';
import { TONE_CLASSES } from './ui';

export function TonePill({ tone, children, className }: { tone: AttentionTone; children: ReactNode; className?: string }) {
  return (
    <span className={`text-xs font-semibold rounded px-2 py-[3px] ${TONE_CLASSES[tone]} ${className ?? ''}`}>
      {children}
    </span>
  );
}
