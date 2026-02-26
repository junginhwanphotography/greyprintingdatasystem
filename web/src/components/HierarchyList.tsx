import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export type ClipboardEntityType = "camera" | "lens" | "format" | "film" | "brand" | "type" | "size";

interface ClipboardState {
  entityType: ClipboardEntityType;
  id: number;
  name: string;
}

const CLIPBOARD_KEY = "hierarchy-clipboard";

function readClipboard(): ClipboardState | null {
  try {
    const raw = localStorage.getItem(CLIPBOARD_KEY);
    return raw ? (JSON.parse(raw) as ClipboardState) : null;
  } catch {
    return null;
  }
}

function writeClipboard(state: ClipboardState) {
  localStorage.setItem(CLIPBOARD_KEY, JSON.stringify(state));
}

function clearClipboard() {
  localStorage.removeItem(CLIPBOARD_KEY);
}

export interface HierarchyItem {
  id: number;
  name: string;
  description?: string | null;
  childCount?: number;
}

interface HierarchyListProps {
  title: string;
  breadcrumb: string[];
  items: HierarchyItem[];
  isLoading: boolean;
  onItemPress: (item: HierarchyItem) => void;
  onAddItem: (name: string, description?: string) => Promise<void>;
  onDeleteItem: (item: HierarchyItem) => Promise<void>;
  onRenameItem?: (item: HierarchyItem, newName: string) => Promise<void>;
  /** 현재 페이지 항목 유형 — 붙여넣기 호환성 판단에 사용 */
  entityType?: ClipboardEntityType;
  /** 클립보드의 항목을 현재 위치에 복사 */
  onPasteItem?: (clipboardId: number) => Promise<void>;
  emptyMessage?: string;
}

