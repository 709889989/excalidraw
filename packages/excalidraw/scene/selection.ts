import type {
  ElementsMap,
  ElementsMapOrArray,
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
} from "../element/types";
import { getElementAbsoluteCoords, getElementBounds } from "../element";
import type { AppState, InteractiveCanvasAppState } from "../types";
import { isBoundToContainer, isFrameLikeElement } from "../element/typeChecks";
import {
  elementOverlapsWithFrame,
  getContainingFrame,
  getFrameChildren,
} from "../frame";
import { isShallowEqual } from "../utils";
import { isElementInViewport } from "../element/sizeHelpers";

/**
 * Frames and their containing elements are not to be selected at the same time.
 * Given an array of selected elements, if there are frames and their containing elements
 * we only keep the frames.
 * @param selectedElements
 * 中文：排除选中元素中属于已选中的框架（frame）的元素，只保留框架本身。
 */
export const excludeElementsInFramesFromSelection = <
  T extends ExcalidrawElement,
>(
  selectedElements: readonly T[],
) => {
  const framesInSelection = new Set<T["id"]>();

  selectedElements.forEach((element) => {
    if (isFrameLikeElement(element)) {
      framesInSelection.add(element.id);
    }
  });

  return selectedElements.filter((element) => {
    if (element.frameId && framesInSelection.has(element.frameId)) {
      return false;
    }
    return true;
  });
};

/**
 * 获取在选区(selection)内的所有元素。
 * @param elements
 * @param selection
 * @param elementsMap
 * @param excludeElementsInFrames
 */
export const getElementsWithinSelection = (
  elements: readonly NonDeletedExcalidrawElement[],
  selection: NonDeletedExcalidrawElement,
  elementsMap: ElementsMap,
  excludeElementsInFrames: boolean = true,
) => {
  const [selectionX1, selectionY1, selectionX2, selectionY2] =
    getElementAbsoluteCoords(selection, elementsMap);

  let elementsInSelection = elements.filter((element) => {
    let [elementX1, elementY1, elementX2, elementY2] = getElementBounds(
      element,
      elementsMap,
    );

    const containingFrame = getContainingFrame(element, elementsMap);
    if (containingFrame) {
      const [fx1, fy1, fx2, fy2] = getElementBounds(
        containingFrame,
        elementsMap,
      );

      elementX1 = Math.max(fx1, elementX1);
      elementY1 = Math.max(fy1, elementY1);
      elementX2 = Math.min(fx2, elementX2);
      elementY2 = Math.min(fy2, elementY2);
    }

    return (
      element.locked === false &&
      element.type !== "selection" &&
      !isBoundToContainer(element) &&
      selectionX1 <= elementX1 &&
      selectionY1 <= elementY1 &&
      selectionX2 >= elementX2 &&
      selectionY2 >= elementY2
    );
  });

  elementsInSelection = excludeElementsInFrames
    ? excludeElementsInFramesFromSelection(elementsInSelection)
    : elementsInSelection;

  elementsInSelection = elementsInSelection.filter((element) => {
    const containingFrame = getContainingFrame(element, elementsMap);

    if (containingFrame) {
      return elementOverlapsWithFrame(element, containingFrame, elementsMap);
    }

    return true;
  });

  return elementsInSelection;
};

/**
 * 获取可见且未被选中的元素。
 * @param elements
 * @param selectedElements
 * @param appState
 * @param elementsMap
 */
export const getVisibleAndNonSelectedElements = (
  elements: readonly NonDeletedExcalidrawElement[],
  selectedElements: readonly NonDeletedExcalidrawElement[],
  appState: AppState,
  elementsMap: ElementsMap,
) => {
  const selectedElementsSet = new Set(
    selectedElements.map((element) => element.id),
  );
  return elements.filter((element) => {
    const isVisible = isElementInViewport(
      element,
      appState.width,
      appState.height,
      appState,
      elementsMap,
    );

    return !selectedElementsSet.has(element.id) && isVisible;
  });
};

