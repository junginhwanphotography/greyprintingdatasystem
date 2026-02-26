import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc";

export default function Search() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(text.trim()), 300);
  }, []);

  const { data: results = [], isLoading } = trpc.nodes.search.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 1 }
  );

  // Smart client-side scoring
  const scored = debouncedQuery
    ? results
        .map((item) => {
          const lower = item.name.toLowerCase();
          const kw = debouncedQuery.toLowerCase();
          let s = 0;
          if (lower.includes(kw)) s += 5;
          if (lower.startsWith(kw)) s += 3;
          if (lower === kw) s += 10;
          return { ...item, _score: s };
        })
        .filter((i) => i._score > 0)
        .sort((a, b) => b._score - a._score)
    : [];

  return (
    <div className="mx-auto max-w-content px-4 py-6 sm:px-6">
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">검색</h1>
        <p className="mt-1 text-sm text-muted">항목을 검색해 바로 이동하세요</p>
      </header>

      <div className="mb-8">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/20">
          <svg className="h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="예: Canon, 35mm, Ilford..."
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-sm text-foreground placeholder:text-muted focus:outline-none"
          />
          {query.length > 0 && (
            <button
              type="button"
              onClick={() => { setQuery(""); setDebouncedQuery(""); }}
              className="rounded-md p-1 text-muted hover:bg-zinc-100 hover:text-foreground transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {!debouncedQuery ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-16 text-center">
          <p className="text-sm font-medium text-muted">무엇을 찾고 계신가요?</p>
          <p className="mt-2 text-xs text-muted">검색어를 입력하면 결과가 표시됩니다</p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {["Canon EOS", "35mm", "Ilford"].map((example) => (
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
      ) : isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : scored.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-16 text-center">
          <p className="text-sm font-medium text-muted">검색 결과 없음</p>
          <p className="mt-1 text-xs text-muted">"{debouncedQuery}"에 대한 결과가 없습니다</p>
        </div>
      ) : (
        <div className="space-y-1 pb-24">
          <p className="mb-3 text-xs text-muted">{scored.length}개 결과</p>
          {scored.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/browse/${item.id}`)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left hover:border-zinc-200 hover:shadow-sm transition-all"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground">{item.name}</p>
                {item.description && (
                  <p className="mt-0.5 truncate text-xs text-muted">{item.description}</p>
                )}
              </div>
              <svg className="h-4 w-4 shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
