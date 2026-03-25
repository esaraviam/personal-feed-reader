import { useState, useCallback } from 'react';
import { useFeedStore } from '../store/feedStore';
import type { CategoryId, UserCategory } from '../domain/types';

export interface UseCategoriesReturn {
  categories: UserCategory[];
  activeCategoryId: CategoryId;
  /** Select a category and close the sheet in one call. */
  selectCategory: (id: CategoryId) => void;
  sheetOpen: boolean;
  openSheet: () => void;
  closeSheet: () => void;
  getArticleCount: (id: CategoryId) => number;
}

/**
 * Encapsulates all category-navigation state:
 *  - sorted category list from the store
 *  - active category (delegated to the store)
 *  - bottom-sheet open/close state (local)
 *  - article-count lookup per category
 */
export function useCategories(): UseCategoriesReturn {
  const {
    categories,
    activeCategoryId,
    setActiveCategoryId,
    getCategoryArticles,
  } = useFeedStore();

  const [sheetOpen, setSheetOpen] = useState(false);

  // Stable sort — categories are already an array, sort by `order`
  const sortedCategories = [...categories].sort((a, b) => a.order - b.order);

  const selectCategory = useCallback(
    (id: CategoryId) => {
      setActiveCategoryId(id);
      setSheetOpen(false);
    },
    [setActiveCategoryId],
  );

  const openSheet = useCallback(() => setSheetOpen(true), []);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const getArticleCount = useCallback(
    (id: CategoryId) => getCategoryArticles(id).length,
    [getCategoryArticles],
  );

  return {
    categories: sortedCategories,
    activeCategoryId,
    selectCategory,
    sheetOpen,
    openSheet,
    closeSheet,
    getArticleCount,
  };
}
