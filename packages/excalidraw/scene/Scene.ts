import throttle from "lodash.throttle";
import type {
  ExcalidrawElement,
  NonDeletedExcalidrawElement,
  NonDeleted,
  ExcalidrawFrameLikeElement,
  ElementsMapOrArray,
  SceneElementsMap,
  NonDeletedSceneElementsMap,
  OrderedExcalidrawElement,
  Ordered,
} from "../element/types";
import { isNonDeletedElement } from "../element";
import type { LinearElementEditor } from "../element/linearElementEditor";
import { isFrameLikeElement } from "../element/typeChecks";
import { getSelectedElements } from "./selection";
import type { AppState } from "../types";
import type { Assert, SameType } from "../utility-types";
import { randomInteger } from "../random";
import {
  syncInvalidIndices,
  syncMovedIndices,
  validateFractionalIndices,
} from "../fractionalIndex";
import { arrayToMap } from "../utils";
import { toBrandedType } from "../utils";
import { ENV } from "../constants";

type ElementIdKey = InstanceType<typeof LinearElementEditor>["elementId"];
type ElementKey = ExcalidrawElement | ElementIdKey;

type SceneStateCallback = () => void;
type SceneStateCallbackRemover = () => void;

type SelectionHash = string & { __brand: "selectionHash" };

const getNonDeletedElements = <T extends ExcalidrawElement>(
  allElements: readonly T[],
) => {
  const elementsMap = new Map() as NonDeletedSceneElementsMap;
  const elements: T[] = [];
  for (const element of allElements) {
    if (!element.isDeleted) {
      elements.push(element as NonDeleted<T>);
      elementsMap.set(
        element.id,
        element as Ordered<NonDeletedExcalidrawElement>,
      );
    }
  }
  return { elementsMap, elements };
};

const validateIndicesThrottled = throttle(
  (elements: readonly ExcalidrawElement[]) => {
    if (
      import.meta.env.DEV ||
      import.meta.env.MODE === ENV.TEST ||
      window?.DEBUG_FRACTIONAL_INDICES
    ) {
      validateFractionalIndices(elements, {
        // throw only in dev & test, to remain functional on `DEBUG_FRACTIONAL_INDICES`
        shouldThrow: import.meta.env.DEV || import.meta.env.MODE === ENV.TEST,
        includeBoundTextValidation: true,
      });
    }
  },
  1000 * 60,
  { leading: true, trailing: false },
);

const hashSelectionOpts = (
  opts: Parameters<InstanceType<typeof Scene>["getSelectedElements"]>[0],
) => {
  const keys = ["includeBoundTextElement", "includeElementsInFrames"] as const;

  type HashableKeys = Omit<typeof opts, "selectedElementIds" | "elements">;

  // just to ensure we're hashing all expected keys
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type _ = Assert<
    SameType<
      Required<HashableKeys>,
      Pick<Required<HashableKeys>, typeof keys[number]>
    >
  >;

  let hash = "";
  for (const key of keys) {
    hash += `${key}:${opts[key] ? "1" : "0"}`;
  }
  return hash as SelectionHash;
};

// ideally this would be a branded type but it'd be insanely hard to work with
// in our codebase
export type ExcalidrawElementsIncludingDeleted = readonly ExcalidrawElement[];

const isIdKey = (elementKey: ElementKey): elementKey is ElementIdKey => {
  if (typeof elementKey === "string") {
    return true;
  }
  return false;
};

class Scene {
  // ---------------------------------------------------------------------------
  // static methods/props
  // ---------------------------------------------------------------------------

  /**
   * 静态属性：元素到场景的映射（弱引用）。
   */
  private static sceneMapByElement = new WeakMap<ExcalidrawElement, Scene>();
  /**
   * 静态属性：元素ID到场景的映射。
   */
  private static sceneMapById = new Map<string, Scene>();

