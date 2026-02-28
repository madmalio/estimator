import React, { useState } from 'react';
import { Pencil, Trash2, Check, X } from 'lucide-react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { DragHandle } from '../dnd/DragHandle';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { formatCurrency } from '../../lib/utils';
import type { PriceListItem } from '../../types';

interface PriceItemRowProps {
  item: PriceListItem;
  onUpdate: (id: number, itemName: string, unitPrice: number) => void;
  onDelete: (id: number) => void;
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}

export function PriceItemRow({
  item,
  onUpdate,
  onDelete,
  listeners,
  attributes,
}: PriceItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [itemName, setItemName] = useState(item.itemName);
  const [unitPrice, setUnitPrice] = useState(item.unitPrice.toString());

  const handleSave = () => {
    const price = parseFloat(unitPrice);
    if (itemName.trim() && !isNaN(price) && price >= 0) {
      onUpdate(item.id, itemName.trim(), price);
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setItemName(item.itemName);
    setUnitPrice(item.unitPrice.toString());
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 py-2 px-3 bg-zinc-800 rounded">
        <div className="w-6" />
        <Input
          value={itemName}
          onChange={(e) => setItemName(e.target.value)}
          className="flex-1"
          placeholder="Item name"
        />
        <Input
          type="number"
          step="0.01"
          min="0"
          value={unitPrice}
          onChange={(e) => setUnitPrice(e.target.value)}
          className="w-28"
          placeholder="Price"
        />
        <Button variant="ghost" size="sm" onClick={handleSave}>
          <Check size={14} className="text-green-600" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleCancel}>
          <X size={14} className="text-zinc-400" />
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 py-2 px-3 hover:bg-zinc-800 rounded group">
      <DragHandle listeners={listeners} attributes={attributes} />
      <span className="flex-1 text-sm text-zinc-300">{item.itemName}</span>
      <span className="text-sm font-medium text-zinc-100 w-24 text-right">
        {formatCurrency(item.unitPrice)}
      </span>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
          <Pencil size={14} className="text-zinc-400" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}>
          <Trash2 size={14} className="text-red-500" />
        </Button>
      </div>
    </div>
  );
}
