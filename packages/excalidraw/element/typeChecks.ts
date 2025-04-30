import { ROUNDNESS } from "../constants";
import type { ElementOrToolType } from "../types";
import type { MarkNonNullable } from "../utility-types";
import { assertNever } from "../utils";
import type {
  ExcalidrawElement,
  ExcalidrawTextElement,
  ExcalidrawEmbeddableElement,
  ExcalidrawLinearElement,
  ExcalidrawBindableElement,
  ExcalidrawFreeDrawElement,
  InitializedExcalidrawImageElement,
  ExcalidrawImageElement,
  ExcalidrawTextElementWithContainer,
  ExcalidrawTextContainer,
  ExcalidrawFrameElement,
  RoundnessType,
  ExcalidrawFrameLikeElement,
  ExcalidrawElementType,
  ExcalidrawIframeElement,
  ExcalidrawIframeLikeElement,
  ExcalidrawMagicFrameElement,
  ExcalidrawArrowElement,
  ExcalidrawElbowArrowElement,
  PointBinding,
  FixedPointBinding,
} from "./types";

/**
 * 判断元素是否为已初始化的图片元素（即 type 为 image 且有 fileId）
 */
export const isInitializedImageElement = (
  element: ExcalidrawElement | null,
): element is InitializedExcalidrawImageElement => {
  return !!element && element.type === "image" && !!element.fileId;
};

/**
 * 判断元素是否为图片元素（type 为 image）
 */
export const isImageElement = (
  element: ExcalidrawElement | null,
): element is ExcalidrawImageElement => {
  return !!element && element.type === "image";
};

/**
 * 判断元素是否为可嵌入元素（type 为 embeddable）
 */
export const isEmbeddableElement = (
  element: ExcalidrawElement | null | undefined,
): element is ExcalidrawEmbeddableElement => {
  return !!element && element.type === "embeddable";
};

/**
 * 判断元素是否为 iframe 元素（type 为 iframe）
 */
export const isIframeElement = (
  element: ExcalidrawElement | null,
): element is ExcalidrawIframeElement => {
  return !!element && element.type === "iframe";
};

/**
 * 判断元素是否为 iframe 类元素（type 为 iframe 或 embeddable）
 */
export const isIframeLikeElement = (
  element: ExcalidrawElement | null,
): element is ExcalidrawIframeLikeElement => {
  return (
    !!element && (element.type === "iframe" || element.type === "embeddable")
  );
};

/**
 * 判断元素是否为文本元素（type 为 text）
 */
export const isTextElement = (
  element: ExcalidrawElement | null,
): element is ExcalidrawTextElement => {
  return element != null && element.type === "text";
};

/**
 * 判断元素是否为框架元素（type 为 frame）
 */
export const isFrameElement = (
  element: ExcalidrawElement | null,
): element is ExcalidrawFrameElement => {
  return element != null && element.type === "frame";
};

/**
 * 判断元素是否为魔法框架元素（type 为 magicframe）
 */
export const isMagicFrameElement = (
  element: ExcalidrawElement | null,
): element is ExcalidrawMagicFrameElement => {
  return element != null && element.type === "magicframe";
};

/**
 * 判断元素是否为框架类元素（type 为 frame 或 magicframe）
 */
export const isFrameLikeElement = (
  element: ExcalidrawElement | null,
): element is ExcalidrawFrameLikeElement => {
  return (
    element != null &&
    (element.type === "frame" || element.type === "magicframe")
  );
};

/**
 * 判断元素是否为自由绘制元素（type 为 freedraw）
 */
export const isFreeDrawElement = (
  element?: ExcalidrawElement | null,
): element is ExcalidrawFreeDrawElement => {
  return element != null && isFreeDrawElementType(element.type);
};

/**
 * 判断元素类型是否为自由绘制类型（type 为 freedraw）
 */
export const isFreeDrawElementType = (
  elementType: ExcalidrawElementType,
): boolean => {
  return elementType === "freedraw";
};

/**
 * 判断元素是否为线性元素（type 为 arrow 或 line）
 */
export const isLinearElement = (
  element?: ExcalidrawElement | null,
): element is ExcalidrawLinearElement => {
  return element != null && isLinearElementType(element.type);
};

/**
 * 判断元素是否为箭头元素（type 为 arrow）
 */
export const isArrowElement = (
  element?: ExcalidrawElement | null,
): element is ExcalidrawArrowElement => {
  return element != null && element.type === "arrow";
};

/**
 * 判断元素是否为肘形箭头（type 为 arrow 且 elbowed 为 true）
 */
export const isElbowArrow = (
  element?: ExcalidrawElement,
): element is ExcalidrawElbowArrowElement => {
  return isArrowElement(element) && element.elbowed;
};

/**
 * 判断元素类型是否为线性类型（type 为 arrow 或 line）
 */
export const isLinearElementType = (
  elementType: ElementOrToolType,
): boolean => {
  return (
    elementType === "arrow" || elementType === "line" // || elementType === "freedraw"
  );
};

/**
 * 判断元素是否为绑定元素（type 为 arrow 且可选是否包含 locked 状态）
 */
