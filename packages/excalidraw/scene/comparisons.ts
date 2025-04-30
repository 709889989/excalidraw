import { isIframeElement } from "../element/typeChecks";
import type {
  ExcalidrawIframeElement,
  NonDeletedExcalidrawElement,
} from "../element/types";
import type { ElementOrToolType } from "../types";

/**
 * 判断给定类型的元素是否有背景色
 * @param type 元素或工具类型
 * @returns 是否有背景色
 */
export const hasBackground = (type: ElementOrToolType) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "ellipse" ||
  type === "diamond" ||
  type === "line" ||
  type === "freedraw";

/**
 * 判断给定类型的元素是否有描边颜色
 * @param type 元素或工具类型
 * @returns 是否有描边颜色
 */
export const hasStrokeColor = (type: ElementOrToolType) =>
  type !== "image" && type !== "frame" && type !== "magicframe";

/**
 * 判断给定类型的元素是否有描边宽度
 * @param type 元素或工具类型
 * @returns 是否有描边宽度
 */
export const hasStrokeWidth = (type: ElementOrToolType) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "ellipse" ||
  type === "diamond" ||
  type === "freedraw" ||
  type === "arrow" ||
  type === "line";

/**
 * 判断给定类型的元素是否有描边样式
 * @param type 元素或工具类型
 * @returns 是否有描边样式
 */
export const hasStrokeStyle = (type: ElementOrToolType) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "ellipse" ||
  type === "diamond" ||
  type === "arrow" ||
  type === "line";

/**
 * 判断给定类型的元素是否可以更改圆角
 * @param type 元素或工具类型
 * @returns 是否可以更改圆角
 */
export const canChangeRoundness = (type: ElementOrToolType) =>
  type === "rectangle" ||
  type === "iframe" ||
  type === "embeddable" ||
  type === "line" ||
  type === "diamond" ||
  type === "image";

/**
 * 判断工具是否为箭头
 * @param type 元素或工具类型
 * @returns 是否为箭头
 */
export const toolIsArrow = (type: ElementOrToolType) => type === "arrow";

/**
 * 判断给定类型的元素是否可以拥有箭头
 * @param type 元素或工具类型
 * @returns 是否可以拥有箭头
 */
export const canHaveArrowheads = (type: ElementOrToolType) => type === "arrow";

/**
 * 获取指定位置的元素
 * @param elements 元素列表
 * @param isAtPositionFn 判断元素是否在指定位置的函数
 * @returns 位于指定位置的元素
 */
export const getElementAtPosition = (
  elements: readonly NonDeletedExcalidrawElement[],
  isAtPositionFn: (element: NonDeletedExcalidrawElement) => boolean,
) => {
  let hitElement = null;
  // We need to to hit testing from front (end of the array) to back (beginning of the array)
  // because array is ordered from lower z-index to highest and we want element z-index
  // with higher z-index
  for (let index = elements.length - 1; index >= 0; --index) {
    const element = elements[index];
    if (element.isDeleted) {
      continue;
    }
    if (isAtPositionFn(element)) {
      hitElement = element;
      break;
    }
  }

  return hitElement;
};

/**
 * 获取指定位置的所有元素
 * @param elements 元素列表
 * @param isAtPositionFn 判断元素是否在指定位置的函数
 * @returns 位于指定位置的所有元素
 */
export const getElementsAtPosition = (
  elements: readonly NonDeletedExcalidrawElement[],
  isAtPositionFn: (element: NonDeletedExcalidrawElement) => boolean,
) => {
  const iframeLikes: ExcalidrawIframeElement[] = [];
  // The parameter elements comes ordered from lower z-index to higher.
  // We want to preserve that order on the returned array.
  // Exception being embeddables which should be on top of everything else in
  // terms of hit testing.
  const elsAtPos = elements.filter((element) => {
    const hit = !element.isDeleted && isAtPositionFn(element);
    if (hit) {
      if (isIframeElement(element)) {
        iframeLikes.push(element);
        return false;
      }
      return true;
    }
    return false;
  });
  return elsAtPos.concat(iframeLikes);
};
