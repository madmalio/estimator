import React from 'react';
import { Trash2 } from 'lucide-react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { SortableList } from '../dnd/SortableList';
import { DragHandle } from '../dnd/DragHandle';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import type { EstimateLineItem, SortOrderUpdate } from '../../types';

interface LineItemRowProps {
  item: EstimateLineItem;
  onDelete: (id: number) => void;
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}

function LineItemRow({ item, onDelete, listeners, attributes }: LineItemRowProps) {
  return (
    <tr className="border-b border-zinc-800 hover:bg-zinc-800 group">
      <td className="px-2 py-2 w-8">
        <DragHandle listeners={listeners} attributes={attributes} />
      </td>
      <td className="px-3 py-2 text-sm text-zinc-100">
        {item.categoryName && (
          <span className="text-zinc-400">{item.categoryName} - </span>
        )}
        {item.itemName}
      </td>
      <td className="px-3 py-2 text-sm text-zinc-400 text-right">{item.quantity}</td>
      <td className="px-3 py-2 text-sm text-zinc-400 text-right">
        {formatCurrency(item.unitPrice)}
      </td>
      <td className="px-3 py-2 text-sm font-medium text-zinc-100 text-right">
        {formatCurrency(item.lineTotal)}
      </td>
      <td className="px-3 py-2 w-12">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100"
        >
          <Trash2 size={14} className="text-red-500" />
        </Button>
      </td>
    </tr>
  );
}

interface LineItemTableProps {
  lineItems: EstimateLineItem[];
  onDeleteItem: (id: number) => void;
  onReorderItems: (updates: SortOrderUpdate[]) => void;
}

export function LineItemTable({
  lineItems,
  onDeleteItem,
  onReorderItems,
}: LineItemTableProps) {
  const handleReorder = (items: EstimateLineItem[]) => {
    const updates: SortOrderUpdate[] = items.map((item, index) => ({
      id: item.id,
      sortOrder: index,
    }));
    onReorderItems(updates);
  };

  if (lineItems.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-zinc-400">
          No items added yet. Select items from the price list or add write-in items.
        </p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="bg-zinc-800 border-b border-zinc-700">
            <th className="px-2 py-3 w-8"></th>
            <th className="px-3 py-3 text-left text-sm font-medium text-zinc-400">
              Description
            </th>
            <th className="px-3 py-3 text-right text-sm font-medium text-zinc-400 w-20">
              Qty
            </th>
            <th className="px-3 py-3 text-right text-sm font-medium text-zinc-400 w-28">
              Unit Price
            </th>
            <th className="px-3 py-3 text-right text-sm font-medium text-zinc-400 w-28">
              Total
            </th>
            <th className="px-3 py-3 w-12"></th>
          </tr>
        </thead>
        <tbody>
          <SortableList
            items={lineItems}
            onReorder={handleReorder}
            keyExtractor={(item) => item.id}
            renderItem={(item) => (
              <LineItemRow item={item} onDelete={onDeleteItem} />
            )}
          />
        </tbody>
      </table>
    </Card>
  );
}
