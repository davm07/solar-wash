import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

import PlantDemo from "./PlantDemo";

export default function PlantMapViewer() {
  return (
    <div className="w-full h-full bg-white rounded-xl border border-olive-100 shadow-md overflow-hidden relative p-4">
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={8}
        centerOnInit
        smooth
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-4 right-4 z-10 flex gap-2 items-center justify-center">
              <button
                onClick={() => zoomIn()}
                className="rounded-full bg-olive-200 px-2 "
              >
                +
              </button>

              <button
                onClick={() => zoomOut()}
                className="rounded-full bg-olive-200 px-2 "
              >
                -
              </button>

              <button
                onClick={() => resetTransform()}
                className="rounded-full bg-olive-200 px-2 "
              >
                Reset
              </button>
            </div>

            <TransformComponent
              wrapperClass="!w-full !h-full"
              contentClass="!w-full !h-full"
            >
              <PlantDemo className="w-full h-full" />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
