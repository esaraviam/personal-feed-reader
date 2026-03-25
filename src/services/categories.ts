import type { UserCategory } from '../domain/types';

/**
 * Built-in categories. IDs deliberately match the old Category union literals
 * ('chile' | 'global' | 'tech' | 'custom') so that existing IndexedDB records
 * continue to resolve correctly after the v1 → v2 migration.
 *
 * isDefault: true — can be renamed/reordered but not deleted.
 */
export const DEFAULT_CATEGORIES: UserCategory[] = [
  {
    id: 'chile',
    name: 'Chile',
    color: '#f43f5e',
    icon: '🇨🇱',
    order: 0,
    isDefault: true,
    createdAt: 0,
  },
  {
    id: 'global',
    name: 'Global',
    color: '#3b82f6',
    icon: '🌍',
    order: 1,
    isDefault: true,
    createdAt: 0,
  },
  {
    id: 'tech',
    name: 'Tech',
    color: '#8b5cf6',
    icon: '💻',
    order: 2,
    isDefault: true,
    createdAt: 0,
  },
  {
    id: 'custom',
    name: 'Custom',
    color: '#f59e0b',
    icon: '📌',
    order: 3,
    isDefault: true,
    createdAt: 0,
  },
];