export default function HierarchyList({
  title,
  breadcrumb,
  items,
  isLoading,
  onItemPress,
  onAddItem,
  onDeleteItem,
  onRenameItem,
  entityType,
  onPasteItem,
  emptyMessage = "항목이 없습니다",
}: HierarchyListProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedItem, setSelectedItem] = useState<HierarchyItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isPasting, setIsPasting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState<number | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<HierarchyItem | null>(null);
  const [clipboard, setClipboard] = useState<ClipboardState | null>(() => readClipboard());

  const canPaste = !!clipboard && clipboard.entityType === entityType && !!onPasteItem;

  const filteredItems = searchQuery.trim()
    ? items.filter((item) => {
        const query = searchQuery.toLowerCase();
        const keywords = query.split(/[\s,]+/).filter((k) => k.length > 0);
        return keywords.every((kw) => item.name.toLowerCase().includes(kw));
      })
    : items;

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      await onAddItem(newName.trim(), newDescription.trim() || undefined);
      setNewName("");
      setNewDescription("");
      setShowAddModal(false);
    } catch {
      alert("항목 추가에 실패했습니다.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = (item: HierarchyItem) => {
    setMenuOpen(null);
    setDeleteConfirmItem(item);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirmItem) return;
    const item = deleteConfirmItem;
    setDeleteConfirmItem(null);
    onDeleteItem(item).catch(() => alert("삭제에 실패했습니다."));
  };

  const handleRename = (item: HierarchyItem) => {
    setMenuOpen(null);
    setSelectedItem(item);
    setNewName(item.name);
    setShowRenameModal(true);
  };

  const handleConfirmRename = async () => {
    if (!selectedItem || !newName.trim() || !onRenameItem) return;
    try {
      await onRenameItem(selectedItem, newName.trim());
      setShowRenameModal(false);
      setNewName("");
      setSelectedItem(null);
    } catch {
      alert("이름 변경에 실패했습니다.");
    }
  };

  const handleCopy = (item: HierarchyItem) => {
    if (!entityType) return;
    const state: ClipboardState = { entityType, id: item.id, name: item.name };
    writeClipboard(state);
    setClipboard(state);
    setMenuOpen(null);
  };

  const handlePaste = async () => {
    if (!clipboard || !onPasteItem) return;
    setIsPasting(true);
    try {
      await onPasteItem(clipboard.id);
      clearClipboard();
      setClipboard(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert(`붙여넣기에 실패했습니다.\n${msg}`);
    } finally {
      setIsPasting(false);
    }
  };

  const handleClearClipboard = () => {
    clearClipboard();
    setClipboard(null);
  };

  useEffect(() => {
    const openModal = () => {
      setNewName("");
      setNewDescription("");
      setShowAddModal(true);
    };
    window.addEventListener("open-hierarchy-add-modal", openModal as EventListener);
    return () => window.removeEventListener("open-hierarchy-add-modal", openModal as EventListener);
  }, []);

  useEffect(() => {
    const state = location.state as { openAddModal?: boolean } | null;
    if (state?.openAddModal) {
      setNewName("");
      setNewDescription("");
      setShowAddModal(true);
      navigate(location.pathname, { replace: true, state: { ...(state ?? {}), openAddModal: false } });
    }
  }, [location.pathname, location.state, navigate]);

  return (
    <div className="mx-auto max-w-content px-4 py-6 sm:px-6">
      <header className="mb-8">
        {breadcrumb.length > 0 && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-4 text-sm text-muted hover:text-foreground transition-colors"
          >
            ← Back
          </button>
        )}
        {breadcrumb.length > 0 && (
          <p className="mb-1 text-xs text-muted truncate">
            {breadcrumb.join(" › ")}
          </p>
        )}
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          <button
            type="button"
            onClick={() => setShowSearchModal(true)}
            className="rounded-md p-2 text-muted hover:bg-black/5 hover:text-foreground transition-colors"
            title="검색"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        {/* 붙여넣기 배너 */}
        {canPaste && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
            <svg className="h-4 w-4 shrink-0 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="min-w-0 flex-1 truncate text-sm text-foreground">
              <span className="font-medium text-primary">복사됨:</span> {clipboard!.name}
            </p>
            <button
              type="button"
              onClick={handlePaste}
              disabled={isPasting}
              className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isPasting ? "복사 중..." : "붙여넣기"}
            </button>
            <button
              type="button"
              onClick={handleClearClipboard}
              className="shrink-0 rounded-md p-1 text-muted hover:text-foreground transition-colors"
              title="클립보드 지우기"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-16 text-center">
          <p className="text-sm font-medium text-muted">{emptyMessage}</p>
          <p className="mt-1 text-xs text-muted">아래 버튼으로 항목을 추가하세요</p>
          <button
            type="button"
            onClick={() => { setNewName(""); setNewDescription(""); setShowAddModal(true); }}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <span className="text-lg leading-none">+</span> 추가
          </button>
        </div>
      ) : (
        <ul className="space-y-1 pb-24">
          {filteredItems.map((item) => (
            <li
              key={item.id}
              className="group relative rounded-xl bg-surface border border-border hover:border-zinc-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  onClick={() => onItemPress(item)}
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground truncate">{item.name}</p>
                    {item.description && (
                      <p className="mt-0.5 truncate text-xs text-muted">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.childCount !== undefined && item.childCount > 0 && (
                      <span className="rounded-md bg-zinc-100 px-2 py-0.5 text-xs font-medium text-muted">
                        {item.childCount}
                      </span>
                    )}
                    <svg className="h-4 w-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
                <div className="relative flex items-center">
                  <button
                    type="button"
                    onClick={() => setMenuOpen(menuOpen === item.id ? null : item.id)}
                    className="rounded-md p-1.5 text-muted hover:bg-black/5 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label="메뉴"
                  >
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </button>
                  {menuOpen === item.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(null)} />
                      <div className="absolute right-0 top-full z-20 mt-1 w-36 rounded-lg border border-border bg-surface py-1 shadow-lg">
                        {onRenameItem && (
                          <button
                            type="button"
                            onClick={() => handleRename(item)}
                            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-zinc-50"
                          >
                            이름 변경
                          </button>
                        )}
                        {entityType && (
                          <button
                            type="button"
                            onClick={() => handleCopy(item)}
                            className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-zinc-50"
                          >
                            복사
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          삭제
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={() => setShowAddModal(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">새 항목 추가</h3>
            <input
              type="text"
              placeholder="이름"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAdd();
                }
              }}
              className="mb-3 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
              disabled={isAdding}
              autoFocus
            />
            <textarea
              placeholder="설명 (선택)"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              className="mb-5 w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
              disabled={isAdding}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                disabled={isAdding}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-zinc-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={isAdding}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                {isAdding ? "..." : "추가"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {showRenameModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={() => { setShowRenameModal(false); setSelectedItem(null); }}>
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-4">이름 변경</h3>
            <input
              type="text"
              placeholder="새 이름"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleConfirmRename();
                }
              }}
              className="mb-5 w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowRenameModal(false); setSelectedItem(null); }}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-zinc-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmRename}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                변경
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={() => setDeleteConfirmItem(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-2">삭제 확인</h3>
            <p className="text-sm text-muted mb-1">
              <span className="font-medium text-foreground">"{deleteConfirmItem.name}"</span>을(를) 삭제하시겠습니까?
            </p>
            <p className="text-sm text-red-500 mb-6">하위 항목과 인화 데이터가 모두 삭제되며 복구할 수 없습니다.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-zinc-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 rounded-lg bg-red-500 py-2.5 text-sm font-medium text-white hover:bg-red-600 transition-colors"
              >
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search modal */}
      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={() => { setShowSearchModal(false); setSearchQuery(""); }}>
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">검색</h3>
              <button
                type="button"
                onClick={() => { setShowSearchModal(false); setSearchQuery(""); }}
                className="rounded-md p-1.5 text-muted hover:bg-zinc-100 hover:text-foreground transition-colors"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <input
              type="text"
              placeholder="검색어 입력"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="mx-4 mt-3 rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
              autoFocus
            />
            {searchQuery.trim() && (
              <p className="mx-4 mt-2 text-xs text-muted">{filteredItems.length}개</p>
            )}
            <ul className="overflow-y-auto p-4 pt-2 max-h-64">
              {filteredItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-zinc-50 transition-colors"
                    onClick={() => { setShowSearchModal(false); setSearchQuery(""); onItemPress(item); }}
                  >
                    <span className="font-medium text-foreground">{item.name}</span>
                    <svg className="h-4 w-4 shrink-0 text-muted ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
