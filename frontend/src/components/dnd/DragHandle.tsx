import React from 'react';
import { GripVertical } from 'lucide-react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { cn } from '../../lib/utils';

interface DragHandleProps {
  className?: string;
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}

export function DragHandle({ className, listeners, attributes }: DragHandleProps) {
  return (
    <button
      type="button"
      className={cn(
        'cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600 rounded',
        'focus:outline-none focus:ring-2 focus:ring-primary-500',
        className
      )}
      {...listeners}
      {...attributes}
    >
      <GripVertical size={16} />
    </button>
  );
}
