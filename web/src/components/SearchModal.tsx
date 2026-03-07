import { useState, useCallback, useRef, useEffect } from "react";
import { trpc } from "../lib/trpc";

const RECENT_KEY = "search-recent";
const MAX_RECENT = 6;

function getRecentQueries(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function pushRecentQuery(query: string) {
  const q = query.trim();
  if (!q) return;
  const recent = getRecentQueries().filter((x) => x !== q);
  recent.unshift(q);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function highlightText(text: string, query: string): React.ReactNode {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter((t) => t.length > 0);
  if (tokens.length === 0) return text;
  const lower = text.toLowerCase();
  const parts: { str: string; match: boolean }[] = [];
  let lastEnd = 0;
  for (let i = 0; i < lower.length; i++) {
    let matched = false;
    for (const t of tokens) {
      if (t && lower.slice(i, i + t.length) === t) {
        if (i > lastEnd) parts.push({ str: text.slice(lastEnd, i), match: false });
        parts.push({ str: text.slice(i, i + t.length), match: true });
        lastEnd = i + t.length;
        i = lastEnd - 1;
        matched = true;
        break;
      }
    }
  }
  if (lastEnd < text.length) parts.push({ str: text.slice(lastEnd), match: false });
  if (parts.length === 0) return text;
  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <mark key={i} className="bg-primary/20 text-foreground rounded px-0.5">
            {p.str}
          </mark>
        ) : (
          <span key={i}>{p.str}</span>
        )
      )}
    </>
  );
}

/** 경로를 단계별로 나눠 한눈에 보이게 (세그먼트 + 구분자) */
function PathSegments({ path, query }: { path: string; query: string }) {
  const segments = path.split(" › ").filter(Boolean);
  if (segments.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
      {segments.map((seg, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="rounded-md border border-zinc-300 bg-zinc-100 px-2.5 py-1 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
            {highlightText(seg, query)}
          </span>
          {i < segments.length - 1 && (
            <span className="shrink-0 text-zinc-500 dark:text-zinc-400 font-medium" aria-hidden>
              ›
            </span>
          )}
        </span>
      ))}
    </div>
  );
}

export interface SearchModalProps {
  open: boolean;
  onClose: () => void;
  onSelectResult: (nodeId: number) => void;
}

export default function SearchModal({ open, onClose, onSelectResult }: SearchModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [recentQueries, setRecentQueries] = useState<string[]>(getRecentQueries);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(text.trim()), 200);
  }, []);

  const { data, isLoading, isError, error, refetch } = trpc.nodes.searchSmart.useQuery(
    { query: debouncedQuery },
    { enabled: open && debouncedQuery.length >= 1 }
  );

  const results = data?.results ?? [];
  const suggestions = data?.suggestions ?? [];
  const usedAI = data?.usedAI ?? false;

  const handleSelectResult = useCallback(
    (id: number) => {
      if (debouncedQuery) pushRecentQuery(debouncedQuery);
      setRecentQueries(getRecentQueries());
      onClose();
      onSelectResult(id);
    },
    [debouncedQuery, onClose, onSelectResult]
  );

  const handleSuggestionClick = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setDebouncedQuery(suggestion);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (open) {
      setRecentQueries(getRecentQueries());
      inputRef.current?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-2xl bg-surface border border-border shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-4 border-b border-border shrink-0">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-background px-3 py-2.5 flex-1 min-w-0 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/40">
            <svg className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="카메라, 렌즈, 필름, 인화지 등..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
              autoComplete="off"
            />
            {query.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setDebouncedQuery("");
                  inputRef.current?.focus();
                }}
                className="rounded-md p-1.5 text-muted hover:bg-zinc-100 hover:text-foreground transition-colors"
                aria-label="지우기"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted hover:bg-black/5 hover:text-foreground transition-colors shrink-0"
            aria-label="닫기"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0 p-4">
          {!debouncedQuery ? (
            <div className="space-y-6">
              {recentQueries.length > 0 && (
                <section>
                  <p className="mb-2 text-xs font-medium text-muted">최근 검색</p>
                  <div className="flex flex-wrap gap-2">
                    {recentQueries.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleSuggestionClick(q)}
                        className="rounded-full border border-border bg-surface px-3 py-1.5 text-sm text-foreground hover:border-primary hover:text-primary transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </section>
              )}
              <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-10 text-center">
                <p className="text-sm font-medium text-muted">검색어를 입력하세요</p>
                <p className="mt-1 text-xs text-muted">이름·경로 일부만 쳐도 찾아줍니다</p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {["일포드", "캐논", "50mm", "35mm", "Ilford", "판형"].map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => handleQueryChange(example)}
                      className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted hover:border-primary hover:text-primary transition-colors"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <p className="text-sm text-muted">검색 중...</p>
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-border bg-surface/50 py-10 px-4 text-center">
              <p className="text-sm font-medium text-muted">검색 요청에 실패했습니다</p>
              <p className="mt-1 text-xs text-muted">
                API 서버 연결을 확인해 주세요. (웹과 API 포트가 맞는지 확인)
              </p>
              <button
                type="button"
                onClick={() => refetch()}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
              >
                다시 시도
              </button>
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-10 px-4 text-center">
              <p className="text-sm font-medium text-muted">검색 결과 없음</p>
              <p className="mt-1 text-xs text-muted">"{debouncedQuery}"에 맞는 항목이 없습니다</p>
              {suggestions.length > 0 && (
                <div className="mt-5">
                  <p className="text-xs text-muted mb-2">이렇게 검색해 보세요</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleSuggestionClick(s)}
                        className="rounded-full border border-primary/50 bg-primary/5 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1 pb-4">
              <p className="mb-3 text-xs text-muted flex items-center gap-2">
                {results.length}개 결과 · 클릭하면 해당 위치로 이동
                {usedAI && (
                  <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-medium text-primary">AI 검색</span>
                )}
              </p>
              {results.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectResult(item.id)}
                  className="flex w-full items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3.5 text-left hover:border-primary/30 hover:shadow-sm transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-foreground">
                      {highlightText(item.name, debouncedQuery)}
                    </p>
                    {item.path && (
                      <PathSegments path={item.path} query={debouncedQuery} />
                    )}
                  </div>
                  <svg className="h-5 w-5 shrink-0 text-muted mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
