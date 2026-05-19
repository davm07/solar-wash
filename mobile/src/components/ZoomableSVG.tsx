import React from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface ZoomableSVGProps {
  children: React.ReactNode;
  baseWidth: number;
  baseHeight: number;
}

export const ZoomableSVG = ({
  children,
  baseWidth,
  baseHeight,
}: ZoomableSVGProps) => {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // 1. FACTOR DE NITIDEZ: Renderizamos el SVG 4 veces más grande de su tamaño base
  const MAX_RESOLUTION_SCALE = 4;
  const renderWidth = baseWidth * MAX_RESOLUTION_SCALE;
  const renderHeight = baseHeight * MAX_RESOLUTION_SCALE;

  // El zoom inicial empieza en el equivalente a su tamaño real (1 / 4 = 0.25)
  const initialScale = 1 / MAX_RESOLUTION_SCALE;
  const scale = useSharedValue(initialScale);
  const savedScale = useSharedValue(initialScale);

  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const savedTranslationX = useSharedValue(0);
  const savedTranslationY = useSharedValue(0);

  // Calcula límites usando el tamaño gigante renderizado
  const getBoundaries = (currentScale: number) => {
    "worklet";
    const maxTx = Math.max(0, (renderWidth * currentScale - screenWidth) / 2);
    const maxTy = Math.max(0, (renderHeight * currentScale - screenHeight) / 2);
    return { maxTx, maxTy };
  };

  // GESTO DE ZOOM (Pinch)
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      // El zoom mínimo es el tamaño inicial (0.25) y el máximo es 1.5 veces el tamaño gigante (nítido)
      scale.value = Math.max(
        initialScale,
        Math.min(savedScale.value * event.scale, 1.5),
      );

      const { maxTx, maxTy } = getBoundaries(scale.value);
      translationX.value = Math.max(
        -maxTx,
        Math.min(translationX.value, maxTx),
      );
      translationY.value = Math.max(
        -maxTy,
        Math.min(translationY.value, maxTy),
      );
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // GESTO DE MOVIMIENTO (Pan)
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > initialScale) {
        const { maxTx, maxTy } = getBoundaries(scale.value);
        const nextX = savedTranslationX.value + event.translationX;
        const nextY = savedTranslationY.value + event.translationY;

        // Resistencia elástica en bordes
        if (Math.abs(nextX) > maxTx) {
          translationX.value =
            nextX > 0
              ? maxTx + (nextX - maxTx) * 0.2
              : -maxTx + (nextX + maxTx) * 0.2;
        } else {
          translationX.value = nextX;
        }

        if (Math.abs(nextY) > maxTy) {
          translationY.value =
            nextY > 0
              ? maxTy + (nextY - maxTy) * 0.2
              : -maxTy + (nextY + maxTy) * 0.2;
        } else {
          translationY.value = nextY;
        }
      }
    })
    .onEnd(() => {
      const { maxTx, maxTy } = getBoundaries(scale.value);

      translationX.value = withSpring(
        Math.max(-maxTx, Math.min(translationX.value, maxTx)),
        { damping: 15 },
      );
      translationY.value = withSpring(
        Math.max(-maxTy, Math.min(translationY.value, maxTy)),
        { damping: 15 },
      );

      savedTranslationX.value = Math.max(
        -maxTx,
        Math.min(translationX.value, maxTx),
      );
      savedTranslationY.value = Math.max(
        -maxTy,
        Math.min(translationY.value, maxTy),
      );
    });

  // DOBLE TOQUE (Reset al tamaño inicial de escala 0.25)
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      scale.value = withTiming(initialScale);
      savedScale.value = initialScale;
      translationX.value = withTiming(0);
      translationY.value = withTiming(0);
      savedTranslationX.value = 0;
      savedTranslationY.value = 0;
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture,
  );

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translationX.value },
        { translateY: translationY.value },
        { scale: scale.value },
      ],
    };
  });

  return (
    <GestureHandlerRootView style={styles.container}>
      <GestureDetector gesture={composedGesture}>
        {/* Forzamos al contenedor a medir el tamaño GIGANTE */}
        <Animated.View
          style={[{ width: renderWidth, height: renderHeight }, animatedStyle]}
        >
          {children}
        </Animated.View>
      </GestureDetector>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
});
