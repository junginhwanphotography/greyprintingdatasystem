import React, { useState, useCallback } from "react";
import {
  View, Text, FlatList, TouchableOpacity, TextInput,
  StyleSheet, Alert, Modal, Animated, Platform, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { ScreenContainer } from "./screen-container";
import { IconSymbol } from "./ui/icon-symbol";

export interface HierarchyItem {
  id: number;
  name: string;
  description?: string | null;
  childCount?: number;
}

interface HierarchyListScreenProps {
  title: string;
  breadcrumb: string[];
  items: HierarchyItem[];
  isLoading: boolean;
  onItemPress: (item: HierarchyItem) => void;
  onAddItem: (name: string, description?: string) => Promise<void>;
  onDeleteItem: (item: HierarchyItem) => Promise<void>;
  onRenameItem?: (item: HierarchyItem, newName: string) => Promise<void>;
  emptyMessage?: string;
}

export function HierarchyListScreen({
  title,
  breadcrumb,
  items,
  isLoading,
  onItemPress,
  onAddItem,
  onDeleteItem,
  onRenameItem,
  emptyMessage = "항목이 없습니다",
}: HierarchyListScreenProps) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedItem, setSelectedItem] = useState<HierarchyItem | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleAdd = async () => {
    if (!newName.trim()) return;
    setIsAdding(true);
    try {
      await onAddItem(newName.trim(), newDescription.trim() || undefined);
      setNewName("");
      setNewDescription("");
      setShowAddModal(false);
    } catch (e) {
      Alert.alert("오류", "항목 추가에 실패했습니다.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = (item: HierarchyItem) => {
    Alert.alert(
      "항목 삭제",
      `"${item.name}"을(를) 삭제하시겠습니까?\n하위 데이터도 모두 삭제됩니다.`,
      [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: async () => {
            try {
              await onDeleteItem(item);
            } catch (e) {
              Alert.alert("오류", "삭제에 실패했습니다.");
            }
          },
        },
      ]
    );
  };

  const handleRename = (item: HierarchyItem) => {
    setSelectedItem(item);
    setNewName(item.name);
    setShowRenameModal(true);
  };

  const handleConfirmRename = async () => {
    if (!selectedItem || !newName.trim() || !onRenameItem) return;
    try {
      await onRenameItem(selectedItem, newName.trim());
      setShowRenameModal(false);
      setNewName("");
      setSelectedItem(null);
    } catch (e) {
      Alert.alert("오류", "이름 변경에 실패했습니다.");
    }
  };

  // 스마트 검색: 여러 단어를 포함하는 항목 찾기
  const filteredItems = searchQuery.trim()
    ? items.filter((item) => {
        const query = searchQuery.toLowerCase();
        const keywords = query.split(/[\s,]+/).filter(k => k.length > 0);
        // 모든 키워드가 항목 이름에 포함되어야 함
        return keywords.every(keyword => item.name.toLowerCase().includes(keyword));
      })
    : items;

  const renderItem = ({ item }: { item: HierarchyItem }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => onItemPress(item)}
      onLongPress={() => {
        Alert.alert(item.name, "작업을 선택하세요", [
          { text: "취소", style: "cancel" },
          ...(onRenameItem ? [{ text: "이름 변경", onPress: () => handleRename(item) }] : []),
          { text: "삭제", style: "destructive", onPress: () => handleDelete(item) },
        ]);
      }}
    >
      <View style={styles.itemLeft}>
        <View style={styles.itemDot} />
        <View style={styles.itemTextContainer}>
          <Text style={styles.itemName}>{item.name}</Text>
          {item.description ? (
            <Text style={styles.itemDescription} numberOfLines={1}>{item.description}</Text>
          ) : null}
        </View>
      </View>
      <View style={styles.itemRight}>
        {item.childCount !== undefined && item.childCount > 0 ? (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{item.childCount}</Text>
          </View>
        ) : null}
        <IconSymbol name="chevron.right" size={18} color="#444" />
      </View>
    </TouchableOpacity>
  );

  return (
    <ScreenContainer containerClassName="bg-background">
      {/* 헤더 */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <IconSymbol name="chevron.left" size={24} color="#6BA3C0" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setShowSearchModal(true)}
          >
            <IconSymbol name="magnifyingglass" size={20} color="#6BA3C0" />
          </TouchableOpacity>
        </View>
        {breadcrumb.length > 0 && (
          <View style={styles.breadcrumb}>
            {breadcrumb.map((crumb, index) => (
              <React.Fragment key={index}>
                {index > 0 && <Text style={styles.breadcrumbSep}> › </Text>}
                <Text style={styles.breadcrumbText} numberOfLines={1}>{crumb}</Text>
              </React.Fragment>
            ))}
          </View>
        )}
        <Text style={styles.title}>{title}</Text>
      </View>

      {/* 구분선 */}
      <View style={styles.divider} />

      {/* 리스트 */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color="#6BA3C0" size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={filteredItems.length === 0 ? styles.emptyContainer : styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyInner}>
              <Text style={styles.emptyIcon}>◎</Text>
              <Text style={styles.emptyText}>{emptyMessage}</Text>
              <Text style={styles.emptySubtext}>아래 + 버튼으로 항목을 추가하세요</Text>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB 추가 버튼 */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setNewName("");
          setNewDescription("");
          setShowAddModal(true);
        }}
      >
        <IconSymbol name="plus" size={24} color="#FFFFFF" />
      </TouchableOpacity>

      {/* 추가 모달 */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>새 항목 추가</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="항목 이름"
              placeholderTextColor="#999"
              value={newName}
              onChangeText={setNewName}
              editable={!isAdding}
            />
            <TextInput
              style={[styles.modalInput, styles.descriptionInput]}
              placeholder="설명 (선택사항)"
              placeholderTextColor="#999"
              value={newDescription}
              onChangeText={setNewDescription}
              multiline
              editable={!isAdding}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowAddModal(false)}
                disabled={isAdding}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton, isAdding && styles.disabledButton]}
                onPress={handleAdd}
                disabled={isAdding}
              >
                {isAdding ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.confirmButtonText}>추가</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 이름 변경 모달 */}
      <Modal
        visible={showRenameModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRenameModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>이름 변경</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="새 이름"
              placeholderTextColor="#999"
              value={newName}
              onChangeText={setNewName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setShowRenameModal(false)}
              >
                <Text style={styles.cancelButtonText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmRename}
              >
                <Text style={styles.confirmButtonText}>변경</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 검색 모달 */}
      <Modal
        visible={showSearchModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSearchModal(false);
          setSearchQuery("");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.searchModalContent}>
            <View style={styles.searchModalHeader}>
              <Text style={styles.searchModalTitle}>항목 검색</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowSearchModal(false);
                  setSearchQuery("");
                }}
              >
                <IconSymbol name="xmark" size={24} color="#2C3E50" />
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchModalInput}
              placeholder="검색어 입력 (띄어쓰기로 구분)"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoFocus
            />
            {searchQuery.trim() && (
              <>
                <Text style={styles.searchResultCount}>
                  {filteredItems.length}개 결과
                </Text>
                <FlatList
                  data={filteredItems}
                  keyExtractor={(item) => item.id.toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.searchResultItem}
                      onPress={() => {
                        setShowSearchModal(false);
                        setSearchQuery("");
                        onItemPress(item);
                      }}
                    >
                      <View style={styles.searchResultDot} />
                      <View style={styles.searchResultText}>
                        <Text style={styles.searchResultName}>{item.name}</Text>
                        {item.description && (
                          <Text style={styles.searchResultDesc} numberOfLines={1}>
                            {item.description}
                          </Text>
                        )}
                      </View>
                      <IconSymbol name="chevron.right" size={16} color="#999" />
                    </TouchableOpacity>
                  )}
                  scrollEnabled={true}
                  showsVerticalScrollIndicator={false}
                />
              </>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  searchButton: {
    padding: 8,
    marginRight: -8,
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  breadcrumbSep: {
    fontSize: 10,
    color: "#7F8C8D",
    marginHorizontal: 2,
  },
  breadcrumbText: {
    fontSize: 10,
    color: "#7F8C8D",
    maxWidth: "70%",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2C3E50",
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E6ED",
    marginVertical: 12,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  emptyInner: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
    color: "#DDD",
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#999",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#AAA",
    textAlign: "center",
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFB",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E0E6ED",
  },
  itemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#6BA3C0",
    marginRight: 12,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2C3E50",
  },
  itemDescription: {
    fontSize: 11,
    color: "#7F8C8D",
    marginTop: 2,
  },
  itemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  countBadge: {
    backgroundColor: "#E0E6ED",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontSize: 11,
    color: "#6BA3C0",
    fontWeight: "600",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6BA3C0",
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    width: "85%",
    maxWidth: 320,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C3E50",
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: "#F8FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E6ED",
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#2C3E50",
    marginBottom: 12,
  },
  descriptionInput: {
    height: 80,
    textAlignVertical: "top",
    paddingVertical: 10,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#E0E6ED",
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2C3E50",
  },
  confirmButton: {
    backgroundColor: "#6BA3C0",
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  disabledButton: {
    opacity: 0.6,
  },
  searchModalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    width: "90%",
    maxHeight: "80%",
  },
  searchModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2C3E50",
  },
  searchModalInput: {
    backgroundColor: "#F8FAFB",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E0E6ED",
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 14,
    color: "#2C3E50",
    marginBottom: 12,
  },
  searchResultCount: {
    fontSize: 12,
    color: "#7F8C8D",
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 4,
  },
  searchResultDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#6BA3C0",
    marginRight: 10,
  },
  searchResultText: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#2C3E50",
  },
  searchResultDesc: {
    fontSize: 11,
    color: "#7F8C8D",
    marginTop: 2,
  },
});
