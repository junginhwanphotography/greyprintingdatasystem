import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { trpc } from "../lib/trpc";

const FIELDS: { key: string; label: string; placeholder: string; unit?: string }[] = [
  { key: "exposureTime", label: "노출 시간", placeholder: "예: 8초", unit: "sec" },
  { key: "aperture", label: "조리개", placeholder: "예: f/5.6", unit: "f/" },
  { key: "filterYellow", label: "필터 — Yellow", placeholder: "예: 45", unit: "Y" },
  { key: "filterMagenta", label: "필터 — Magenta", placeholder: "예: 30", unit: "M" },
  { key: "filterCyan", label: "필터 — Cyan", placeholder: "예: 0", unit: "C" },
  { key: "developer", label: "현상액", placeholder: "예: Dektol 1:2" },
  { key: "developmentTime", label: "현상 시간", placeholder: "예: 2분 30초", unit: "min" },
  { key: "temperature", label: "온도", placeholder: "예: 20°C", unit: "°C" },
  { key: "dilution", label: "희석 비율", placeholder: "예: 1:2" },
  { key: "enlargerHeight", label: "확대기 높이", placeholder: "예: 35cm", unit: "cm" },
  { key: "testStrip", label: "테스트 스트립 메모", placeholder: "테스트 스트립 결과를 기록하세요" },
  { key: "notes", label: "메모", placeholder: "추가 메모를 입력하세요" },
];

type FieldsState = Record<string, string>;

const emptyFields: FieldsState = FIELDS.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {});