export const isBindingElement = (
  element?: ExcalidrawElement | null,
  includeLocked = true,
): element is ExcalidrawLinearElement => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    isBindingElementType(element.type)
  );
};

/**
 * 判断元素类型是否为绑定类型（type 为 arrow）
 */
export const isBindingElementType = (
  elementType: ElementOrToolType,
): boolean => {
  return elementType === "arrow";
};

/**
 * 判断元素是否为可绑定元素（type 为 rectangle、diamond、ellipse 等，且可选是否包含 locked 状态）
 */
export const isBindableElement = (
  element: ExcalidrawElement | null | undefined,
  includeLocked = true,
): element is ExcalidrawBindableElement => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    (element.type === "rectangle" ||
      element.type === "diamond" ||
      element.type === "ellipse" ||
      element.type === "image" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      (element.type === "text" && !element.containerId))
  );
};

/**
 * 判断元素是否为矩形类元素（type 为 rectangle、diamond、image 等）
 */
export const isRectanguloidElement = (
  element?: ExcalidrawElement | null,
): element is ExcalidrawBindableElement => {
  return (
    element != null &&
    (element.type === "rectangle" ||
      element.type === "diamond" ||
      element.type === "image" ||
      element.type === "iframe" ||
      element.type === "embeddable" ||
      element.type === "frame" ||
      element.type === "magicframe" ||
      (element.type === "text" && !element.containerId))
  );
};

/**
 * 判断元素是否为文本绑定容器（type 为 rectangle、diamond、ellipse 等，且可选是否包含 locked 状态）
 */
export const isTextBindableContainer = (
  element: ExcalidrawElement | null,
  includeLocked = true,
): element is ExcalidrawTextContainer => {
  return (
    element != null &&
    (!element.locked || includeLocked === true) &&
    (element.type === "rectangle" ||
      element.type === "diamond" ||
      element.type === "ellipse" ||
      isArrowElement(element))
  );
};

/**
 * 判断对象是否为 Excalidraw 元素
 */
export const isExcalidrawElement = (
  element: any,
): element is ExcalidrawElement => {
  const type: ExcalidrawElementType | undefined = element?.type;
  if (!type) {
    return false;
  }
  switch (type) {
    case "text":
    case "diamond":
    case "rectangle":
    case "iframe":
    case "embeddable":
    case "ellipse":
    case "arrow":
    case "freedraw":
    case "line":
    case "frame":
    case "magicframe":
    case "image":
    case "selection": {
      return true;
    }
    default: {
      assertNever(type, null);
      return false;
    }
  }
};

/**
 * 判断元素是否绑定了文本元素
 */
export const hasBoundTextElement = (
  element: ExcalidrawElement | null,
): element is MarkNonNullable<ExcalidrawBindableElement, "boundElements"> => {
  return (
    isTextBindableContainer(element) &&
    !!element.boundElements?.some(({ type }) => type === "text")
  );
};

/**
 * 判断元素是否绑定到容器
 */
export const isBoundToContainer = (
  element: ExcalidrawElement | null,
): element is ExcalidrawTextElementWithContainer => {
  return (
    element !== null &&
    "containerId" in element &&
    element.containerId !== null &&
    isTextElement(element)
  );
};

/**
 * 判断元素类型是否使用自适应半径
 */
export const isUsingAdaptiveRadius = (type: string) =>
  type === "rectangle" ||
  type === "embeddable" ||
  type === "iframe" ||
  type === "image";

/**
 * 判断元素类型是否使用比例半径
 */
export const isUsingProportionalRadius = (type: string) =>
  type === "line" || type === "arrow" || type === "diamond";

/**
 * 判断是否可以将指定的圆角类型应用于元素
 */
export const canApplyRoundnessTypeToElement = (
  roundnessType: RoundnessType,
  element: ExcalidrawElement,
) => {
  if (
    (roundnessType === ROUNDNESS.ADAPTIVE_RADIUS ||
      // if legacy roundness, it can be applied to elements that currently
      // use adaptive radius
      roundnessType === ROUNDNESS.LEGACY) &&
    isUsingAdaptiveRadius(element.type)
  ) {
    return true;
  }
  if (
    roundnessType === ROUNDNESS.PROPORTIONAL_RADIUS &&
    isUsingProportionalRadius(element.type)
  ) {
    return true;
  }

  return false;
};

/**
 * 获取元素的默认圆角类型
 */
export const getDefaultRoundnessTypeForElement = (
  element: ExcalidrawElement,
) => {
  if (isUsingProportionalRadius(element.type)) {
    return {
      type: ROUNDNESS.PROPORTIONAL_RADIUS,
    };
  }

  if (isUsingAdaptiveRadius(element.type)) {
    return {
      type: ROUNDNESS.ADAPTIVE_RADIUS,
    };
  }

  return null;
};

/**
 * 判断绑定是否为固定点绑定
 */
export const isFixedPointBinding = (
  binding: PointBinding,
): binding is FixedPointBinding => {
  return binding.fixedPoint != null;
};
