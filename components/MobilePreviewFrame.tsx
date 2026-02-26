import { Platform, View, type ViewStyle } from "react-native";
import { useWindowDimensions } from "react-native";
import { useMemo } from "react";
import { isRunningInPreviewIframe } from "@/lib/_core/manus-runtime";

/** iPhone 14 Pro-ish viewport for preview */
const PREVIEW_WIDTH = 390;
const PREVIEW_MAX_HEIGHT = 844;
const FRAME_PADDING = 24;
const BORDER_RADIUS = 44;
const NOTCH_HEIGHT = 34;

type MobilePreviewFrameProps = {
  children: React.ReactNode;
};

/**
 * 웹에서만 동작하는 모바일 앱 미리보기 래퍼.
 * - iframe 밖에서 직접 브라우저로 열었을 때: 폰 프레임으로 감싼 미리보기 표시
 * - Manus 등 부모 iframe 안에서는 적용하지 않음 (부모가 이미 프레임 제공)
 * - 네이티브(iOS/Android)에서는 children만 그대로 렌더
 */
export function MobilePreviewFrame({ children }: MobilePreviewFrameProps) {
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const isWeb = Platform.OS === "web";
  const inPreviewIframe = isRunningInPreviewIframe();

  const useFrame = isWeb && !inPreviewIframe;

  const outerStyle: ViewStyle = useMemo(() => {
    if (!useFrame) return { flex: 1 };
    return {
      flex: 1,
      backgroundColor: "#1a1a1a",
      alignItems: "center",
      justifyContent: "center",
      padding: FRAME_PADDING,
    } as ViewStyle;
  }, [useFrame]);

  const phoneStyle: ViewStyle = useMemo(() => {
    if (!useFrame) return { flex: 1, width: "100%", height: "100%" };
    const maxW = windowWidth - FRAME_PADDING * 2;
    const maxH = windowHeight - FRAME_PADDING * 2;
    const w = Math.min(PREVIEW_WIDTH, maxW);
    const h = Math.min(PREVIEW_MAX_HEIGHT, maxH, maxW * (PREVIEW_MAX_HEIGHT / PREVIEW_WIDTH));
    return {
      width: w,
      height: h,
      maxWidth: w,
      maxHeight: h,
      borderRadius: BORDER_RADIUS,
      overflow: "hidden",
      backgroundColor: "#0D0D0D",
      // @ts-expect-error RN web accepts boxShadow
      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)",
    } as ViewStyle;
  }, [useFrame, windowWidth, windowHeight]);

  const innerStyle: ViewStyle = useMemo(() => {
    if (!useFrame) return { flex: 1 };
    return {
      flex: 1,
      borderRadius: BORDER_RADIUS - 2,
      overflow: "hidden",
    };
  }, [useFrame]);

  if (!useFrame) {
    return <View style={{ flex: 1 }}>{children}</View>;
  }

  return (
    <View style={outerStyle}>
      <View style={phoneStyle}>
        {/* Optional notch for web - visual only */}
        {isWeb && (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 0,
              left: "50%",
              marginLeft: -60,
              width: 120,
              height: NOTCH_HEIGHT,
              backgroundColor: "#0D0D0D",
              borderBottomLeftRadius: 18,
              borderBottomRightRadius: 18,
              zIndex: 10,
            }}
          />
        )}
        <View style={innerStyle}>{children}</View>
      </View>
    </View>
  );
}