  /**
   * 将元素或元素ID映射到场景。
   * @param elementKey 元素或元素ID
   * @param scene 场景实例
   */
  static mapElementToScene(elementKey: ElementKey, scene: Scene) {
    if (isIdKey(elementKey)) {
      // for cases where we don't have access to the element object
      // (e.g. restore serialized appState with id references)
      this.sceneMapById.set(elementKey, scene);
    } else {
      this.sceneMapByElement.set(elementKey, scene);
      // if mapping element objects, also cache the id string when later
      // looking up by id alone
      this.sceneMapById.set(elementKey.id, scene);
    }
  }

  /**
   * @deprecated 传递 app.scene 并直接使用
   * 根据元素或元素ID获取场景。
   * @param elementKey 元素或元素ID
   * @returns 场景实例或 null
   */
  static getScene(elementKey: ElementKey): Scene | null {
    if (isIdKey(elementKey)) {
      return this.sceneMapById.get(elementKey) || null;
    }
    return this.sceneMapByElement.get(elementKey) || null;
  }

  // ---------------------------------------------------------------------------
  // instance methods/props
  // ---------------------------------------------------------------------------

  /**
   * 监听场景更新的回调集合。
   */
  private callbacks: Set<SceneStateCallback> = new Set();

  /**
   * 未删除的元素数组。
   */
  private nonDeletedElements: readonly Ordered<NonDeletedExcalidrawElement>[] =
    [];
  /**
   * 未删除的元素 Map。
   */
  private nonDeletedElementsMap = toBrandedType<NonDeletedSceneElementsMap>(
    new Map(),
  );
  /**
   * 所有元素数组。
   */
  private elements: readonly OrderedExcalidrawElement[] = [];
  /**
   * 未删除的帧元素数组。
   */
  private nonDeletedFramesLikes: readonly NonDeleted<ExcalidrawFrameLikeElement>[] =
    [];
  /**
   * 所有帧元素数组。
   */
  private frames: readonly ExcalidrawFrameLikeElement[] = [];
  /**
   * 所有元素 Map。
   */
  private elementsMap = toBrandedType<SceneElementsMap>(new Map());
  /**
   * 选中元素的缓存。
   */
  private selectedElementsCache: {
    selectedElementIds: AppState["selectedElementIds"] | null;
    elements: readonly NonDeletedExcalidrawElement[] | null;
    cache: Map<SelectionHash, NonDeletedExcalidrawElement[]>;
  } = {
    selectedElementIds: null,
    elements: null,
    cache: new Map(),
  };
  /**
   * 随机整数，每次场景更新时重新生成。
   * 当前仅用于渲染器缓存失效。
   */
  private sceneNonce: number | undefined;

  /**
   * 获取当前场景的随机数 nonce。
   * @returns 随机整数
   */
  getSceneNonce() {
    return this.sceneNonce;
  }

  /**
   * 获取未删除元素的 Map。
   * @returns 未删除元素的 Map
   */
  getNonDeletedElementsMap() {
    return this.nonDeletedElementsMap;
  }

  /**
   * 获取包含已删除元素的所有元素数组。
   * @returns 所有元素数组
   */
  getElementsIncludingDeleted() {
    return this.elements;
  }

  /**
   * 获取包含已删除元素的所有元素 Map。
   * @returns 所有元素 Map
   */
  getElementsMapIncludingDeleted() {
    return this.elementsMap;
  }

  /**
   * 获取未删除的所有元素数组。
   * @returns 未删除元素数组
   */
  getNonDeletedElements() {
    return this.nonDeletedElements;
  }

  /**
   * 获取包含已删除帧的所有帧数组。
   * @returns 所有帧数组
   */
  getFramesIncludingDeleted() {
    return this.frames;
  }

