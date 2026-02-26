import { useState } from "react";
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
  const deleteMutation = trpc.printData.delete.useMutation({
    onSuccess: () => utils.printData.list.invalidate(),
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");

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

  const handleDeleteClick = (e: React.MouseEvent, itemId: number, itemTitle?: string | null) => {
    e.stopPropagation();
    setDeleteConfirmId(itemId);
    setDeleteConfirmTitle(itemTitle?.trim() || "");
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmId == null) return;
    deleteMutation.mutate({ id: deleteConfirmId });
    setDeleteConfirmId(null);
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
            <div
              key={item.id}
              className="group relative rounded-xl border border-border bg-surface hover:border-zinc-200 hover:shadow-sm transition-all"
            >
              <button
                type="button"
                onClick={() =>
                  navigate(`/browse/print-data/${item.id}`, {
                    state: { ...(location.state as object), sizeName, paperSizeId: id },
                  })
                }
                className="w-full px-4 py-4 text-left"
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
              <button
                type="button"
                onClick={(e) => handleDeleteClick(e, item.id, item.title)}
                className="absolute right-2 top-2 rounded-md p-1.5 text-muted opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                title="삭제"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
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

      {/* Delete confirm modal */}
      {deleteConfirmId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={() => setDeleteConfirmId(null)}>
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-2">데이터 삭제</h3>
            <p className="text-sm text-muted mb-1">
              {deleteConfirmTitle
                ? <><span className="font-medium text-foreground">"{deleteConfirmTitle}"</span>을(를) 삭제하시겠습니까?</>
                : "이 인화 데이터를 삭제하시겠습니까?"}
            </p>
            <p className="text-sm text-red-500 mb-6">삭제된 데이터는 복구할 수 없습니다.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
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
    </div>
  );
}
