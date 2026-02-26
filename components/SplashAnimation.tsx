import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions, Image } from "react-native";

const { width, height } = Dimensions.get("window");

interface SplashAnimationProps {
  onFinish: () => void;
}

export function SplashAnimation({ onFinish }: SplashAnimationProps) {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const lineWidth = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      // 1. 로고 페이드인 + 스케일
      Animated.parallel([
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(logoScale, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      // 2. 구분선 확장
      Animated.timing(lineWidth, { toValue: 1, duration: 400, useNativeDriver: true }),
      // 3. 텍스트 페이드인
      Animated.timing(textOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      // 4. 서브타이틀 페이드인
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      // 5. 잠시 대기
      Animated.delay(800),
      // 6. 전체 화면 페이드아웃
      Animated.timing(screenOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => onFinish());
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      {/* 배경 그라데이션 효과 */}
      <View style={styles.bgGlow} />

      {/* 로고 */}
      <Animated.View style={[styles.logoContainer, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image
          source={require("../assets/images/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* 구분선 */}
      <Animated.View style={[styles.lineContainer]}>
        <Animated.View style={[styles.line, { transform: [{ scaleX: lineWidth }] }]} />
      </Animated.View>

      {/* 앱 이름 */}
      <Animated.View style={{ opacity: textOpacity }}>
        <Text style={styles.title}>GREY PRINT</Text>
        <Text style={styles.titleSub}>DATA SYSTEM</Text>
      </Animated.View>

      {/* 서브타이틀 */}
      <Animated.View style={[styles.subtitleContainer, { opacity: subtitleOpacity }]}>
        <Text style={styles.subtitle}>Darkroom Printing Database</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bgGlow: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "#6BA3C0",
    opacity: 0.04,
    top: height / 2 - 200,
  },
  logoContainer: {
    marginBottom: 24,
  },
  logo: {
    width: 120,
    height: 120,
  },
  lineContainer: {
    width: 200,
    height: 1,
    marginBottom: 20,
    overflow: "hidden",
  },
  line: {
    height: 1,
    backgroundColor: "#6BA3C0",
    width: "100%",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#2C3E50",
    letterSpacing: 6,
    textAlign: "center",
  },
  titleSub: {
    fontSize: 16,
    fontWeight: "300",
    color: "#6BA3C0",
    letterSpacing: 8,
    textAlign: "center",
    marginTop: 4,
  },
  subtitleContainer: {
    marginTop: 16,
  },
  subtitle: {
    fontSize: 12,
    color: "#7F8C8D",
    letterSpacing: 2,
    textAlign: "center",
  },
});
