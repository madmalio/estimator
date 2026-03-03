import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { SortableList } from '../dnd/SortableList';
import { CategoryCard } from './CategoryCard';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import type { Category, SortOrderUpdate, CreatePriceListItemRequest } from '../../types';
import {
  GetAllCategoriesWithItems,
  CreateCategory,
  UpdateCategory,
  DeleteCategory,
  UpdateCategorySortOrder,
  CreatePriceListItem,
  UpdatePriceListItem,
  DeletePriceListItem,
  UpdatePriceListItemSortOrder,
} from '../../../wailsjs/go/main/App';

const collapsedCategoriesStorageKey = 'cabcon:pricelist:collapsed-categories';

function readCollapsedCategoryIds(): number[] {
  try {
    const raw = localStorage.getItem(collapsedCategoriesStorageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((value) => Number(value))
      .filter((value) => Number.isInteger(value) && value > 0);
  } catch {
    return [];
  }
}

export function PriceListView() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [collapsedCategoryIds, setCollapsedCategoryIds] = useState<number[]>(() => readCollapsedCategoryIds());
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const fetchCategories = async () => {
    try {
      const data = await GetAllCategoriesWithItems();
      setCategories(data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (loading) {
      return;
    }

    if (categories.length === 0) {
      return;
    }

    const validIds = new Set(categories.map((category) => category.id));
    const next = collapsedCategoryIds.filter((id) => validIds.has(id));
    if (next.length !== collapsedCategoryIds.length) {
      setCollapsedCategoryIds(next);
    }
  }, [categories, collapsedCategoryIds, loading]);

  useEffect(() => {
    localStorage.setItem(collapsedCategoriesStorageKey, JSON.stringify(collapsedCategoryIds));
  }, [collapsedCategoryIds]);

  const handleToggleCategory = (categoryId: number) => {
    setCollapsedCategoryIds((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId]
    );
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await CreateCategory({ name: newCategoryName.trim() });
      setNewCategoryName('');
      setIsAddModalOpen(false);
      await fetchCategories();
    } catch (error) {
      console.error('Failed to create category:', error);
    }
  };

  const handleUpdateCategory = async (id: number, name: string) => {
    try {
      await UpdateCategory(id, { name });
      await fetchCategories();
    } catch (error) {
      console.error('Failed to update category:', error);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await DeleteCategory(id);
      await fetchCategories();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const handleReorderCategories = async (newCategories: Category[]) => {
    // Update local state immediately for responsiveness
    setCategories(newCategories);

    const updates: SortOrderUpdate[] = newCategories.map((cat, index) => ({
      id: cat.id,
      sortOrder: index,
    }));

    try {
      await UpdateCategorySortOrder(updates);
    } catch (error) {
      console.error('Failed to update category order:', error);
      await fetchCategories(); // Revert on error
    }
  };

  const handleAddItem = async (categoryId: number, itemName: string, unitPrice: number) => {
    try {
      const req: CreatePriceListItemRequest = {
        categoryId,
        itemName,
        unitPrice,
      };
      await CreatePriceListItem(req);
      await fetchCategories();
    } catch (error) {
      console.error('Failed to create item:', error);
    }
  };

  const handleUpdateItem = async (id: number, itemName: string, unitPrice: number) => {
    // Find the item to get its categoryId
    let categoryId = 0;
    for (const cat of categories) {
      const item = cat.items?.find((i) => i.id === id);
      if (item) {
        categoryId = item.categoryId;
        break;
      }
    }

    try {
      await UpdatePriceListItem(id, { itemName, unitPrice, categoryId });
      await fetchCategories();
    } catch (error) {
      console.error('Failed to update item:', error);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await DeletePriceListItem(id);
      await fetchCategories();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleReorderItems = async (updates: SortOrderUpdate[]) => {
    try {
      await UpdatePriceListItemSortOrder(updates);
      await fetchCategories();
    } catch (error) {
      console.error('Failed to update item order:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">Loading price list...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100">Price List</h2>
        <Button onClick={() => setIsAddModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          Add Category
        </Button>
      </div>

      {categories.length === 0 ? (
        <div className="bg-zinc-900 rounded-lg border border-zinc-700 p-12 text-center">
          <p className="text-zinc-400">
            No categories yet. Add your first category to build your price list.
          </p>
        </div>
      ) : (
        <SortableList
          items={categories}
          onReorder={handleReorderCategories}
          keyExtractor={(cat) => cat.id}
          className="space-y-3"
          renderItem={(category) => (
            <CategoryCard
              category={category}
              isExpanded={!collapsedCategoryIds.includes(category.id)}
              onToggleExpanded={() => handleToggleCategory(category.id)}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onAddItem={handleAddItem}
              onUpdateItem={handleUpdateItem}
              onDeleteItem={handleDeleteItem}
              onReorderItems={handleReorderItems}
            />
          )}
        />
      )}

      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setNewCategoryName('');
          setIsAddModalOpen(false);
        }}
        title="Add Category"
      >
        <div className="space-y-4">
          <Input
            label="Category Name"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="e.g., Base Cabinets"
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setNewCategoryName('');
                setIsAddModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddCategory}>Add Category</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
