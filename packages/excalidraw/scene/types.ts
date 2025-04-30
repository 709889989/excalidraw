import type { RoughCanvas } from "roughjs/bin/canvas";
import type { Drawable } from "roughjs/bin/core";
import type {
  ExcalidrawElement,
  NonDeletedElementsMap,
  NonDeletedExcalidrawElement,
  NonDeletedSceneElementsMap,
} from "../element/types";
import type {
  AppClassProperties,
  AppState,
  EmbedsValidationStatus,
  ElementsPendingErasure,
  InteractiveCanvasAppState,
  StaticCanvasAppState,
  SocketId,
  UserIdleState,
  Device,
} from "../types";
import type { MakeBrand } from "../utility-types";

// 可渲染元素的映射类型
export type RenderableElementsMap = NonDeletedElementsMap &
  MakeBrand<"RenderableElementsMap">;

// 静态画布渲染配置
export type StaticCanvasRenderConfig = {
  canvasBackgroundColor: AppState["viewBackgroundColor"];
  // 传递给渲染器的额外选项
  // ---------------------------------------------------------------------------
  imageCache: AppClassProperties["imageCache"];
  renderGrid: boolean;
  /** 导出时行为略有不同（例如不能使用 CSS 滤镜），并且为获得最佳输出禁用渲染优化 */
  isExporting: boolean;
  embedsValidationStatus: EmbedsValidationStatus;
  elementsPendingErasure: ElementsPendingErasure;
};

// SVG 渲染配置
export type SVGRenderConfig = {
  offsetX: number;
  offsetY: number;
  isExporting: boolean;
  exportWithDarkMode: boolean;
  renderEmbeddables: boolean;
  frameRendering: AppState["frameRendering"];
  canvasBackgroundColor: AppState["viewBackgroundColor"];
  embedsValidationStatus: EmbedsValidationStatus;
};

// 交互式画布渲染配置
export type InteractiveCanvasRenderConfig = {
  // 协作相关状态
  // ---------------------------------------------------------------------------
  remoteSelectedElementIds: Map<ExcalidrawElement["id"], SocketId[]>;
  remotePointerViewportCoords: Map<SocketId, { x: number; y: number }>;
  remotePointerUserStates: Map<SocketId, UserIdleState>;
  remotePointerUsernames: Map<SocketId, string>;
  remotePointerButton: Map<SocketId, string | undefined>;
  selectionColor: string;
  // 传递给渲染器的额外选项
  // ---------------------------------------------------------------------------
  renderScrollbars?: boolean;
};

// 渲染交互场景的回调数据
export type RenderInteractiveSceneCallback = {
  atLeastOneVisibleElement: boolean;
  elementsMap: RenderableElementsMap;
  scrollBars?: ScrollBars;
};

// 静态场景渲染配置
export type StaticSceneRenderConfig = {
  canvas: HTMLCanvasElement;
  rc: RoughCanvas;
  elementsMap: RenderableElementsMap;
  allElementsMap: NonDeletedSceneElementsMap;
  visibleElements: readonly NonDeletedExcalidrawElement[];
  scale: number;
  appState: StaticCanvasAppState;
  renderConfig: StaticCanvasRenderConfig;
};

// 交互场景渲染配置
export type InteractiveSceneRenderConfig = {
  canvas: HTMLCanvasElement | null;
  elementsMap: RenderableElementsMap;
  visibleElements: readonly NonDeletedExcalidrawElement[];
  selectedElements: readonly NonDeletedExcalidrawElement[];
  allElementsMap: NonDeletedSceneElementsMap;
  scale: number;
  appState: InteractiveCanvasAppState;
  renderConfig: InteractiveCanvasRenderConfig;
  device: Device;
  callback: (data: RenderInteractiveSceneCallback) => void;
};

// 场景滚动信息
export type SceneScroll = {
  scrollX: number;
  scrollY: number;
};

// 导出类型
export type ExportType =
  | "png"
  | "clipboard"
  | "clipboard-svg"
  | "backend"
  | "svg";

// 滚动条信息
export type ScrollBars = {
  horizontal: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  vertical: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
};

// 元素形状类型
export type ElementShape = Drawable | Drawable[] | null;

// 元素形状集合类型
export type ElementShapes = {
  rectangle: Drawable;
  ellipse: Drawable;
  diamond: Drawable;
  iframe: Drawable;
  embeddable: Drawable;
  freedraw: Drawable | null;
  arrow: Drawable[];
  line: Drawable[];
  text: null;
  image: null;
  frame: null;
  magicframe: null;
};
