import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc";

export default function Add() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: paperSizesWithPath = [] } = trpc.paperSizes.listAllWithPath.useQuery();
  const [selectedSizeId, setSelectedSizeId] = useState<number | "">("");
  const [cameraName, setCameraName] = useState("");
  const [cameraDesc, setCameraDesc] = useState("");

  const createDataMutation = trpc.printData.create.useMutation({
    onSuccess: (newId, vars) => {
      utils.printData.listAll.invalidate();
      utils.printData.list.invalidate({ paperSizeId: vars.paperSizeId });
      const size = paperSizesWithPath.find((s) => s.id === vars.paperSizeId);
      navigate(`/browse/print-data/${newId}`, {
        state: { paperSizeId: vars.paperSizeId, sizeName: size?.name ?? "" },
      });
    },
  });
  const createCameraMutation = trpc.cameras.create.useMutation({
    onSuccess: () => {
      utils.cameras.list.invalidate();
      setCameraName("");
      setCameraDesc("");
      alert("카메라가 추가되었습니다.");
    },
  });

  const handleAddData = () => {
    const id = typeof selectedSizeId === "number" ? selectedSizeId : null;
    if (id == null) {
      alert("인화지 사이즈를 선택하세요.");
      return;
    }
    createDataMutation.mutateAsync({ paperSizeId: id }).catch(() => alert("데이터 추가에 실패했습니다."));
  };

  const handleAddCamera = () => {
    if (!cameraName.trim()) {
      alert("이름을 입력하세요.");
      return;
    }
    createCameraMutation.mutateAsync({ name: cameraName.trim(), description: cameraDesc.trim() || undefined }).catch(() =>
      alert("항목 추가에 실패했습니다.")
    );
  };

  return (
    <div className="mx-auto max-w-content px-4 py-6 sm:px-6">
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">추가</h1>
        <p className="mt-1 text-sm text-muted">항목 추가 · 인화 데이터 추가</p>
      </header>

      <div className="space-y-10 pb-24">
        {/* 데이터 추가 */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">인화 데이터 추가</h2>
          <p className="mb-4 text-sm text-muted">인화지 사이즈를 선택한 뒤 새 인화 데이터를 추가합니다.</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-medium text-muted">인화지 사이즈</span>
              <select
                value={selectedSizeId}
                onChange={(e) => setSelectedSizeId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">선택하세요</option>
                {paperSizesWithPath.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.path || s.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleAddData}
              disabled={createDataMutation.isPending || selectedSizeId === ""}
              className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {createDataMutation.isPending ? "..." : "인화 데이터 추가"}
            </button>
          </div>
        </section>

        {/* 항목 추가 */}
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">항목 추가</h2>
          <p className="mb-4 text-sm text-muted">
            카메라, 렌즈군, 판형, 필름, 브랜드, 종류, 사이즈는 Browse 탭에서 해당 단계로 이동한 뒤 + 버튼으로 추가할 수 있습니다.
          </p>
          <div className="rounded-xl border border-dashed border-border bg-background/50 p-4">
            <h3 className="mb-2 text-sm font-medium text-foreground">카메라만 여기서 추가</h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <label className="flex-1">
                <span className="mb-1 block text-xs text-muted">이름</span>
                <input
                  type="text"
                  value={cameraName}
                  onChange={(e) => setCameraName(e.target.value)}
                  placeholder="예: 35mm SLR"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
              <label className="flex-1">
                <span className="mb-1 block text-xs text-muted">설명 (선택)</span>
                <input
                  type="text"
                  value={cameraDesc}
                  onChange={(e) => setCameraDesc(e.target.value)}
                  placeholder="선택 입력"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </label>
              <button
                type="button"
                onClick={handleAddCamera}
                disabled={createCameraMutation.isPending || !cameraName.trim()}
                className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
              >
                {createCameraMutation.isPending ? "..." : "카메라 추가"}
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/browse/cameras")}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Browse에서 계층별로 추가하기 →
          </button>
        </section>
      </div>
    </div>
  );
}
