import { Canvas, Path, Group, Skia, Rect } from "@shopify/react-native-skia";
import { ParsedSvg } from "../utils/parseSvg";
import { useCallback, useMemo, memo } from "react";
import { PixelRatio, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import {
  useSharedValue,
  useDerivedValue,
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

const MAX_ZOOM = 50;
const MIN_ZOOM = 0.5;

export const SkiaPlantMap = memo(function SkiaPlantMap({
  parsedSvg,
  width,
  height,
  mesasState,
}: SkiaPlantMapProps) {
  const { borderD, rects } = parsedSvg;

  // Render the canvas at the device's physical pixel ratio so it stays
  // sharp when the user zooms in.
  const pixelRatio = PixelRatio.get();
  const factor = pixelRatio;
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
  // Logical-scale equivalent for gesture calculations (view-space)
  const baseScaleLog = Math.min(width / bounds.width, height / bounds.height);

  // ========================
  // GESTURES
  // ========================
  const svgCenterX = bounds.x + bounds.width / 2;
  const svgCenterY = bounds.y + bounds.height / 2;

  // zoom/pan are applied inside the Skia rendering matrix, not as native
  // view transforms — this keeps the canvas at a fixed physical size and
  // prevents crashes at high zoom.
  const zoom = useSharedValue(1);
  const savedZoom = useSharedValue(1);
  const viewCenterX = useSharedValue(svgCenterX);
  const viewCenterY = useSharedValue(svgCenterY);
  const savedViewCenterX = useSharedValue(svgCenterX);
  const savedViewCenterY = useSharedValue(svgCenterY);

  const getBoundaries = useCallback(
    (currentZoom: number) => {
      "worklet";
      const halfVisibleW = width / (2 * baseScaleLog * currentZoom);
      const halfVisibleH = height / (2 * baseScaleLog * currentZoom);
      const minX = bounds.x + halfVisibleW;
      const maxX = bounds.x + bounds.width - halfVisibleW;
      const minY = bounds.y + halfVisibleH;
      const maxY = bounds.y + bounds.height - halfVisibleH;
      // When the viewport is larger than the SVG (zoom <= 1), boundaries
      // cross; fall back to SVG center — panning is disabled at that zoom.
      return {
        minX: minX < maxX ? minX : svgCenterX,
        maxX: minX < maxX ? maxX : svgCenterX,
        minY: minY < maxY ? minY : svgCenterY,
        maxY: minY < maxY ? maxY : svgCenterY,
      };
    },
    [width, height, baseScaleLog, bounds, svgCenterX, svgCenterY],
  );

  // Pinch to zoom — zooms toward the finger focal point in SVG space
  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      const newZoom = Math.max(
        MIN_ZOOM,
        Math.min(savedZoom.value * event.scale, MAX_ZOOM),
      );
      const logScaleOld = baseScaleLog * zoom.value;
      const logScaleNew = baseScaleLog * newZoom;

      // Convert the focal view-point to SVG coordinates
      const focalSVGX =
        viewCenterX.value + (event.focalX - width / 2) / logScaleOld;
      const focalSVGY =
        viewCenterY.value + (event.focalY - height / 2) / logScaleOld;

      // Adjust viewCenter so the same SVG point stays under the fingers
      viewCenterX.value = focalSVGX - (event.focalX - width / 2) / logScaleNew;
      viewCenterY.value = focalSVGY - (event.focalY - height / 2) / logScaleNew;
      zoom.value = newZoom;

      // Clamp viewCenter to bounds (hard clamp for pinch, rubber-band for pan)
      const { minX, maxX, minY, maxY } = getBoundaries(zoom.value);
      viewCenterX.value = Math.max(minX, Math.min(viewCenterX.value, maxX));
      viewCenterY.value = Math.max(minY, Math.min(viewCenterY.value, maxY));
    })
    .onEnd(() => {
      savedZoom.value = zoom.value;
      savedViewCenterX.value = viewCenterX.value;
      savedViewCenterY.value = viewCenterY.value;
    });

  // Pan — move viewCenter inversely (activates when zoomed in)
  const panGesture = Gesture.Pan()
    .onStart(() => {
      savedViewCenterX.value = viewCenterX.value;
      savedViewCenterY.value = viewCenterY.value;
    })
    .onUpdate((event) => {
      if (zoom.value > 1) {
        const scaleInSVG = baseScaleLog * zoom.value;
        const nextX = savedViewCenterX.value - event.translationX / scaleInSVG;
        const nextY = savedViewCenterY.value - event.translationY / scaleInSVG;
        const { minX, maxX, minY, maxY } = getBoundaries(zoom.value);

        // Rubber-band X
        if (nextX < minX) {
          viewCenterX.value = minX - (minX - nextX) * 0.2;
        } else if (nextX > maxX) {
          viewCenterX.value = maxX + (nextX - maxX) * 0.2;
        } else {
          viewCenterX.value = nextX;
        }
        // Rubber-band Y
        if (nextY < minY) {
          viewCenterY.value = minY - (minY - nextY) * 0.2;
        } else if (nextY > maxY) {
          viewCenterY.value = maxY + (nextY - maxY) * 0.2;
        } else {
          viewCenterY.value = nextY;
        }
      }
    })
    .onEnd(() => {
      const { minX, maxX, minY, maxY } = getBoundaries(zoom.value);
      viewCenterX.value = withSpring(
        Math.max(minX, Math.min(viewCenterX.value, maxX)),
        { damping: 15 },
      );
      viewCenterY.value = withSpring(
        Math.max(minY, Math.min(viewCenterY.value, maxY)),
        { damping: 15 },
      );
      savedViewCenterX.value = Math.max(
        minX,
        Math.min(viewCenterX.value, maxX),
      );
      savedViewCenterY.value = Math.max(
        minY,
        Math.min(viewCenterY.value, maxY),
      );
    });

  // Double-tap to reset
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart(() => {
      zoom.value = withTiming(1);
      savedZoom.value = 1;
      viewCenterX.value = withTiming(svgCenterX);
      viewCenterY.value = withTiming(svgCenterY);
      savedViewCenterX.value = svgCenterX;
      savedViewCenterY.value = svgCenterY;
    });

  const composedGesture = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTapGesture,
  );

  // Matrix normalizes SVG coords into the hi-res canvas and applies
  // user zoom/pan — all inside Skia, no native view transforms.
  const matrix = useDerivedValue(() => {
    const m = Skia.Matrix();
    m.translate(canvasWidth / 2, canvasHeight / 2);
    m.scale(baseScale * zoom.value, baseScale * zoom.value);
    m.translate(-viewCenterX.value, -viewCenterY.value);
    return m;
  }, [baseScale, canvasWidth, canvasHeight]);

  // ========================
  // RENDER
  // ========================
  return (
    <GestureDetector gesture={composedGesture}>
      {/* Fixed container that defines the gesture/clipping area */}
      <View style={{ width, height, overflow: "hidden" }}>
        {/*
         * Canvas is physically canvasWidth x canvasHeight (hi-res) but
         * scaled back down to logical width x height via transformOrigin
         * "top left" + scale(1/pixelRatio). All zoom/pan is handled inside
         * the Skia matrix — the view layer stays at fixed size, preventing
         * crashes at high zoom.
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
      </View>
    </GestureDetector>
  );
});
