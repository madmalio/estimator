import React, { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, Pencil, Check, X } from "lucide-react";
import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";
import { DragHandle } from "../dnd/DragHandle";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { formatCurrency } from "../../lib/utils";
import type { Category, EstimateLineItem, SortOrderUpdate } from "../../types";

interface LineItemRowProps {
  item: EstimateLineItem;
  categories: Category[];
  onDelete: (id: number) => void;
  onUpdate: (
    id: number,
    itemName: string,
    quantity: number,
    unitPrice: number,
    categoryName: string,
  ) => void;
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
}

function LineItemRow({
  item,
  categories,
  onDelete,
  onUpdate,
  listeners,
  attributes,
}: LineItemRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [itemName, setItemName] = useState(item.itemName);
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState("");
  const [quantity, setQuantity] = useState(item.quantity.toString());
  const [unitPrice, setUnitPrice] = useState(item.unitPrice.toString());

  const category = categories.find((entry) => entry.name === item.categoryName);
  const categoryItems = category?.items || [];
  const itemOptions = categoryItems.map((entry) => ({
    value: entry.id.toString(),
    label: `${entry.itemName} - ${formatCurrency(entry.unitPrice)}`,
  }));

  useEffect(() => {
    setItemName(item.itemName);
    setQuantity(item.quantity.toString());
    setUnitPrice(item.unitPrice.toString());
  }, [item]);

  useEffect(() => {
    const matched = categoryItems.find((entry) => entry.itemName === itemName);
    setSelectedCatalogItemId(matched ? matched.id.toString() : "");
  }, [categoryItems, itemName]);

  const handleSave = () => {
    const parsedQuantity = parseFloat(quantity);
    const parsedUnitPrice = parseFloat(unitPrice);

    if (
      !itemName.trim() ||
      Number.isNaN(parsedQuantity) ||
      parsedQuantity <= 0 ||
      Number.isNaN(parsedUnitPrice) ||
      parsedUnitPrice < 0
    ) {
      return;
    }

    onUpdate(
      item.id,
      itemName.trim(),
      parsedQuantity,
      parsedUnitPrice,
      item.categoryName,
    );
    setIsEditing(false);
  };

  if (isEditing) {
    const parsedQuantity = parseFloat(quantity) || 0;
    const parsedUnitPrice = parseFloat(unitPrice) || 0;
    const editLineTotal = parsedQuantity * parsedUnitPrice;

    return (
      <>
        <td className="px-2 py-2 w-8"></td>
        <td className="px-3 py-2 text-sm text-zinc-100">
          {categoryItems.length > 0 ? (
            <Select
              value={selectedCatalogItemId}
              options={itemOptions}
              placeholder="Select item..."
              onChange={(value) => {
                setSelectedCatalogItemId(value);
                const selectedItem = categoryItems.find(
                  (entry) => entry.id.toString() === value,
                );
                if (selectedItem) {
                  setItemName(selectedItem.itemName);
                  setUnitPrice(selectedItem.unitPrice.toString());
                }
              }}
            />
          ) : (
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          )}
        </td>
        <td className="px-3 py-2 text-sm text-zinc-400 text-right">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="text-right"
          />
        </td>
        <td className="px-3 py-2 text-sm text-zinc-400 text-right">
          <Input
            type="number"
            step="0.01"
            min="0"
            value={unitPrice}
            onChange={(e) => setUnitPrice(e.target.value)}
            className="text-right"
          />
        </td>
        <td className="px-3 py-2 text-sm font-medium text-zinc-100 text-right">
          {formatCurrency(editLineTotal)}
        </td>
        <td className="px-3 py-2 w-20">
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="sm" onClick={handleSave}>
              <Check size={14} className="text-green-500" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setItemName(item.itemName);
                setQuantity(item.quantity.toString());
                setUnitPrice(item.unitPrice.toString());
                setIsEditing(false);
              }}
            >
              <X size={14} className="text-zinc-400" />
            </Button>
          </div>
        </td>
      </>
    );
  }

  return (
    <>
      <td className="px-2 py-2 w-8">
        <DragHandle listeners={listeners} attributes={attributes} />
      </td>
      <td className="px-3 py-2 text-sm text-zinc-100">
        {item.categoryName && (
          <span className="text-zinc-400">{item.categoryName} - </span>
        )}
        {item.itemName}
      </td>
      <td className="px-3 py-2 text-sm text-zinc-400 text-right">
        {item.quantity}
      </td>
      <td className="px-3 py-2 text-sm text-zinc-400 text-right">
        {formatCurrency(item.unitPrice)}
      </td>
      <td className="px-3 py-2 text-sm font-medium text-zinc-100 text-right">
        {formatCurrency(item.lineTotal)}
      </td>
      <td className="px-3 py-2 w-20">
        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil size={14} className="text-zinc-400" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(item.id)}>
            <Trash2 size={14} className="text-red-500" />
          </Button>
        </div>
      </td>
    </>
  );
}

function SortableLineItemRow({
  item,
  categories,
  onDelete,
  onUpdate,
}: {
  item: EstimateLineItem;
  categories: Category[];
  onDelete: (id: number) => void;
  onUpdate: (
    id: number,
    itemName: string,
    quantity: number,
    unitPrice: number,
    categoryName: string,
  ) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
  });

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`border-b border-zinc-800 hover:bg-zinc-800 group ${isDragging ? "opacity-70" : ""}`}
    >
      <LineItemRow
        item={item}
        categories={categories}
        onDelete={onDelete}
        onUpdate={onUpdate}
        listeners={listeners}
        attributes={attributes}
      />
    </tr>
  );
}

interface LineItemTableProps {
  lineItems: EstimateLineItem[];
  categories: Category[];
  onDeleteItem: (id: number) => void;
  onUpdateItem: (
    id: number,
    itemName: string,
    quantity: number,
    unitPrice: number,
    categoryName: string,
  ) => void;
  onReorderItems: (updates: SortOrderUpdate[]) => void;
}

export function LineItemTable({
  lineItems,
  categories,
  onDeleteItem,
  onUpdateItem,
  onReorderItems,
}: LineItemTableProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleReorder = (items: EstimateLineItem[]) => {
    const updates: SortOrderUpdate[] = items.map((item, index) => ({
      id: item.id,
      sortOrder: index,
    }));
    onReorderItems(updates);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = lineItems.findIndex((item) => item.id === active.id);
    const newIndex = lineItems.findIndex((item) => item.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    handleReorder(arrayMove(lineItems, oldIndex, newIndex));
  };

  if (lineItems.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-zinc-400">
          No items added yet. Select items from the price list or add write-in
          items.
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
              Item
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
            <th className="px-3 py-3 w-20"></th>
          </tr>
        </thead>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={lineItems.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <tbody>
              {lineItems.map((item) => (
                <SortableLineItemRow
                  key={item.id}
                  item={item}
                  categories={categories}
                  onDelete={onDeleteItem}
                  onUpdate={onUpdateItem}
                />
              ))}
            </tbody>
          </SortableContext>
        </DndContext>
      </table>
    </Card>
  );
}