export default function PrintData() {
  const { printDataId } = useParams<{ printDataId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const nodeId = (location.state as { nodeId?: number })?.nodeId;

  const id = Number(printDataId);
  const isDraft = Boolean((location.state as { isDraft?: boolean } | null)?.isDraft);
  const hasSavedRef = useRef(false);
  const utils = trpc.useUtils();
  const { data: printData, isLoading } = trpc.printData.get.useQuery({ id });
  const deleteMutation = trpc.printData.delete.useMutation();
  const upsertMutation = trpc.printData.upsert.useMutation({
    onSuccess: () => {
      hasSavedRef.current = true;
      utils.printData.get.invalidate();
      if (dataNodeId != null) utils.printData.list.invalidate({ nodeId: dataNodeId });
    },
  });

  const [isEditing, setIsEditing] = useState(isDraft);
  const [showDetail, setShowDetail] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [title, setTitle] = useState("");
  const [fields, setFields] = useState<FieldsState>(emptyFields);
  const [extraData, setExtraData] = useState<{ key: string; value: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (printData) {
      setTitle(printData.title ?? "");
      setFields({
        exposureTime: printData.exposureTime ?? "",
        aperture: printData.aperture ?? "",
        filterYellow: printData.filterYellow ?? "",
        filterMagenta: printData.filterMagenta ?? "",
        filterCyan: printData.filterCyan ?? "",
        developer: printData.developer ?? "",
        developmentTime: printData.developmentTime ?? "",
        temperature: printData.temperature ?? "",
        dilution: printData.dilution ?? "",
        enlargerHeight: printData.enlargerHeight ?? "",
        testStrip: printData.testStrip ?? "",
        notes: printData.notes ?? "",
      });
      setExtraData(
        Array.isArray(printData.extraData) && printData.extraData.length > 0
          ? printData.extraData.map((r) => ({ key: r.key ?? "", value: r.value ?? "" }))
          : []
      );
    }
  }, [printData]);

  const dataNodeId = printData?.nodeId ?? nodeId;
  const handleSave = async () => {
    if (dataNodeId == null) return;
    setIsSaving(true);
    try {
      await upsertMutation.mutateAsync({
        id,
        nodeId: dataNodeId,
        title: title.trim() || undefined,
        ...Object.fromEntries(
          Object.entries(fields).map(([k, v]) => [k, v.trim() || undefined])
        ),
        extraData: extraData.filter((r) => r.key.trim() || r.value.trim()).map((r) => ({ key: r.key.trim(), value: r.value.trim() })),
      });
      setIsEditing(false);
      alert("인화 데이터가 저장되었습니다.");
    } catch {
      alert("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    hasSavedRef.current = true;
    await deleteMutation.mutateAsync({ id });
    navigate(-1);
  };

  const handleCancel = () => {
    if (printData) {
      setTitle(printData.title ?? "");
      setFields({
        exposureTime: printData.exposureTime ?? "",
        aperture: printData.aperture ?? "",
        filterYellow: printData.filterYellow ?? "",
        filterMagenta: printData.filterMagenta ?? "",
        filterCyan: printData.filterCyan ?? "",
        developer: printData.developer ?? "",
        developmentTime: printData.developmentTime ?? "",
        temperature: printData.temperature ?? "",
        dilution: printData.dilution ?? "",
        enlargerHeight: printData.enlargerHeight ?? "",
        testStrip: printData.testStrip ?? "",
        notes: printData.notes ?? "",
      });
      setExtraData(
        Array.isArray(printData.extraData) && printData.extraData.length > 0
          ? printData.extraData.map((r) => ({ key: r.key ?? "", value: r.value ?? "" }))
          : []
      );
    }
    setIsEditing(false);
  };

  // If this record was just created as draft and user leaves without saving, remove it.
  // Use refs so the cleanup only fires once on unmount with the latest values.
  const deleteOnUnmountRef = useRef<(() => void) | null>(null);
  deleteOnUnmountRef.current = () => {
    if (isDraft && !hasSavedRef.current) {
      deleteMutation.mutate({ id });
    }
  };
  useEffect(() => {
    return () => {
      deleteOnUnmountRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addExtraRow = () => setExtraData((prev) => [...prev, { key: "", value: "" }]);
  const updateExtraRow = (index: number, field: "key" | "value", value: string) => {
    setExtraData((prev) => prev.map((r, i) => (i === index ? { ...r, [field]: value } : r)));
  };
  const removeExtraRow = (index: number) => setExtraData((prev) => prev.filter((_, i) => i !== index));

  const hasData = Object.values(fields).some((v) => v.trim()) || title.trim() || extraData.some((r) => r.key.trim() || r.value.trim());

  return (
    <div className="mx-auto max-w-content px-4 py-6 sm:px-6">
      <header className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-4 text-sm text-muted hover:text-foreground transition-colors"
        >
          ← Back
        </button>
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSave();
                  }
                }}
                placeholder="제목 (선택)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-lg font-semibold text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
              />
            ) : (
              <h1 className="text-xl font-semibold tracking-tight text-foreground truncate">
                {title.trim() || "인화 데이터"}
              </h1>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isDraft && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="rounded-lg border border-border p-2 text-muted hover:border-red-200 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="삭제"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => (isEditing ? handleSave() : setIsEditing(true))}
              disabled={isSaving}
              className="rounded-lg border border-primary bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {isSaving ? "..." : isEditing ? "저장" : "편집"}
            </button>
          </div>
        </div>
      </header>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-4 pb-24">
          {!hasData && !isEditing && (
            <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-8 text-center">
              <p className="text-sm text-muted">아직 입력된 데이터가 없습니다</p>
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="mt-3 text-sm font-medium text-primary hover:underline"
              >
                지금 입력하기 →
              </button>
            </div>
          )}

          {(hasData || isEditing) && (
            <>
              {/* 한 눈에 보는 요약: 헤드높이, 조리개, 시간, C/M/Y */}
              <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 md:grid-cols-6">
                  <SummaryItem
                    label="헤드 높이"
                    value={fields.enlargerHeight}
                    isEditing={isEditing}
                    onChange={(v) => setFields((prev) => ({ ...prev, enlargerHeight: v }))}
                    placeholder="—"
                    suffix=" cm"
                  />
                  <SummaryItem
                    label="조리개"
                    value={fields.aperture}
                    isEditing={isEditing}
                    onChange={(v) => setFields((prev) => ({ ...prev, aperture: v }))}
                    placeholder="—"
                    prefix="f/"
                  />
                  <SummaryItem
                    label="시간"
                    value={fields.exposureTime}
                    isEditing={isEditing}
                    onChange={(v) => setFields((prev) => ({ ...prev, exposureTime: v }))}
                    placeholder="—"
                    suffix=" 초"
                  />
                  <SummaryItem
                    label="C"
                    value={fields.filterCyan}
                    isEditing={isEditing}
                    onChange={(v) => setFields((prev) => ({ ...prev, filterCyan: v }))}
                    placeholder="0"
                  />
                  <SummaryItem
                    label="M"
                    value={fields.filterMagenta}
                    isEditing={isEditing}
                    onChange={(v) => setFields((prev) => ({ ...prev, filterMagenta: v }))}
                    placeholder="0"
                  />
                  <SummaryItem
                    label="Y"
                    value={fields.filterYellow}
                    isEditing={isEditing}
                    onChange={(v) => setFields((prev) => ({ ...prev, filterYellow: v }))}
                    placeholder="0"
                  />
                </div>
              </section>

              {/* 추가 데이터 */}
              <section className="rounded-2xl border border-border bg-surface overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-border">
                  <h2 className="text-sm font-medium text-foreground">추가 데이터</h2>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={addExtraRow}
                      className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      + 행 추가
                    </button>
                  )}
                </div>
                <div className="px-5 py-4">
                  {extraData.length === 0 && !isEditing ? (
                    <p className="text-sm text-muted">추가된 데이터가 없습니다</p>
                  ) : isEditing ? (
                    <ul className="space-y-3">
                      {extraData.map((row, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={row.key}
                            onChange={(e) => updateExtraRow(index, "key", e.target.value)}
                            placeholder="항목명"
                            className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                          <input
                            type="text"
                            value={row.value}
                            onChange={(e) => updateExtraRow(index, "value", e.target.value)}
                            placeholder="값"
                            className="flex-1 min-w-0 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
                          />
                          <button
                            type="button"
                            onClick={() => removeExtraRow(index)}
                            className="rounded-md p-2 text-muted hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="삭제"
                          >
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <dl className="space-y-2 text-sm">
                      {extraData.map((row, index) => (
                        <div key={index} className="flex gap-3">
                          <dt className="shrink-0 font-medium text-muted w-28 truncate">{row.key || "—"}</dt>
                          <dd className="min-w-0 text-foreground break-words">{row.value || "—"}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </div>
              </section>

              {/* 클릭 시 펼쳐지는 상세: 현상액, 기타 조건, 비고 */}
              <section className="rounded-2xl border border-border bg-surface overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowDetail((d) => !d)}
                  className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-zinc-50/80 transition-colors"
                >
                  <span className="text-sm font-medium text-foreground">현상 조건 · 비고</span>
                  <svg
                    className={`h-5 w-5 shrink-0 text-muted transition-transform ${showDetail ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showDetail && (
                  <div className="border-t border-border px-5 py-4">
                    {isEditing ? (
                      <div className="space-y-4">
                        <FieldRow
                          field={FIELDS[5]}
                          value={fields.developer}
                          onChange={(v) => setFields((prev) => ({ ...prev, developer: v }))}
                        />
                        <FieldRow
                          field={FIELDS[6]}
                          value={fields.developmentTime}
                          onChange={(v) => setFields((prev) => ({ ...prev, developmentTime: v }))}
                        />
                        <FieldRow
                          field={FIELDS[7]}
                          value={fields.temperature}
                          onChange={(v) => setFields((prev) => ({ ...prev, temperature: v }))}
                        />
                        <FieldRow
                          field={FIELDS[8]}
                          value={fields.dilution}
                          onChange={(v) => setFields((prev) => ({ ...prev, dilution: v }))}
                        />
                        <FieldRow
                          field={FIELDS[10]}
                          value={fields.testStrip}
                          onChange={(v) => setFields((prev) => ({ ...prev, testStrip: v }))}
                          multiline
                        />
                        <FieldRow
                          field={FIELDS[11]}
                          value={fields.notes}
                          onChange={(v) => setFields((prev) => ({ ...prev, notes: v }))}
                          multiline
                        />
                      </div>
                    ) : (
                      <dl className="space-y-3 text-sm">
                        <DetailRow label="현상액" value={fields.developer} />
                        <DetailRow label="현상 시간" value={fields.developmentTime} />
                        <DetailRow label="온도" value={fields.temperature} />
                        <DetailRow label="희석 비율" value={fields.dilution} />
                        <DetailRow label="테스트 스트립 메모" value={fields.testStrip} multiline />
                        <DetailRow label="비고" value={fields.notes} multiline />
                      </dl>
                    )}
                  </div>
                )}
              </section>
            </>
          )}

          {printData?.updatedAt && hasData && (
            <p className="text-xs text-muted">
              마지막 수정: {new Date(printData.updatedAt).toLocaleString("ko-KR")}
            </p>
          )}

          {isEditing && (
            <button
              type="button"
              onClick={handleCancel}
              className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-foreground hover:bg-zinc-50 transition-colors"
            >
              취소
            </button>
          )}
        </div>
      )}

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20" onClick={() => setShowDeleteConfirm(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-foreground mb-2">데이터 삭제</h3>
            <p className="text-sm text-muted mb-1">
              {title.trim()
                ? <><span className="font-medium text-foreground">"{title.trim()}"</span>을(를) 삭제하시겠습니까?</>
                : "이 인화 데이터를 삭제하시겠습니까?"}
            </p>
            <p className="text-sm text-red-500 mb-6">삭제된 데이터는 복구할 수 없습니다.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-border py-2.5 text-sm font-medium text-foreground hover:bg-zinc-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleDelete}
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

function SummaryItem({
  label,
  value,
  isEditing,
  onChange,
  placeholder,
  prefix = "",
  suffix = "",
}: {
  label: string;
  value: string;
  isEditing: boolean;
  onChange: (v: string) => void;
  placeholder: string;
  prefix?: string;
  suffix?: string;
}) {
  const displayValue = value?.trim()
    ? `${prefix}${value}${suffix}`.trim()
    : placeholder;
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">{label}</p>
      {isEditing ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      ) : (
        <p className="text-sm font-medium text-foreground">{displayValue}</p>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  multiline = false,
}: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  const v = value?.trim() || "—";
  return (
    <div>
      <dt className="text-xs font-medium text-muted">{label}</dt>
      <dd className={`mt-0.5 text-foreground ${multiline ? "whitespace-pre-wrap break-words" : ""}`}>
        {v}
      </dd>
    </div>
  );
}

function FieldRow({
  field,
  value,
  onChange,
  multiline = false,
}: {
  field: (typeof FIELDS)[0];
  value: string;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-muted">
        {field.label}
        {field.unit && <span className="ml-1 text-muted/80">{field.unit}</span>}
      </label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:border-primary focus:ring-1 focus:ring-primary"
        />
      )}
    </div>
  );
}
