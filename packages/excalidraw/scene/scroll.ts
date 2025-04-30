import type { AppState, PointerCoords, Zoom } from "../types";
import type { ExcalidrawElement } from "../element/types";
import {
  getCommonBounds,
  getClosestElementBounds,
  getVisibleElements,
} from "../element";

import {
  sceneCoordsToViewportCoords,
  viewportCoordsToSceneCoords,
} from "../utils";

// 判断给定的场景坐标范围是否超出当前视口
const isOutsideViewPort = (appState: AppState, cords: Array<number>) => {
  const [x1, y1, x2, y2] = cords;
  const { x: viewportX1, y: viewportY1 } = sceneCoordsToViewportCoords(
    { sceneX: x1, sceneY: y1 },
    appState,
  );
  const { x: viewportX2, y: viewportY2 } = sceneCoordsToViewportCoords(
    { sceneX: x2, sceneY: y2 },
    appState,
  );
  return (
    viewportX2 - viewportX1 > appState.width ||
    viewportY2 - viewportY1 > appState.height
  );
};

// 将视口滚动到指定的场景点的中心
export const centerScrollOn = ({
  scenePoint,
  viewportDimensions,
  zoom,
}: {
  scenePoint: PointerCoords; // 需要居中的场景坐标点
  viewportDimensions: { height: number; width: number }; // 视口尺寸
  zoom: Zoom; // 缩放比例
}) => {
  return {
    scrollX: viewportDimensions.width / 2 / zoom.value - scenePoint.x,
    scrollY: viewportDimensions.height / 2 / zoom.value - scenePoint.y,
  };
};

// 计算元素集合的中心点，并返回滚动到该中心点所需的 scrollX 和 scrollY
export const calculateScrollCenter = (
  elements: readonly ExcalidrawElement[],
  appState: AppState,
): { scrollX: number; scrollY: number } => {
  elements = getVisibleElements(elements);

  if (!elements.length) {
    return {
      scrollX: 0,
      scrollY: 0,
    };
  }
  let [x1, y1, x2, y2] = getCommonBounds(elements);

  if (isOutsideViewPort(appState, [x1, y1, x2, y2])) {
    [x1, y1, x2, y2] = getClosestElementBounds(
      elements,
      viewportCoordsToSceneCoords(
        { clientX: appState.scrollX, clientY: appState.scrollY },
        appState,
      ),
    );
  }

  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;

  return centerScrollOn({
    scenePoint: { x: centerX, y: centerY },
    viewportDimensions: { width: appState.width, height: appState.height },
    zoom: appState.zoom,
  });
};
