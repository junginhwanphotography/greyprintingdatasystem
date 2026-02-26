import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, SectionList,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "@/components/screen-container";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { trpc } from "@/lib/trpc";

type SearchCategory = "cameras" | "lenses" | "formats" | "films" | "brands" | "types" | "sizes";

const CATEGORY_LABELS: Record<SearchCategory, string> = {
  cameras: "카메라 종류",
  lenses: "렌즈군",
  formats: "판형",
  films: "필름 종류",
  brands: "인화지 브랜드",
  types: "인화지 종류",
  sizes: "인화지 사이즈",
};

const CATEGORY_ICONS: Record<SearchCategory, string> = {
  cameras: "📷",
  lenses: "🔭",
  formats: "📐",
  films: "🎞",
  brands: "🏷",
  types: "📄",
  sizes: "📏",
};

// 스마트 검색 알고리즘: 여러 키워드를 포함하는 항목 찾기
const smartSearch = (items: Array<{ id: number; name: string; description?: string | null }>, query: string) => {
  if (!query.trim()) return items;
  
  const keywords = query
    .toLowerCase()
    .split(/[\s,]+/)
    .filter(k => k.length > 0);
  
  // 점수 계산 함수
  const calculateScore = (text: string) => {
    let score = 0;
    const lowerText = text.toLowerCase();
    
    keywords.forEach(keyword => {
      if (lowerText.includes(keyword)) {
        // 정확한 단어 매칭이면 높은 점수
        if (lowerText.split(/\s+/).includes(keyword)) {
          score += 10;
        } else {
          // 부분 매칭이면 낮은 점수
          score += 5;
        }
        
        // 시작 부분에 있으면 추가 점수
        if (lowerText.startsWith(keyword)) {
          score += 3;
        }
      }
    });
    
    return score;
  };
  
  return items
    .map(item => ({
      ...item,
      score: calculateScore(item.name) + (item.description ? calculateScore(item.description) : 0),
    }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ score, ...item }) => item);
};

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQuery(text.trim());
    }, 300);
  }, []);

  const { data: results, isLoading } = trpc.search.all.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 1 }
  );

  // 스마트 검색 적용
  const smartResults = results
    ? Object.fromEntries(
        Object.entries(results).map(([category, items]) => [
          category,
          smartSearch(items as any, debouncedQuery),
        ])
      )
    : null;

  const sections = debouncedQuery && smartResults
    ? (Object.keys(CATEGORY_LABELS) as SearchCategory[])
        .map((cat) => ({
          title: cat,
          data: smartResults[cat] ?? [],
        }))
        .filter((s) => s.data.length > 0)
    : [];

  const totalCount = sections.reduce((acc, s) => acc + s.data.length, 0);

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* 헤더 */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>검색</Text>
        <Text style={styles.headerSubtitle}>여러 정보를 입력해도 스마트하게 찾아줍니다</Text>
      </View>

      {/* 검색창 */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <IconSymbol name="magnifyingglass" size={18} color="#7F8C8D" />
          <TextInput
            style={styles.searchInput}
            placeholder="예: 캐논 렌즈, 35mm 필름, 8x10 인화지..."
            placeholderTextColor="#999"
            value={query}
            onChangeText={handleQueryChange}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(""); setDebouncedQuery(""); }}>
              <IconSymbol name="xmark" size={16} color="#7F8C8D" />
            </TouchableOpacity>
          )}
        </View>
        {query.length > 0 && (
          <Text style={styles.searchHint}>
            띄어쓰기나 쉼표로 여러 단어를 입력하면 더 정확한 결과를 얻을 수 있습니다
          </Text>
        )}
      </View>

      {/* 결과 */}
      {!debouncedQuery ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>무엇을 찾고 계신가요?</Text>
          <Text style={styles.emptySubtitle}>카메라, 렌즈, 필름, 인화지 등을{"\n"}검색해 보세요</Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleTitle}>검색 예시:</Text>
            <Text style={styles.exampleText}>• Canon EOS 5D</Text>
            <Text style={styles.exampleText}>• 35mm Kodak</Text>
            <Text style={styles.exampleText}>• 8x10 Ilford Glossy</Text>
          </View>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6BA3C0" size="large" />
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>◎</Text>
          <Text style={styles.emptyTitle}>검색 결과 없음</Text>
          <Text style={styles.emptySubtitle}>"{debouncedQuery}"에 대한 결과가 없습니다</Text>
        </View>
      ) : (
        <>
          <Text style={styles.resultCount}>{totalCount}개 결과</Text>
          <SectionList
            sections={sections}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderSectionHeader={({ section }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionIcon}>{CATEGORY_ICONS[section.title as SearchCategory]}</Text>
                <Text style={styles.sectionTitle}>{CATEGORY_LABELS[section.title as SearchCategory]}</Text>
                <View style={styles.sectionBadge}>
                  <Text style={styles.sectionBadgeText}>{section.data.length}</Text>
                </View>
              </View>
            )}
            renderItem={({ item, section }) => (
              <SearchResultItem
                item={item}
                category={section.title as SearchCategory}
                query={debouncedQuery}
                onPress={() => {
                  // 카메라 종류 화면으로 이동 (계층 탐색 시작점)
                  if (section.title === "cameras") {
                    router.push({ pathname: "/lens-groups", params: { cameraTypeId: item.id, cameraName: item.name } });
                  }
                  // 다른 카테고리는 카메라 종류 화면으로 이동 (추후 직접 이동 구현 가능)
                }}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        </>
      )}
    </ScreenContainer>
  );
}

