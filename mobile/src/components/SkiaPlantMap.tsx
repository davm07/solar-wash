import { Canvas, Path, Group, Skia, Rect } from "@shopify/react-native-skia";
import { ParsedSvg } from "../utils/parseSvg";
import { useCallback, useMemo } from "react";
import { PixelRatio, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const STATUS_COLORS: Record<string, string> = {
  pending: "#bdc3c7",
  in_progress: "#f1c40f",
  done: "#2ecc71",
};

interface SkiaPlantMapProps {
  parsedSvg: ParsedSvg;
  width: number;
  height: number;
  mesasState: Record<string, string>;
}

const MAX_ZOOM = 8;
const EXTRA_ZOOM = 4; // pixelRatio (≈3) × EXTRA_ZOOM (4) = factor ≈12 → sharp up to 8×
const MIN_ZOOM = 0.5;

export function SkiaPlantMap({
  parsedSvg,
  width,
  height,
  mesasState,
}: SkiaPlantMapProps) {
  const { borderD, rects } = parsedSvg;

  // Render the canvas at the device's full physical resolution so it stays
  // sharp when the user zooms in. Skia works in logical points by default,
  // so we scale the canvas up by the pixel ratio and then shrink the View
  // back down with a transform — giving us a hi-res surface at no extra
  // visual cost at scale=1.
  const pixelRatio = PixelRatio.get();
  const factor = pixelRatio * EXTRA_ZOOM;
  const canvasWidth = width * factor;
  const canvasHeight = height * factor;

  const path = useMemo(() => {
    if (!borderD) return null;
    return Skia.Path.MakeFromSVGString(borderD);
  }, [borderD]);

  const bounds = useMemo(() => {
    const pathBounds = path?.getBounds();

    let rMinX = Infinity,
      rMinY = Infinity;
    let rMaxX = -Infinity,
      rMaxY = -Infinity;
    for (const r of rects) {
      if (r.x < rMinX) rMinX = r.x;
      if (r.y < rMinY) rMinY = r.y;
      if (r.x + r.w > rMaxX) rMaxX = r.x + r.w;
      if (r.y + r.h > rMaxY) rMaxY = r.y + r.h;
    }
    const rectsExist = rects.length > 0;

    const minX = Math.min(
      pathBounds?.x ?? Infinity,
      rectsExist ? rMinX : Infinity,
    );
    const minY = Math.min(
      pathBounds?.y ?? Infinity,
      rectsExist ? rMinY : Infinity,
    );
    const maxX = Math.max(
      (pathBounds?.x ?? 0) + (pathBounds?.width ?? 0),
      rectsExist ? rMaxX : -Infinity,
    );
    const maxY = Math.max(
      (pathBounds?.y ?? 0) + (pathBounds?.height ?? 0),
      rectsExist ? rMaxY : -Infinity,
    );

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }, [path, rects]);

  if (!bounds.width || !bounds.height) return null;

  // baseScale fits the SVG into the hi-res canvas
  const baseScale = Math.min(
    canvasWidth / bounds.width,
    canvasHeight / bounds.height,
  );
  const baseOffsetX = (canvasWidth - bounds.width * baseScale) / 2;
  const baseOffsetY = (canvasHeight - bounds.height * baseScale) / 2;

  // ========================
  // GESTURES
  // ========================
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const getBoundaries = useCallback(
    (currentScale: number) => {
      "worklet";
      // Boundaries are in logical points (width/height), not physical pixels
      const contentW = width * currentScale;
      const contentH = height * currentScale;
      const maxTx = Math.max(0, (contentW - width) / 2);
      const maxTy = Math.max(0, (contentH - height) / 2);
      return { maxTx, maxTy };
    },
    [width, height],
  );

  // Pinch to zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newScale = Math.max(
        MIN_ZOOM,
        Math.min(savedScale.value * event.scale, MAX_ZOOM),
      );
      const ratio = newScale / scale.value;

      // Adjust pan to zoom from focal point
      translateX.value =
        event.focalX - ratio * (event.focalX - translateX.value);
      translateY.value =
        event.focalY - ratio * (event.focalY - translateY.value);

      scale.value = newScale;

      // Clamp pan to new boundaries
      const { maxTx, maxTy } = getBoundaries(scale.value);
      translateX.value = Math.max(-maxTx, Math.min(translateX.value, maxTx));
      translateY.value = Math.max(-maxTy, Math.min(translateY.value, maxTy));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Pan (only when zoomed in)
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      if (scale.value > 1) {
        const { maxTx, maxTy } = getBoundaries(scale.value);
        const nextX = savedTranslateX.value + event.translationX;
        const nextY = savedTranslateY.value + event.translationY;

        if (Math.abs(nextX) > maxTx) {
          translateX.value =
            nextX > 0
              ? maxTx + (nextX - maxTx) * 0.2
              : -maxTx + (nextX + maxTx) * 0.2;
        } else {
          translateX.value = nextX;
        }

        if (Math.abs(nextY) > maxTy) {
          translateY.value =
            nextY > 0
              ? maxTy + (nextY - maxTy) * 0.2
              : -maxTy + (nextY + maxTy) * 0.2;
        } else {
          translateY.value = nextY;
        }
      }
    })
    .onEnd(() => {
      const { maxTx, maxTy } = getBoundaries(scale.value);
      translateX.value = withSpring(
        Math.max(-maxTx, Math.min(translateX.value, maxTx)),
        { damping: 15 },
      );
      translateY.value = withSpring(
        Math.max(-maxTy, Math.min(translateY.value, maxTy)),
        { damping: 15 },
      );
      savedTranslateX.value = Math.max(
        -maxTx,
        Math.min(translateX.value, maxTx),
      );
      savedTranslateY.value = Math.max(
        -maxTy,
        Math.min(translateY.value, maxTy),
      );
    });

  // Double-tap to reset
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      scale.value = withTiming(1);
      savedScale.value = 1;
      translateX.value = withTiming(0);
      translateY.value = withTiming(0);
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture,
  );

  // Pan + zoom applied natively on the logical-sized View (no Skia clipping)
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  // Matrix only normalizes SVG coords into the hi-res canvas (no pan/zoom)
  const matrix = useDerivedValue(() => {
    const m = Skia.Matrix();
    m.translate(baseOffsetX, baseOffsetY);
    m.translate(-bounds.x * baseScale, -bounds.y * baseScale);
    m.scale(baseScale, baseScale);
    return m;
  }, [baseOffsetX, baseOffsetY, bounds, baseScale]);

  // ========================
  // RENDER
  // ========================
  return (
    <GestureDetector gesture={composedGesture}>
      {/* Fixed container that defines the gesture/clipping area */}
      <View style={{ width, height, overflow: "hidden" }}>
        {/* Moves and scales natively — no Skia clipping */}
        <Animated.View style={[{ width, height }, animatedStyle]}>
          {/*
           * Canvas is physically canvasWidth x canvasHeight (hi-res) but
           * scaled back down to logical width x height via transformOrigin
           * "top left" + scale(1/pixelRatio). At scale=1 it looks identical
           * to a normal canvas; when the user zooms, the extra pixels Skia
           * already rendered are revealed — crisp at every zoom level.
           */}
          <Canvas
            style={{
              width: canvasWidth,
              height: canvasHeight,
              transform: [{ scale: 1 / factor }],
              transformOrigin: "top left",
            }}
          >
            <Group matrix={matrix}>
              {path && (
                <Path
                  path={path}
                  color="#3941a0"
                  strokeWidth={0.5}
                  style="stroke"
                />
              )}
              {rects.map((rect) => (
                <Rect
                  key={rect.id}
                  x={rect.x}
                  y={rect.y}
                  width={rect.w}
                  height={rect.h}
                  color={STATUS_COLORS[mesasState?.[rect.id] ?? "pending"]}
                />
              ))}
            </Group>
          </Canvas>
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
