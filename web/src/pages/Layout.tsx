import { useState, useRef, useEffect } from "react";
import { Outlet, NavLink, Link, useLocation, useNavigate } from "react-router-dom";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [fabOpen, setFabOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!fabOpen) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setFabOpen(false);
    };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [fabOpen]);

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
        <div className="mx-auto flex h-14 max-w-content items-center justify-between px-4 sm:px-6">
          <Link
            to="/browse"
            className="text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            Grey Printing
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink
              to="/browse"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-foreground hover:bg-black/5"
                }`
              }
            >
              Browse
            </NavLink>
            <NavLink
              to="/search"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-foreground hover:bg-black/5"
                }`
              }
            >
              Search
            </NavLink>
          </nav>
        </div>
      </header>
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