  /**
   * 获取选中的元素。
   * @param opts 选项
   * @returns 选中的未删除元素数组
   */
  getSelectedElements(opts: {
    selectedElementIds: AppState["selectedElementIds"];
    /**
     * for specific cases where you need to use elements not from current
     * scene state. This in effect will likely result in cache-miss, and
     * the cache won't be updated in this case.
     */
    elements?: ElementsMapOrArray;
    // selection-related options
    includeBoundTextElement?: boolean;
    includeElementsInFrames?: boolean;
  }): NonDeleted<ExcalidrawElement>[] {
    const hash = hashSelectionOpts(opts);

    const elements = opts?.elements || this.nonDeletedElements;
    if (
      this.selectedElementsCache.elements === elements &&
      this.selectedElementsCache.selectedElementIds === opts.selectedElementIds
    ) {
      const cached = this.selectedElementsCache.cache.get(hash);
      if (cached) {
        return cached;
      }
    } else if (opts?.elements == null) {
      // if we're operating on latest scene elements and the cache is not
      //  storing the latest elements, clear the cache
      this.selectedElementsCache.cache.clear();
    }

    const selectedElements = getSelectedElements(
      elements,
      { selectedElementIds: opts.selectedElementIds },
      opts,
    );

    // cache only if we're not using custom elements
    if (opts?.elements == null) {
      this.selectedElementsCache.selectedElementIds = opts.selectedElementIds;
      this.selectedElementsCache.elements = this.nonDeletedElements;
      this.selectedElementsCache.cache.set(hash, selectedElements);
    }

    return selectedElements;
  }

  /**
   * 获取未删除的帧元素数组。
   * @returns 未删除帧元素数组
   */
  getNonDeletedFramesLikes(): readonly NonDeleted<ExcalidrawFrameLikeElement>[] {
    return this.nonDeletedFramesLikes;
  }

  /**
   * 根据元素ID获取元素。
   * @param id 元素ID
   * @returns 元素或 null
   */
  getElement<T extends ExcalidrawElement>(id: T["id"]): T | null {
    return (this.elementsMap.get(id) as T | undefined) || null;
  }

  /**
   * 根据元素ID获取未删除的元素。
   * @param id 元素ID
   * @returns 未删除元素或 null
   */
  getNonDeletedElement(
    id: ExcalidrawElement["id"],
  ): NonDeleted<ExcalidrawElement> | null {
    const element = this.getElement(id);
    if (element && isNonDeletedElement(element)) {
      return element;
    }
    return null;
  }

  /**
   * 用于批量更新场景所有元素的工具方法。
   * @param iteratee 映射函数
   * @returns 是否有元素被更改
   */
  mapElements(
    iteratee: (element: ExcalidrawElement) => ExcalidrawElement,
  ): boolean {
    let didChange = false;
    const newElements = this.elements.map((element) => {
      const nextElement = iteratee(element);
      if (nextElement !== element) {
        didChange = true;
      }
      return nextElement;
    });
    if (didChange) {
      this.replaceAllElements(newElements);
    }
    return didChange;
  }

  /**
   * 替换场景中的所有元素。
   * @param nextElements 新的元素数组或 Map
   */
  replaceAllElements(nextElements: ElementsMapOrArray) {
    const _nextElements =
      // ts doesn't like `Array.isArray` of `instanceof Map`
      nextElements instanceof Array
        ? nextElements
        : Array.from(nextElements.values());
    const nextFrameLikes: ExcalidrawFrameLikeElement[] = [];

    validateIndicesThrottled(_nextElements);

    this.elements = syncInvalidIndices(_nextElements);
    this.elementsMap.clear();
    this.elements.forEach((element) => {
      if (isFrameLikeElement(element)) {
        nextFrameLikes.push(element);
      }
      this.elementsMap.set(element.id, element);
      Scene.mapElementToScene(element, this);
    });
    const nonDeletedElements = getNonDeletedElements(this.elements);
    this.nonDeletedElements = nonDeletedElements.elements;
    this.nonDeletedElementsMap = nonDeletedElements.elementsMap;

    this.frames = nextFrameLikes;
    this.nonDeletedFramesLikes = getNonDeletedElements(this.frames).elements;

    this.triggerUpdate();
  }