// FIXME move this into the editor instance to keep utility methods stateless
/**
 * 判断是否有元素被选中（带缓存优化）。
 * @param elements
 * @param appState
 */
export const isSomeElementSelected = (function () {
  let lastElements: readonly NonDeletedExcalidrawElement[] | null = null;
  let lastSelectedElementIds: AppState["selectedElementIds"] | null = null;
  let isSelected: boolean | null = null;

  const ret = (
    elements: readonly NonDeletedExcalidrawElement[],
    appState: Pick<AppState, "selectedElementIds">,
  ): boolean => {
    if (
      isSelected != null &&
      elements === lastElements &&
      appState.selectedElementIds === lastSelectedElementIds
    ) {
      return isSelected;
    }

    isSelected = elements.some(
      (element) => appState.selectedElementIds[element.id],
    );
    lastElements = elements;
    lastSelectedElementIds = appState.selectedElementIds;

    return isSelected;
  };

  ret.clearCache = () => {
    lastElements = null;
    lastSelectedElementIds = null;
    isSelected = null;
  };

  return ret;
})();

/**
 * Returns common attribute (picked by `getAttribute` callback) of selected
 *  elements. If elements don't share the same value, returns `null`.
 * 获取所有选中元素的共同属性值，如果不一致则返回 null。
 * @param elements
 * @param appState
 * @param getAttribute
 */
export const getCommonAttributeOfSelectedElements = <T>(
  elements: readonly NonDeletedExcalidrawElement[],
  appState: Pick<AppState, "selectedElementIds">,
  getAttribute: (element: ExcalidrawElement) => T,
): T | null => {
  const attributes = Array.from(
    new Set(
      getSelectedElements(elements, appState).map((element) =>
        getAttribute(element),
      ),
    ),
  );
  return attributes.length === 1 ? attributes[0] : null;
};

/**
 * 获取所有被选中的元素。
 * @param elements
 * @param appState
 * @param opts
 */
export const getSelectedElements = (
  elements: ElementsMapOrArray,
  appState: Pick<InteractiveCanvasAppState, "selectedElementIds">,
  opts?: {
    includeBoundTextElement?: boolean;
    includeElementsInFrames?: boolean;
  },
) => {
  const selectedElements: ExcalidrawElement[] = [];
  for (const element of elements.values()) {
    if (appState.selectedElementIds[element.id]) {
      selectedElements.push(element);
      continue;
    }
    if (
      opts?.includeBoundTextElement &&
      isBoundToContainer(element) &&
      appState.selectedElementIds[element?.containerId]
    ) {
      selectedElements.push(element);
      continue;
    }
  }

  if (opts?.includeElementsInFrames) {
    const elementsToInclude: ExcalidrawElement[] = [];
    selectedElements.forEach((element) => {
      if (isFrameLikeElement(element)) {
        getFrameChildren(elements, element.id).forEach((e) =>
          elementsToInclude.push(e),
        );
      }
      elementsToInclude.push(element);
    });

    return elementsToInclude;
  }

  return selectedElements;
};

/**
 * 获取当前操作目标元素（编辑中或选中元素）。
 * @param elements
 * @param appState
 */
export const getTargetElements = (
  elements: ElementsMapOrArray,
  appState: Pick<AppState, "selectedElementIds" | "editingElement">,
) =>
  appState.editingElement
    ? [appState.editingElement]
    : getSelectedElements(elements, appState, {
        includeBoundTextElement: true,
      });

/**
 * returns prevState's selectedElementids if no change from previous, so as to
 * retain reference identity for memoization
 * 如果选中元素未变化，则复用上一次的 selectedElementIds 引用。
 * @param nextSelectedElementIds
 * @param prevState
 */
export const makeNextSelectedElementIds = (
  nextSelectedElementIds: AppState["selectedElementIds"],
  prevState: Pick<AppState, "selectedElementIds">,
) => {
  if (isShallowEqual(prevState.selectedElementIds, nextSelectedElementIds)) {
    return prevState.selectedElementIds;
  }

  return nextSelectedElementIds;
};
