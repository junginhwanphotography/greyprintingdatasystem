import { useParams, useNavigate, useLocation } from "react-router-dom";
import { trpc } from "../lib/trpc";

export default function PrintDataList() {
  const { paperSizeId } = useParams<{ paperSizeId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const sizeName = (location.state as { sizeName?: string })?.sizeName ?? "";
  const breadcrumb = [
    (location.state as { cameraName?: string })?.cameraName,
    (location.state as { lensName?: string })?.lensName,
    (location.state as { formatName?: string })?.formatName,
    (location.state as { filmName?: string })?.filmName,
    (location.state as { brandName?: string })?.brandName,
    (location.state as { typeName?: string })?.typeName,
  ].filter(Boolean) as string[];

  const id = Number(paperSizeId);
  const utils = trpc.useUtils();
  const { data: list = [], isLoading } = trpc.printData.list.useQuery({ paperSizeId: id });
  const createMutation = trpc.printData.create.useMutation({
    onSuccess: (newId) => {
      utils.printData.list.invalidate();
      navigate(`/browse/print-data/${newId}`, {
        state: { ...(location.state as object), paperSizeId: id, isDraft: true },
      });
    },
  });

  const handleAdd = () => {
    createMutation
      .mutateAsync({ paperSizeId: id })
      .catch((err: unknown) => {
        let msg = "추가에 실패했습니다.";
        if (err && typeof err === "object") {
          const e = err as { message?: string; data?: { message?: string } };
          msg = e.data?.message ?? e.message ?? msg;
        }
        if (msg.includes("fetch") || msg.includes("Network") || msg.includes("Failed to fetch"))
          msg = "API 서버에 연결할 수 없습니다. 서버가 실행 중인지, 주소/포트(예: .env의 VITE_API_URL)를 확인해 주세요.";
        alert(msg);
      });
  };

  const withUnit = (value?: string | null, prefix = "", suffix = "") => {
    const v = value?.trim();
    return v ? `${prefix}${v}${suffix}` : "—";
  };

  return (
    <div className="mx-auto max-w-content px-4 py-6 sm:px-6">
      <header className="mb-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 text-sm text-muted hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        {breadcrumb.length > 0 && (
          <p className="mb-1 text-xs text-muted truncate">{breadcrumb.join(" › ")}</p>
        )}
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{sizeName}</h1>
        <p className="mt-1 text-sm text-muted">인화 데이터를 선택하거나 새로 추가하세요</p>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3 pb-24">
          {list.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() =>
                navigate(`/browse/print-data/${item.id}`, {
                  state: { ...(location.state as object), sizeName, paperSizeId: id },
                })
              }
              className="w-full rounded-xl border border-border bg-surface px-4 py-4 text-left hover:border-zinc-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {item.title?.trim() && (
                    <p className="mb-2 truncate font-medium text-foreground">{item.title.trim()}</p>
                  )}
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 md:grid-cols-6">
                    <div>
                      <p className="text-xs text-muted">헤드높이</p>
                      <p className="font-medium text-foreground">{withUnit(item.enlargerHeight, "", " cm")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">조리개</p>
                      <p className="font-medium text-foreground">{withUnit(item.aperture, "f/")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">시간</p>
                      <p className="font-medium text-foreground">{withUnit(item.exposureTime, "", " 초")}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">C</p>
                      <p className="font-medium text-foreground">{withUnit(item.filterCyan)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">M</p>
                      <p className="font-medium text-foreground">{withUnit(item.filterMagenta)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Y</p>
                      <p className="font-medium text-foreground">{withUnit(item.filterYellow)}</p>
                    </div>
                  </div>
                </div>
                <svg className="mt-1 h-5 w-5 shrink-0 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}

          <button
            type="button"
            onClick={handleAdd}
            disabled={createMutation.isPending}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary bg-primary/5 px-4 py-4 text-primary hover:bg-primary/10 disabled:opacity-50 transition-colors font-medium"
          >
            {createMutation.isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <span className="text-lg leading-none">+</span>
                다른 데이터 추가
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