function SearchResultItem({
  item, category, query, onPress,
}: {
  item: { id: number; name: string; description?: string | null };
  category: SearchCategory;
  query: string;
  onPress: () => void;
}) {
  // 검색어 하이라이트 (모든 매칭 단어 강조)
  const highlightText = (text: string) => {
    if (!query) return <Text style={itemStyles.name}>{text}</Text>;
    
    const keywords = query.toLowerCase().split(/[\s,]+/).filter(k => k.length > 0);
    const parts: Array<{ text: string; highlighted: boolean }> = [];
    let lastIndex = 0;
    
    // 모든 키워드에 대해 매칭 위치 찾기
    const matches: Array<{ start: number; end: number }> = [];
    keywords.forEach(keyword => {
      let index = 0;
      while ((index = text.toLowerCase().indexOf(keyword, index)) !== -1) {
        matches.push({ start: index, end: index + keyword.length });
        index += keyword.length;
      }
    });
    
    // 매칭 위치 정렬 및 중복 제거
    matches.sort((a, b) => a.start - b.start);
    const uniqueMatches = matches.reduce((acc, match) => {
      if (acc.length === 0 || acc[acc.length - 1].end < match.start) {
        acc.push(match);
      } else {
        acc[acc.length - 1].end = Math.max(acc[acc.length - 1].end, match.end);
      }
      return acc;
    }, [] as Array<{ start: number; end: number }>);
    
    // 텍스트 분할
    uniqueMatches.forEach(match => {
      if (match.start > lastIndex) {
        parts.push({ text: text.substring(lastIndex, match.start), highlighted: false });
      }
      parts.push({ text: text.substring(match.start, match.end), highlighted: true });
      lastIndex = match.end;
    });
    
    if (lastIndex < text.length) {
      parts.push({ text: text.substring(lastIndex), highlighted: false });
    }
    
    return (
      <Text style={itemStyles.name}>
        {parts.map((part, i) =>
          part.highlighted ? (
            <Text key={i} style={itemStyles.highlight}>{part.text}</Text>
          ) : (
            <Text key={i}>{part.text}</Text>
          )
        )}
      </Text>
    );
  };

  return (
    <TouchableOpacity style={itemStyles.container} onPress={onPress}>
      <View style={itemStyles.left}>
        <View style={itemStyles.dot} />
        <View style={itemStyles.textContainer}>
          {highlightText(item.name)}
          {item.description ? (
            <Text style={itemStyles.description} numberOfLines={1}>{item.description}</Text>
          ) : null}
        </View>
      </View>
      <IconSymbol name="chevron.right" size={16} color="#999" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#2C3E50",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#7F8C8D",
    marginTop: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E0E6ED",
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#2C3E50",
    padding: 0,
  },
  searchHint: {
    fontSize: 11,
    color: "#7F8C8D",
    marginTop: 8,
    paddingHorizontal: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingBottom: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#999",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#7F8C8D",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  exampleContainer: {
    backgroundColor: "#F8FAFB",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E0E6ED",
    width: "85%",
  },
  exampleTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6BA3C0",
    marginBottom: 8,
  },
  exampleText: {
    fontSize: 12,
    color: "#2C3E50",
    marginBottom: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  resultCount: {
    fontSize: 12,
    color: "#7F8C8D",
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    marginTop: 8,
    gap: 6,
  },
  sectionIcon: {
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6BA3C0",
    letterSpacing: 1,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: "#E0E6ED",
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  sectionBadgeText: {
    fontSize: 11,
    color: "#6BA3C0",
    fontWeight: "600",
  },
});

const itemStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFB",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#E0E6ED",
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#6BA3C0",
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 14,
    color: "#2C3E50",
    fontWeight: "500",
  },
  highlight: {
    color: "#6BA3C0",
    fontWeight: "700",
  },
  description: {
    fontSize: 11,
    color: "#7F8C8D",
    marginTop: 2,
  },
});
