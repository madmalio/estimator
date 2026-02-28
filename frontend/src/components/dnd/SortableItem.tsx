import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { cn } from '../../lib/utils';

interface SortableItemProps {
  id: string | number;
  children: React.ReactNode;
  className?: string;
}

export function SortableItem({ id, children, className }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'transition-shadow',
        isDragging && 'opacity-50 shadow-lg z-50',
        className
      )}
    >
      {React.isValidElement(children)
        ? React.cloneElement(children as React.ReactElement<{
            listeners?: SyntheticListenerMap;
            attributes?: DraggableAttributes;
          }>, { listeners, attributes })
        : children}
    </div>
  );
}
