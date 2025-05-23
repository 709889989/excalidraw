import { getCommonBounds } from "../element";
import type { InteractiveCanvasAppState } from "../types";
import type { ScrollBars } from "./types";
import { getGlobalCSSVariable } from "../utils";
import { getLanguage } from "../i18n";
import type { ExcalidrawElement } from "../element/types";

export const SCROLLBAR_MARGIN = 4;
export const SCROLLBAR_WIDTH = 6;
export const SCROLLBAR_COLOR = "rgba(0,0,0,0.3)";

/**
 * 计算滚动条的位置和尺寸。
 * @param elements 当前场景中的所有元素
 * @param viewportWidth 视口宽度
 * @param viewportHeight 视口高度
 * @param appState 当前应用状态，包含缩放、滚动等信息
 * @returns 返回水平和垂直滚动条的位置信息，如果不需要滚动条则为null
 */
export const getScrollBars = (
  elements: readonly ExcalidrawElement[],
  viewportWidth: number,
  viewportHeight: number,
  appState: InteractiveCanvasAppState,
): ScrollBars => {
  if (!elements.length) {
    return {
      horizontal: null,
      vertical: null,
    };
  }
  // This is the bounding box of all the elements
  const [elementsMinX, elementsMinY, elementsMaxX, elementsMaxY] =
    getCommonBounds(elements);

  // Apply zoom
  const viewportWidthWithZoom = viewportWidth / appState.zoom.value;
  const viewportHeightWithZoom = viewportHeight / appState.zoom.value;

  const viewportWidthDiff = viewportWidth - viewportWidthWithZoom;
  const viewportHeightDiff = viewportHeight - viewportHeightWithZoom;

  const safeArea = {
    top: parseInt(getGlobalCSSVariable("sat")) || 0,
    bottom: parseInt(getGlobalCSSVariable("sab")) || 0,
    left: parseInt(getGlobalCSSVariable("sal")) || 0,
    right: parseInt(getGlobalCSSVariable("sar")) || 0,
  };

  const isRTL = getLanguage().rtl;

  // The viewport is the rectangle currently visible for the user
  const viewportMinX =
    -appState.scrollX + viewportWidthDiff / 2 + safeArea.left;
  const viewportMinY =
    -appState.scrollY + viewportHeightDiff / 2 + safeArea.top;
  const viewportMaxX = viewportMinX + viewportWidthWithZoom - safeArea.right;
  const viewportMaxY = viewportMinY + viewportHeightWithZoom - safeArea.bottom;

  // The scene is the bounding box of both the elements and viewport
  const sceneMinX = Math.min(elementsMinX, viewportMinX);
  const sceneMinY = Math.min(elementsMinY, viewportMinY);
  const sceneMaxX = Math.max(elementsMaxX, viewportMaxX);
  const sceneMaxY = Math.max(elementsMaxY, viewportMaxY);

  // The scrollbar represents where the viewport is in relationship to the scene

  return {
    horizontal:
      viewportMinX === sceneMinX && viewportMaxX === sceneMaxX
        ? null
        : {
            x:
              Math.max(safeArea.left, SCROLLBAR_MARGIN) +
              ((viewportMinX - sceneMinX) / (sceneMaxX - sceneMinX)) *
                viewportWidth,
            y:
              viewportHeight -
              SCROLLBAR_WIDTH -
              Math.max(SCROLLBAR_MARGIN, safeArea.bottom),
            width:
              ((viewportMaxX - viewportMinX) / (sceneMaxX - sceneMinX)) *
                viewportWidth -
              Math.max(SCROLLBAR_MARGIN * 2, safeArea.left + safeArea.right),
            height: SCROLLBAR_WIDTH,
          },
    vertical:
      viewportMinY === sceneMinY && viewportMaxY === sceneMaxY
        ? null
        : {
            x: isRTL
              ? Math.max(safeArea.left, SCROLLBAR_MARGIN)
              : viewportWidth -
                SCROLLBAR_WIDTH -
                Math.max(safeArea.right, SCROLLBAR_MARGIN),
            y:
              ((viewportMinY - sceneMinY) / (sceneMaxY - sceneMinY)) *
                viewportHeight +
              Math.max(safeArea.top, SCROLLBAR_MARGIN),
            width: SCROLLBAR_WIDTH,
            height:
              ((viewportMaxY - viewportMinY) / (sceneMaxY - sceneMinY)) *
                viewportHeight -
              Math.max(SCROLLBAR_MARGIN * 2, safeArea.top + safeArea.bottom),
          },
  };
};

/**
 * 判断鼠标是否悬停在滚动条上。
 * @param scrollBars 当前滚动条的位置信息
 * @param x 鼠标x坐标
 * @param y 鼠标y坐标
 * @returns 返回是否悬停在水平或垂直滚动条上
 */
export const isOverScrollBars = (
  scrollBars: ScrollBars,
  x: number,
  y: number,
): {
  isOverEither: boolean;
  isOverHorizontal: boolean;
  isOverVertical: boolean;
} => {
  const [isOverHorizontal, isOverVertical] = [
    scrollBars.horizontal,
    scrollBars.vertical,
  ].map((scrollBar) => {
    return (
      scrollBar != null &&
      scrollBar.x <= x &&
      x <= scrollBar.x + scrollBar.width &&
      scrollBar.y <= y &&
      y <= scrollBar.y + scrollBar.height
    );
  });
  const isOverEither = isOverHorizontal || isOverVertical;
  return { isOverEither, isOverHorizontal, isOverVertical };
};
