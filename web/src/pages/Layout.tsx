import { useState, useRef, useEffect } from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import SearchModal from "../components/SearchModal";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [fabOpen, setFabOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fabOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setFabOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [fabOpen]);

  useEffect(() => {
    const open = () => setSearchOpen(true);
    window.addEventListener("open-global-search", open);
    return () => window.removeEventListener("open-global-search", open);
  }, []);

  const handleItemAdd = () => {
    setFabOpen(false);
    const isBrowseRoute = location.pathname.startsWith("/browse");
    if (isBrowseRoute) {
      window.dispatchEvent(new CustomEvent("open-hierarchy-add-modal"));
      return;
    }
    navigate("/browse", { state: { openAddModal: true } });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
        <div className="mx-auto flex h-14 max-w-content items-center justify-end px-4 sm:px-6">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="rounded-md p-2 text-muted hover:bg-black/5 hover:text-foreground transition-colors"
            title="검색"
            aria-label="검색"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>
      </header>

      <SearchModal
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onSelectResult={(id) => navigate(`/browse/${id}`)}
      />
      <main className="flex-1">
        <Outlet />
      </main>

      {/* 우측 하단 추가 버튼: 항목 추가 */}
      <div className="fixed bottom-8 right-8 z-30" ref={menuRef}>
        {fabOpen && (
          <div className="absolute bottom-14 right-0 flex flex-col gap-0 rounded-xl border border-border bg-surface py-1 shadow-lg">
            <Link
              to="#"
              onClick={(e) => {
                e.preventDefault();
                handleItemAdd();
              }}
              className="whitespace-nowrap px-4 py-2.5 text-left text-sm font-medium text-foreground hover:bg-primary/10 hover:text-primary transition-colors rounded-t-xl"
            >
              항목 추가
            </Link>
          </div>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFabOpen((o) => !o);
          }}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary/90 transition-colors text-xl leading-none"
          aria-label="추가"
        >
          +
        </button>
      </div>
    </div>
  );
}
