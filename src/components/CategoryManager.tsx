import { useState } from 'react';
import { useFeedStore } from '../store/feedStore';
import { useTranslation } from '../i18n/LanguageContext';
import type { CategoryId, UserCategory } from '../domain/types';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PRESET_COLORS = [
  '#f43f5e', // rose
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#14b8a6', // teal
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
];

const PRESET_ICONS = [
  '🌍', '🇨🇱', '💻', '📌', '⚽', '🎵', '📰', '🔬',
  '💼', '🎮', '📚', '🍔', '✈️', '🏠', '💰', '🎨',
  '🏃', '🐾', '🌱', '⭐',
];

interface EditState {
  name: string;
  color: string;
  icon: string;
  error: string;
}

interface DeleteTarget {
  category: UserCategory;
  reassignTo: CategoryId;
}

export function CategoryManager() {
  const { t } = useTranslation();
  const { categories, feeds, createCategory, updateCategory, deleteCategory, reorderCategories } =
    useFeedStore();

  const sorted = [...categories].sort((a, b) => a.order - b.order);

  // New category form
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[5]);
  const [newIcon, setNewIcon] = useState('⭐');
  const [newError, setNewError] = useState('');
  const [creating, setCreating] = useState(false);

  // Per-row inline editing
  const [editingId, setEditingId] = useState<CategoryId | null>(null);
  const [editState, setEditState] = useState<EditState>({ name: '', color: '', icon: '', error: '' });

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);

  function feedCountFor(catId: CategoryId) {
    return feeds.filter((f) => f.categoryId === catId).length;
  }

  // ── New category ────────────────────────────────────────────────────────────

  async function handleCreate() {
    const trimmed = newName.trim();
    if (!trimmed) { setNewError(t.categoryManager.nameRequired); return; }
    if (trimmed.length > 30) { setNewError(t.categoryManager.nameTooLong); return; }
    if (categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      setNewError(t.categoryManager.nameDuplicate); return;
    }
    if (categories.length >= 20) { setNewError(t.categoryManager.maxReached); return; }

    setCreating(true);
    try {
      await createCategory(trimmed, newColor, newIcon);
      toast.success(t.categoryManager.createdToast(trimmed));
      setNewName('');
      setNewError('');
    } catch (err) {
      setNewError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  // ── Inline edit ─────────────────────────────────────────────────────────────

  function startEdit(cat: UserCategory) {
    setEditingId(cat.id);
    setEditState({ name: cat.name, color: cat.color, icon: cat.icon, error: '' });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: CategoryId) {
    const trimmed = editState.name.trim();
    if (!trimmed) { setEditState((s) => ({ ...s, error: t.categoryManager.nameRequired })); return; }
    if (trimmed.length > 30) { setEditState((s) => ({ ...s, error: t.categoryManager.nameTooLong })); return; }
    if (categories.some((c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
      setEditState((s) => ({ ...s, error: t.categoryManager.nameDuplicate })); return;
    }
    try {
      await updateCategory(id, { name: trimmed, color: editState.color, icon: editState.icon });
      toast.success(t.categoryManager.updatedToast(trimmed));
      setEditingId(null);
    } catch (err) {
      setEditState((s) => ({ ...s, error: (err as Error).message }));
    }
  }

  // ── Reorder ──────────────────────────────────────────────────────────────────

  async function moveUp(index: number) {
    if (index === 0) return;
    const ids = sorted.map((c) => c.id);
    [ids[index - 1], ids[index]] = [ids[index], ids[index - 1]];
    await reorderCategories(ids);
  }

  async function moveDown(index: number) {
    if (index === sorted.length - 1) return;
    const ids = sorted.map((c) => c.id);
    [ids[index], ids[index + 1]] = [ids[index + 1], ids[index]];
    await reorderCategories(ids);
  }

  // ── Delete ───────────────────────────────────────────────────────────────────

  function openDelete(cat: UserCategory) {
    const fallback = sorted.find((c) => c.id !== cat.id)?.id ?? '';
    setDeleteTarget({ category: cat, reassignTo: fallback });
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const name = deleteTarget.category.name;
      await deleteCategory(deleteTarget.category.id, deleteTarget.reassignTo);
      toast.success(t.categoryManager.deletedToast(name));
      setDeleteTarget(null);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-0">
      {/* Category list */}
      <ul className="divide-y divide-gray-100 dark:divide-slate-800">
        {sorted.map((cat, idx) => {
          const isEditing = editingId === cat.id;
          const count = feedCountFor(cat.id);

          return (
            <li key={cat.id} className="py-3">
              {isEditing ? (
                /* ── Expanded inline editor ── */
                <div className="flex flex-col gap-3">
                  {/* Name */}
                  <input
                    type="text"
                    value={editState.name}
                    onChange={(e) => setEditState((s) => ({ ...s, name: e.target.value, error: '' }))}
                    placeholder={t.categoryManager.namePlaceholder}
                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100"
                    autoFocus
                  />
                  {editState.error && (
                    <p className="text-xs text-red-500">{editState.error}</p>
                  )}

                  {/* Icon picker */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5">{t.categoryManager.iconLabel}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {PRESET_ICONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEditState((s) => ({ ...s, icon: emoji }))}
                          className={`w-8 h-8 text-lg rounded-lg flex items-center justify-center transition-colors ${
                            editState.icon === emoji
                              ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500'
                              : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color picker */}
                  <div>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5">{t.categoryManager.colorLabel}</p>
                    <div className="flex gap-2">
                      {PRESET_COLORS.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => setEditState((s) => ({ ...s, color: hex }))}
                          style={{ backgroundColor: hex }}
                          className={`w-7 h-7 rounded-full transition-transform ${
                            editState.color === hex ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-slate-900 scale-110' : 'hover:scale-110'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => void saveEdit(cat.id)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {t.categoryManager.save}
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1.5 text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 text-xs rounded-lg transition-colors"
                    >
                      {t.categoryManager.cancel}
                    </button>
                  </div>
                </div>
              ) : (
                /* ── Collapsed row ── */
                <div className="flex items-center gap-3">
                  {/* Color dot + icon */}
                  <span
                    className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0"
                    style={{ backgroundColor: cat.color + '22', border: `2px solid ${cat.color}` }}
                  >
                    {cat.icon}
                  </span>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{cat.name}</span>
                      {cat.isDefault && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-slate-700 text-gray-400 dark:text-slate-500 rounded-full flex-shrink-0">
                          {t.categoryManager.defaultBadge}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 dark:text-slate-500">{t.categoryManager.feedCount(count)}</p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Up/Down */}
                    <button
                      onClick={() => void moveUp(idx)}
                      disabled={idx === 0}
                      className="p-1 text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 disabled:opacity-30 transition-colors"
                      aria-label="Move up"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => void moveDown(idx)}
                      disabled={idx === sorted.length - 1}
                      className="p-1 text-gray-300 dark:text-slate-600 hover:text-gray-500 dark:hover:text-slate-400 disabled:opacity-30 transition-colors"
                      aria-label="Move down"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1 text-gray-300 dark:text-slate-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
                      aria-label={`Edit ${cat.name}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>

                    {/* Delete */}
                    <button
                      onClick={() => cat.isDefault ? toast.error(t.categoryManager.cannotDelete) : openDelete(cat)}
                      className={`p-1 transition-colors ${
                        cat.isDefault
                          ? 'text-gray-200 dark:text-slate-700 cursor-not-allowed'
                          : 'text-gray-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-500'
                      }`}
                      aria-label={`Delete ${cat.name}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {/* ── New Category Form ── */}
      <div className="pt-4 border-t border-gray-100 dark:border-slate-800 mt-2">
        <p className="text-xs font-medium text-gray-700 dark:text-slate-300 mb-3">{t.categoryManager.addTitle}</p>

        {/* Icon picker */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5">{t.categoryManager.iconLabel}</p>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_ICONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => setNewIcon(emoji)}
                className={`w-8 h-8 text-lg rounded-lg flex items-center justify-center transition-colors ${
                  newIcon === emoji
                    ? 'bg-blue-100 dark:bg-blue-900/40 ring-2 ring-blue-500'
                    : 'bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div className="mb-3">
          <p className="text-xs text-gray-500 dark:text-slate-400 mb-1.5">{t.categoryManager.colorLabel}</p>
          <div className="flex gap-2">
            {PRESET_COLORS.map((hex) => (
              <button
                key={hex}
                type="button"
                onClick={() => setNewColor(hex)}
                style={{ backgroundColor: hex }}
                className={`w-7 h-7 rounded-full transition-transform ${
                  newColor === hex ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-slate-900 scale-110' : 'hover:scale-110'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Name + Add */}
        <div className="flex gap-2">
          <div className="flex-1">
            <input
              type="text"
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setNewError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') void handleCreate(); }}
              placeholder={t.categoryManager.namePlaceholder}
              maxLength={30}
              className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500"
            />
            {newError && <p className="text-xs text-red-500 mt-1">{newError}</p>}
          </div>
          <button
            type="button"
            onClick={() => void handleCreate()}
            disabled={creating || !newName.trim()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex-shrink-0"
          >
            {t.categoryManager.add}
          </button>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.categoryManager.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? t.categoryManager.deleteDesc(deleteTarget.category.name) : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteTarget && (
            <div className="px-1 py-2">
              <Select
                value={deleteTarget.reassignTo}
                onValueChange={(v) => setDeleteTarget((dt) => dt ? { ...dt, reassignTo: v as CategoryId } : dt)}
              >
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder={t.categoryManager.moveTo} />
                </SelectTrigger>
                <SelectContent>
                  {sorted
                    .filter((c) => c.id !== deleteTarget.category.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{t.categoryManager.cancelDelete}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              disabled={deleting || !deleteTarget?.reassignTo}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-500"
            >
              {t.categoryManager.confirmDelete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
