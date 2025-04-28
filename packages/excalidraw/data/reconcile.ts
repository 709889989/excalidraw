import throttle from "lodash.throttle";
import { ENV } from "../constants";
import type { OrderedExcalidrawElement } from "../element/types";
import {
  orderByFractionalIndex,
  syncInvalidIndices,
  validateFractionalIndices,
} from "../fractionalIndex";
import type { AppState } from "../types";
import type { MakeBrand } from "../utility-types";
import { arrayToMap } from "../utils";

export type ReconciledExcalidrawElement = OrderedExcalidrawElement &
  MakeBrand<"ReconciledElement">;

export type RemoteExcalidrawElement = OrderedExcalidrawElement &
  MakeBrand<"RemoteExcalidrawElement">;

/**
 * 判断是否应该丢弃远程元素
 * @param localAppState 本地应用状态
 * @param local 本地元素（可能未定义）
 * @param remote 远程元素
 * @returns 如果应该丢弃远程元素则返回true，否则返回false
 */
const shouldDiscardRemoteElement = (
  localAppState: AppState,
  local: OrderedExcalidrawElement | undefined,
  remote: RemoteExcalidrawElement,
): boolean => {
  if (
    local &&
    // local element is being edited
    (local.id === localAppState.editingElement?.id ||
      local.id === localAppState.resizingElement?.id ||
      local.id === localAppState.draggingElement?.id || // TODO: Is this still valid? As draggingElement is selection element, which is never part of the elements array
      // local element is newer
      local.version > remote.version ||
      // resolve conflicting edits deterministically by taking the one with
      // the lowest versionNonce
      (local.version === remote.version &&
        local.versionNonce < remote.versionNonce))
  ) {
    return true;
  }
  return false;
};

/**
 * 验证元素索引，使用节流函数优化性能
 * @param orderedElements 已排序的元素数组
 * @param localElements 本地元素数组
 * @param remoteElements 远程元素数组
 */
const validateIndicesThrottled = throttle(
  (
    orderedElements: readonly OrderedExcalidrawElement[],
    localElements: readonly OrderedExcalidrawElement[],
    remoteElements: readonly RemoteExcalidrawElement[],
  ) => {
    if (
      import.meta.env.DEV ||
      import.meta.env.MODE === ENV.TEST ||
      window?.DEBUG_FRACTIONAL_INDICES
    ) {
      // create new instances due to the mutation
      const elements = syncInvalidIndices(
        orderedElements.map((x) => ({ ...x })),
      );

      validateFractionalIndices(elements, {
        // throw in dev & test only, to remain functional on `DEBUG_FRACTIONAL_INDICES`
        shouldThrow: import.meta.env.DEV || import.meta.env.MODE === ENV.TEST,
        includeBoundTextValidation: true,
        reconciliationContext: {
          localElements,
          remoteElements,
        },
      });
    }
  },
  1000 * 60,
  { leading: true, trailing: false },
);

/**
 * 协调本地和远程元素，返回合并后的元素数组
 * @param localElements 本地元素数组
 * @param remoteElements 远程元素数组
 * @param localAppState 本地应用状态
 * @returns 合并后的元素数组
 */
export const reconcileElements = (
  localElements: readonly OrderedExcalidrawElement[],
  remoteElements: readonly RemoteExcalidrawElement[],
  localAppState: AppState,
): ReconciledExcalidrawElement[] => {
  const localElementsMap = arrayToMap(localElements);
  const reconciledElements: OrderedExcalidrawElement[] = [];
  const added = new Set<string>();

  // process remote elements
  for (const remoteElement of remoteElements) {
    if (!added.has(remoteElement.id)) {
      const localElement = localElementsMap.get(remoteElement.id);
      const discardRemoteElement = shouldDiscardRemoteElement(
        localAppState,
        localElement,
        remoteElement,
      );

      if (localElement && discardRemoteElement) {
        reconciledElements.push(localElement);
        added.add(localElement.id);
      } else {
        reconciledElements.push(remoteElement);
        added.add(remoteElement.id);
      }
    }
  }

  // process remaining local elements
  for (const localElement of localElements) {
    if (!added.has(localElement.id)) {
      reconciledElements.push(localElement);
      added.add(localElement.id);
    }
  }

  const orderedElements = orderByFractionalIndex(reconciledElements);

  validateIndicesThrottled(orderedElements, localElements, remoteElements);

  // de-duplicate indices
  syncInvalidIndices(orderedElements);

  return orderedElements as ReconciledExcalidrawElement[];
};