  /**
   * 触发场景更新。
   */
  triggerUpdate() {
    this.sceneNonce = randomInteger();

    for (const callback of Array.from(this.callbacks)) {
      callback();
    }
  }

  /**
   * 注册场景更新回调。
   * @param cb 回调函数
   * @returns 移除回调的函数
   */
  onUpdate(cb: SceneStateCallback): SceneStateCallbackRemover {
    if (this.callbacks.has(cb)) {
      throw new Error();
    }

    this.callbacks.add(cb);

    return () => {
      if (!this.callbacks.has(cb)) {
        throw new Error();
      }
      this.callbacks.delete(cb);
    };
  }

  /**
   * 销毁场景，清理所有数据。
   */
  destroy() {
    this.elements = [];
    this.nonDeletedElements = [];
    this.nonDeletedFramesLikes = [];
    this.frames = [];
    this.elementsMap.clear();
    this.selectedElementsCache.selectedElementIds = null;
    this.selectedElementsCache.elements = null;
    this.selectedElementsCache.cache.clear();

    Scene.sceneMapById.forEach((scene, elementKey) => {
      if (scene === this) {
        Scene.sceneMapById.delete(elementKey);
      }
    });

    // done not for memory leaks, but to guard against possible late fires
    // (I guess?)
    this.callbacks.clear();
  }

  /**
   * 在指定索引插入元素。
   * @param element 元素
   * @param index 索引
   */
  insertElementAtIndex(element: ExcalidrawElement, index: number) {
    if (!Number.isFinite(index) || index < 0) {
      throw new Error(
        "insertElementAtIndex can only be called with index >= 0",
      );
    }

    const nextElements = [
      ...this.elements.slice(0, index),
      element,
      ...this.elements.slice(index),
    ];

    syncMovedIndices(nextElements, arrayToMap([element]));

    this.replaceAllElements(nextElements);
  }

  /**
   * 在指定索引插入多个元素。
   * @param elements 元素数组
   * @param index 索引
   */
  insertElementsAtIndex(elements: ExcalidrawElement[], index: number) {
    if (!Number.isFinite(index) || index < 0) {
      throw new Error(
        "insertElementAtIndex can only be called with index >= 0",
      );
    }

    const nextElements = [
      ...this.elements.slice(0, index),
      ...elements,
      ...this.elements.slice(index),
    ];

    syncMovedIndices(nextElements, arrayToMap(elements));

    this.replaceAllElements(nextElements);
  }

  /**
   * 插入单个元素。
   * @param element 元素
   */
  insertElement = (element: ExcalidrawElement) => {
    const index = element.frameId
      ? this.getElementIndex(element.frameId)
      : this.elements.length;

    this.insertElementAtIndex(element, index);
  };

  /**
   * 插入多个元素。
   * @param elements 元素数组
   */
  insertElements = (elements: ExcalidrawElement[]) => {
    const index = elements[0].frameId
      ? this.getElementIndex(elements[0].frameId)
      : this.elements.length;

    this.insertElementsAtIndex(elements, index);
  };

  /**
   * 获取指定ID元素在数组中的索引。
   * @param elementId 元素ID
   * @returns 索引
   */
  getElementIndex(elementId: string) {
    return this.elements.findIndex((element) => element.id === elementId);
  }

  /**
   * 获取元素的容器元素。
   * @param element 元素
   * @returns 容器元素或 null
   */
  getContainerElement = (
    element:
      | (ExcalidrawElement & {
          containerId: ExcalidrawElement["id"] | null;
        })
      | null,
  ) => {
    if (!element) {
      return null;
    }
    if (element.containerId) {
      return this.getElement(element.containerId) || null;
    }
    return null;
  };
}

export default Scene;
