import type { ElementsMap, ExcalidrawElement } from "./types";
import { mutateElement } from "./mutateElement";
import { isFreeDrawElement, isLinearElement } from "./typeChecks";
import { SHIFT_LOCKING_ANGLE } from "../constants";
import type { AppState, Zoom } from "../types";
import { getElementBounds } from "./bounds";
import { viewportCoordsToSceneCoords } from "../utils";

// TODO:  remove invisible elements consistently actions, so that invisible elements are not recorded by the store, exported, broadcasted or persisted
//        - perhaps could be as part of a standalone 'cleanup' action, in addition to 'finalize'
//        - could also be part of `_clearElements`

// 判断元素是否不可见（宽高为0或点数过少）
export const isInvisiblySmallElement = (
  element: ExcalidrawElement,
): boolean => {
  if (isLinearElement(element) || isFreeDrawElement(element)) {
    return element.points.length < 2;
  }
  return element.width === 0 && element.height === 0;
};

// 判断元素是否在视口内
export const isElementInViewport = (
  element: ExcalidrawElement,
  width: number,
  height: number,
  viewTransformations: {
    zoom: Zoom;
    offsetLeft: number;
    offsetTop: number;
    scrollX: number;
    scrollY: number;
  },
  elementsMap: ElementsMap,
) => {
  const [x1, y1, x2, y2] = getElementBounds(element, elementsMap); // scene coordinates
  const topLeftSceneCoords = viewportCoordsToSceneCoords(
    {
      clientX: viewTransformations.offsetLeft,
      clientY: viewTransformations.offsetTop,
    },
    viewTransformations,
  );
  const bottomRightSceneCoords = viewportCoordsToSceneCoords(
    {
      clientX: viewTransformations.offsetLeft + width,
      clientY: viewTransformations.offsetTop + height,
    },
    viewTransformations,
  );

  return (
    topLeftSceneCoords.x <= x2 &&
    topLeftSceneCoords.y <= y2 &&
    bottomRightSceneCoords.x >= x1 &&
    bottomRightSceneCoords.y >= y1
  );
};

/**
 * Makes a perfect shape or diagonal/horizontal/vertical line
 */
// 获取完美形状或锁定角度的线段尺寸
export const getPerfectElementSize = (
  elementType: AppState["activeTool"]["type"],
  width: number,
  height: number,
): { width: number; height: number } => {
  const absWidth = Math.abs(width);
  const absHeight = Math.abs(height);

  if (
    elementType === "line" ||
    elementType === "arrow" ||
    elementType === "freedraw"
  ) {
    const lockedAngle =
      Math.round(Math.atan(absHeight / absWidth) / SHIFT_LOCKING_ANGLE) *
      SHIFT_LOCKING_ANGLE;
    if (lockedAngle === 0) {
      height = 0;
    } else if (lockedAngle === Math.PI / 2) {
      width = 0;
    } else {
      height = absWidth * Math.tan(lockedAngle) * Math.sign(height) || height;
    }
  } else if (elementType !== "selection") {
    height = absWidth * Math.sign(height);
  }
  return { width, height };
};

// 获取锁定角度下的线段尺寸
export const getLockedLinearCursorAlignSize = (
  originX: number,
  originY: number,
  x: number,
  y: number,
) => {
  let width = x - originX;
  let height = y - originY;

  const lockedAngle =
    Math.round(Math.atan(height / width) / SHIFT_LOCKING_ANGLE) *
    SHIFT_LOCKING_ANGLE;

  if (lockedAngle === 0) {
    height = 0;
  } else if (lockedAngle === Math.PI / 2) {
    width = 0;
  } else {
    // locked angle line, y = mx + b => mx - y + b = 0
    const a1 = Math.tan(lockedAngle);
    const b1 = -1;
    const c1 = originY - a1 * originX;

    // line through cursor, perpendicular to locked angle line
    const a2 = -1 / a1;
    const b2 = -1;
    const c2 = y - a2 * x;

    // intersection of the two lines above
    const intersectX = (b1 * c2 - b2 * c1) / (a1 * b2 - a2 * b1);
    const intersectY = (c1 * a2 - c2 * a1) / (a1 * b2 - a2 * b1);

    // delta
    width = intersectX - originX;
    height = intersectY - originY;
  }

  return { width, height };
};

// 用于调整线段左上角的尺寸（NW handler）
export const resizePerfectLineForNWHandler = (
  element: ExcalidrawElement,
  x: number,
  y: number,
) => {
  const anchorX = element.x + element.width;
  const anchorY = element.y + element.height;
  const distanceToAnchorX = x - anchorX;
  const distanceToAnchorY = y - anchorY;
  if (Math.abs(distanceToAnchorX) < Math.abs(distanceToAnchorY) / 2) {
    mutateElement(element, {
      x: anchorX,
      width: 0,
      y,
      height: -distanceToAnchorY,
    });
  } else if (Math.abs(distanceToAnchorY) < Math.abs(element.width) / 2) {
    mutateElement(element, {
      y: anchorY,
      height: 0,
    });
  } else {
    const nextHeight =
      Math.sign(distanceToAnchorY) *
      Math.sign(distanceToAnchorX) *
      element.width;
    mutateElement(element, {
      x,
      y: anchorY - nextHeight,
      width: -distanceToAnchorX,
      height: nextHeight,
    });
  }
};

// 获取归一化后的元素尺寸和坐标
export const getNormalizedDimensions = (
  element: Pick<ExcalidrawElement, "width" | "height" | "x" | "y">,
): {
  width: ExcalidrawElement["width"];
  height: ExcalidrawElement["height"];
  x: ExcalidrawElement["x"];
  y: ExcalidrawElement["y"];
} => {
  const ret = {
    width: element.width,
    height: element.height,
    x: element.x,
    y: element.y,
  };

  if (element.width < 0) {
    const nextWidth = Math.abs(element.width);
    ret.width = nextWidth;
    ret.x = element.x - nextWidth;
  }

  if (element.height < 0) {
    const nextHeight = Math.abs(element.height);
    ret.height = nextHeight;
    ret.y = element.y - nextHeight;
  }

  return ret;
};
