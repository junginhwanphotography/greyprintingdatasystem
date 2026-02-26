import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { SymbolWeight, SymbolViewProps } from "expo-symbols";
import { ComponentProps } from "react";
import { OpaqueColorValue, type StyleProp, type TextStyle } from "react-native";

type IconMapping = Record<SymbolViewProps["name"], ComponentProps<typeof MaterialIcons>["name"]>;
type IconSymbolName = keyof typeof MAPPING;

const MAPPING = {
  "house.fill": "home",
  "magnifyingglass": "search",
  "paperplane.fill": "send",
  "chevron.left.forwardslash.chevron.right": "code",
  "chevron.right": "chevron-right",
  "chevron.left": "chevron-left",
  "plus": "add",
  "trash": "delete",
  "pencil": "edit",
  "checkmark": "check",
  "xmark": "close",
  "camera.fill": "camera-alt",
  "camera": "camera",
  "film": "movie",
  "photo": "photo",
  "doc.text": "description",
  "folder": "folder",
  "folder.fill": "folder",
  "list.bullet": "list",
  "square.and.pencil": "edit-note",
  "arrow.left": "arrow-back",
  "ellipsis": "more-horiz",
  "ellipsis.circle": "more-vert",
  "info.circle": "info",
  "gear": "settings",
  "star.fill": "star",
  "clock": "schedule",
  "person.fill": "person",
} as IconMapping;

export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<TextStyle>;
  weight?: SymbolWeight;
}) {
  return <MaterialIcons color={color} size={size} name={MAPPING[name]} style={style} />;
}
