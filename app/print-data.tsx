import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";

type Params = {
  paperSizeId: string;
  sizeName: string;
  typeName: string;
  brandName: string;
  filmName: string;
  formatName: string;
  lensName: string;
  cameraName: string;
};

interface FieldConfig {
  key: string;
  label: string;
  placeholder: string;
  unit?: string;
}

const FIELDS: FieldConfig[] = [
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

type PrintDataFields = {
  exposureTime: string;
  aperture: string;
  filterYellow: string;
  filterMagenta: string;
  filterCyan: string;
  developer: string;
  developmentTime: string;
  temperature: string;
  dilution: string;
  enlargerHeight: string;
  testStrip: string;
  notes: string;
};

const emptyFields: PrintDataFields = {
  exposureTime: "", aperture: "", filterYellow: "", filterMagenta: "",
  filterCyan: "", developer: "", developmentTime: "", temperature: "",
  dilution: "", enlargerHeight: "", testStrip: "", notes: "",
};

export default function PrintDataScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const paperSizeId = Number(params.paperSizeId);
  const utils = trpc.useUtils();

  const [isEditing, setIsEditing] = useState(false);
  const [fields, setFields] = useState<PrintDataFields>(emptyFields);
  const [isSaving, setIsSaving] = useState(false);

  const { data: printData, isLoading } = trpc.printData.get.useQuery({ paperSizeId });
  const upsertMutation = trpc.printData.upsert.useMutation({
    onSuccess: () => utils.printData.get.invalidate(),
  });

  useEffect(() => {
    if (printData) {
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
    }
  }, [printData]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await upsertMutation.mutateAsync({
        paperSizeId,
        ...Object.fromEntries(
          Object.entries(fields).map(([k, v]) => [k, v.trim() || undefined])
        ),
      });
      setIsEditing(false);
      Alert.alert("저장 완료", "인화 데이터가 저장되었습니다.");
    } catch (e) {
      Alert.alert("오류", "저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (printData) {
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
    } else {
      setFields(emptyFields);
    }
    setIsEditing(false);
  };

  const breadcrumb = [
    params.cameraName, params.lensName, params.formatName,
    params.filmName, params.brandName, params.typeName,
  ].filter(Boolean);

  const hasData = Object.values(fields).some((v) => v.trim());

  return (
    <ScreenContainer containerClassName="bg-background">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <IconSymbol name="chevron.left" size={22} color="#C8A96E" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.breadcrumb}>
              {breadcrumb.map((crumb, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <Text style={styles.breadcrumbSep}> › </Text>}
                  <Text style={styles.breadcrumbText} numberOfLines={1}>{crumb}</Text>
                </React.Fragment>
              ))}
            </View>
            <Text style={styles.title}>{params.sizeName}</Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => isEditing ? handleSave() : setIsEditing(true)}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator color="#C8A96E" size="small" />
            ) : (
              <Text style={styles.editBtnText}>{isEditing ? "저장" : "편집"}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* 구분선 */}
        <View style={styles.divider} />

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color="#C8A96E" size="large" />
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* 상태 배너 */}
            {!hasData && !isEditing && (
              <View style={styles.emptyBanner}>
                <Text style={styles.emptyBannerText}>아직 입력된 데이터가 없습니다</Text>
                <TouchableOpacity onPress={() => setIsEditing(true)}>
                  <Text style={styles.emptyBannerAction}>지금 입력하기 →</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 마지막 수정 시간 */}
            {printData?.updatedAt && (
              <Text style={styles.updatedAt}>
                마지막 수정: {new Date(printData.updatedAt).toLocaleString("ko-KR")}
              </Text>
            )}

            {/* 노출 섹션 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>노출 설정</Text>
              {FIELDS.slice(0, 2).map((field) => (
                <DataField
                  key={field.key}
                  field={field}
                  value={fields[field.key as keyof PrintDataFields]}
                  isEditing={isEditing}
                  onChange={(v) => setFields((prev) => ({ ...prev, [field.key]: v }))}
                />
              ))}
            </View>

            {/* 필터 섹션 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>필터 설정</Text>
              {FIELDS.slice(2, 5).map((field) => (
                <DataField
                  key={field.key}
                  field={field}
                  value={fields[field.key as keyof PrintDataFields]}
                  isEditing={isEditing}
                  onChange={(v) => setFields((prev) => ({ ...prev, [field.key]: v }))}
                />
              ))}
            </View>

            {/* 현상 섹션 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>현상 설정</Text>
              {FIELDS.slice(5, 9).map((field) => (
                <DataField
                  key={field.key}
                  field={field}
                  value={fields[field.key as keyof PrintDataFields]}
                  isEditing={isEditing}
                  onChange={(v) => setFields((prev) => ({ ...prev, [field.key]: v }))}
                />
              ))}
            </View>

            {/* 기타 섹션 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>기타</Text>
              {FIELDS.slice(9).map((field) => (
                <DataField
                  key={field.key}
                  field={field}
                  value={fields[field.key as keyof PrintDataFields]}
                  isEditing={isEditing}
                  onChange={(v) => setFields((prev) => ({ ...prev, [field.key]: v }))}
                  multiline={field.key === "testStrip" || field.key === "notes"}
                />
              ))}
            </View>

            {/* 편집 중 취소 버튼 */}
            {isEditing && (
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel}>
                <Text style={styles.cancelBtnText}>취소</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

function DataField({
  field, value, isEditing, onChange, multiline = false,
}: {
  field: FieldConfig;
  value: string;
  isEditing: boolean;
  onChange: (v: string) => void;
  multiline?: boolean;
}) {
  return (
    <View style={fieldStyles.container}>
      <View style={fieldStyles.labelRow}>
        <Text style={fieldStyles.label}>{field.label}</Text>
        {field.unit && <Text style={fieldStyles.unit}>{field.unit}</Text>}
      </View>
      {isEditing ? (
        <TextInput
          style={[fieldStyles.input, multiline && fieldStyles.inputMultiline]}
          value={value}
          onChangeText={onChange}
          placeholder={field.placeholder}
          placeholderTextColor="#444"
          multiline={multiline}
          numberOfLines={multiline ? 3 : 1}
          returnKeyType={multiline ? "default" : "next"}
        />
      ) : (
        <View style={fieldStyles.valueContainer}>
          <Text style={[fieldStyles.value, !value && fieldStyles.valuePlaceholder]}>
            {value || "—"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
  },
  breadcrumb: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 2,
  },
  breadcrumbText: {
    fontSize: 10,
    color: "#888",
    maxWidth: 60,
  },
  breadcrumbSep: {
    fontSize: 10,
    color: "#444",
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#F0F0F0",
  },
  editBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#C8A96E",
    minWidth: 52,
    alignItems: "center",
  },
  editBtnText: {
    color: "#0D0D0D",
    fontWeight: "700",
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: "#2E2E2E",
    marginHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyBanner: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2E2E2E",
    alignItems: "center",
  },
  emptyBannerText: {
    color: "#888",
    fontSize: 14,
    marginBottom: 8,
  },
  emptyBannerAction: {
    color: "#C8A96E",
    fontSize: 14,
    fontWeight: "600",
  },
  updatedAt: {
    fontSize: 11,
    color: "#555",
    marginBottom: 16,
    textAlign: "right",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#C8A96E",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 10,
    paddingLeft: 4,
  },
  cancelBtn: {
    backgroundColor: "#2E2E2E",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 8,
  },
  cancelBtnText: {
    color: "#888",
    fontWeight: "600",
    fontSize: 15,
  },
});

const fieldStyles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
  unit: {
    fontSize: 11,
    color: "#555",
    backgroundColor: "#1A1A1A",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  input: {
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 15,
    color: "#F0F0F0",
    borderWidth: 1,
    borderColor: "#3A3A3A",
  },
  inputMultiline: {
    minHeight: 80,
    textAlignVertical: "top",
    paddingTop: 11,
  },
  valueContainer: {
    backgroundColor: "#1A1A1A",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: "#2E2E2E",
  },
  value: {
    fontSize: 15,
    color: "#F0F0F0",
    fontWeight: "500",
  },
  valuePlaceholder: {
    color: "#444",
  },
});
