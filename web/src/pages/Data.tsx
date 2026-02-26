import { useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc";

function Block({
  item,
  onClick,
}: {
  item: {
    id: number;
    title?: string | null;
    sizeName: string;
    enlargerHeight?: string | null;
    aperture?: string | null;
    exposureTime?: string | null;
    filterYellow?: string | null;
    filterMagenta?: string | null;
    filterCyan?: string | null;
  };
  onClick: () => void;
}) {
  const label = item.title?.trim() || item.sizeName || `#${item.id}`;
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-border bg-surface p-4 text-left shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
    >
      <p className="mb-3 truncate text-sm font-medium text-foreground">{label}</p>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 md:grid-cols-6">
        <div>
          <span className="text-muted">헤드높이</span>
          <p className="font-medium text-foreground">{item.enlargerHeight?.trim() || "—"}{item.enlargerHeight?.trim() ? " cm" : ""}</p>
        </div>
        <div>
          <span className="text-muted">조리개</span>
          <p className="font-medium text-foreground">{item.aperture?.trim() ? `f/${item.aperture.trim()}` : "—"}</p>
        </div>
        <div>
          <span className="text-muted">시간</span>
          <p className="font-medium text-foreground">{item.exposureTime?.trim() || "—"}{item.exposureTime?.trim() ? " 초" : ""}</p>
        </div>
        <div>
          <span className="text-muted">C</span>
          <p className="font-medium text-foreground">{item.filterCyan?.trim() ?? "—"}</p>
        </div>
        <div>
          <span className="text-muted">M</span>
          <p className="font-medium text-foreground">{item.filterMagenta?.trim() ?? "—"}</p>
        </div>
        <div>
          <span className="text-muted">Y</span>
          <p className="font-medium text-foreground">{item.filterYellow?.trim() ?? "—"}</p>
        </div>
      </div>
    </button>
  );
}

export default function Data() {
  const navigate = useNavigate();
  const { data: list = [], isLoading } = trpc.printData.listAll.useQuery();

  return (
    <div className="mx-auto max-w-content px-4 py-6 sm:px-6">
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">인화 데이터</h1>
        <p className="mt-1 text-sm text-muted">한눈에 보기 · 클릭하면 상세 열람 및 수정</p>
      </header>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-12 text-center">
          <p className="text-sm text-muted">등록된 인화 데이터가 없습니다</p>
          <button
            type="button"
            onClick={() => navigate("/add")}
            className="mt-3 text-sm font-medium text-primary hover:underline"
          >
            추가 탭에서 데이터 추가 →
          </button>
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {list.map((item) => (
            <Block
              key={item.id}
              item={item}
              onClick={() =>
                navigate(`/browse/print-data/${item.id}`, {
                  state: { sizeName: item.sizeName, paperSizeId: item.paperSizeId },
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
