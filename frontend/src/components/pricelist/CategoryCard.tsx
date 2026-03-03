import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { DragHandle } from '../dnd/DragHandle';
import { SortableList } from '../dnd/SortableList';
import { PriceItemRow } from './PriceItemRow';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import type { Category, PriceListItem, SortOrderUpdate } from '../../types';

interface CategoryCardProps {
  category: Category;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onUpdateCategory: (id: number, name: string) => void;
  onDeleteCategory: (id: number) => void;
  onAddItem: (categoryId: number, itemName: string, unitPrice: number) => void;
  onUpdateItem: (id: number, itemName: string, unitPrice: number) => void;
  onDeleteItem: (id: number) => void;
  onReorderItems: (updates: SortOrderUpdate[]) => void;
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}

export function CategoryCard({
  category,
  isExpanded,
  onToggleExpanded,
  onUpdateCategory,
  onDeleteCategory,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorderItems,
  listeners,
  attributes,
}: CategoryCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [categoryName, setCategoryName] = useState(category.name);
  const [isAddingItem, setIsAddingItem] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleSaveCategory = () => {
    if (categoryName.trim()) {
      onUpdateCategory(category.id, categoryName.trim());
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    setCategoryName(category.name);
    setIsEditing(false);
  };

  const handleAddItem = () => {
    const price = parseFloat(newItemPrice);
    if (newItemName.trim() && !isNaN(price) && price >= 0) {
      onAddItem(category.id, newItemName.trim(), price);
      setNewItemName('');
      setNewItemPrice('');
      setIsAddingItem(false);
    }
  };

  const handleReorderItems = (items: PriceListItem[]) => {
    const updates: SortOrderUpdate[] = items.map((item, index) => ({
      id: item.id,
      sortOrder: index,
    }));
    onReorderItems(updates);
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border-b border-zinc-700">
        <DragHandle listeners={listeners} attributes={attributes} />

          <button
            onClick={onToggleExpanded}
            className="p-1 text-zinc-400 hover:text-zinc-200"
          >
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>

        {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  className="flex-1"
                />
                <Button variant="ghost" size="sm" onClick={handleSaveCategory}>
                  <Check size={14} className="text-green-600" />
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                  <X size={14} className="text-zinc-400" />
                </Button>
              </div>
        ) : (
          <>
            <span className="flex-1 font-medium text-zinc-100">{category.name}</span>
            <span className="text-sm text-zinc-400">
              {category.items?.length || 0} items
            </span>
            <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDeleteModalOpen(true)}
            >
              <Trash2 size={14} className="text-red-500" />
            </Button>
          </>
        )}
      </div>

      {isExpanded && (
        <div className="p-2">
          {category.items && category.items.length > 0 ? (
            <SortableList
              items={category.items}
              onReorder={handleReorderItems}
              keyExtractor={(item) => item.id}
              renderItem={(item) => (
                <PriceItemRow
                  item={item}
                  onUpdate={onUpdateItem}
                  onDelete={onDeleteItem}
                />
              )}
            />
          ) : (
            <p className="text-sm text-zinc-400 text-center py-4">
              No items in this category
            </p>
          )}

          {isAddingItem ? (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-700">
              <div className="w-6" />
              <Input
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder="Item name"
                className="flex-1"
              />
              <Input
                type="number"
                step="0.01"
                min="0"
                value={newItemPrice}
                onChange={(e) => setNewItemPrice(e.target.value)}
                placeholder="Price"
                className="w-28"
              />
              <Button variant="ghost" size="sm" onClick={handleAddItem}>
                <Check size={14} className="text-green-600" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsAddingItem(false)}>
                <X size={14} className="text-zinc-400" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsAddingItem(true)}
              className="w-full mt-2"
            >
              <Plus size={14} className="mr-1 text-zinc-400" />
              Add Item
            </Button>
          )}
        </div>
      )}

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Category"
      >
        <div className="space-y-4">
          <p className="text-zinc-300">
            Delete category "{category.name}" and all its items?
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                onDeleteCategory(category.id);
                setIsDeleteModalOpen(false);
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
