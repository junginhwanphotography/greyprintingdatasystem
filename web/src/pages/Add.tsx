import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "../lib/trpc";

export default function Add() {
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const { data: nodesWithPath = [] } = trpc.nodes.listAllWithPath.useQuery();
  const [selectedNodeId, setSelectedNodeId] = useState<number | "">("");

  const createDataMutation = trpc.printData.create.useMutation({
    onSuccess: (newId, vars) => {
      utils.printData.listAll.invalidate();
      utils.printData.list.invalidate({ nodeId: vars.nodeId });
      navigate(`/browse/print-data/${newId}`, {
        state: { nodeId: vars.nodeId, isDraft: true },
      });
    },
  });

  const handleAddData = () => {
    const id = typeof selectedNodeId === "number" ? selectedNodeId : null;
    if (id == null) {
      alert("항목을 선택하세요.");
      return;
    }
    createDataMutation.mutateAsync({ nodeId: id }).catch(() => alert("데이터 추가에 실패했습니다."));
  };

  return (
    <div className="mx-auto max-w-content px-4 py-6 sm:px-6">
      <header className="mb-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">인화 데이터 추가</h1>
        <p className="mt-1 text-sm text-muted">항목을 선택하고 새 인화 데이터를 추가합니다</p>
      </header>

      <div className="space-y-6 pb-24">
        <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h2 className="mb-4 text-base font-semibold text-foreground">항목 선택</h2>
          <p className="mb-4 text-sm text-muted">
            Browse 탭에서 해당 항목으로 이동한 뒤 "인화 데이터 추가" 버튼을 누르거나,
            아래에서 항목을 검색해 바로 추가할 수 있습니다.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1">
              <span className="mb-1 block text-xs font-medium text-muted">항목</span>
              <select
                value={selectedNodeId}
                onChange={(e) => setSelectedNodeId(e.target.value === "" ? "" : Number(e.target.value))}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="">선택하세요</option>
                {nodesWithPath.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.path || n.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleAddData}
              disabled={createDataMutation.isPending || selectedNodeId === ""}
              className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
            >
              {createDataMutation.isPending ? "..." : "인화 데이터 추가"}
            </button>
          </div>
        </section>

        <div className="rounded-xl border border-dashed border-border bg-background/50 p-4">
          <p className="text-sm text-muted">
            항목은 Browse 탭에서 각 계층에서 + 버튼으로 추가할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={() => navigate("/browse")}
            className="mt-2 text-sm font-medium text-primary hover:underline"
          >
            Browse로 이동 →
          </button>
        </div>
      </div>
    </div>
  );
}
