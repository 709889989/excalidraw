import type { Point } from "../types";
import type {
  FONT_FAMILY,
  ROUNDNESS,
  TEXT_ALIGN,
  THEME,
  VERTICAL_ALIGN,
} from "../constants";
import type {
  MakeBrand,
  MarkNonNullable,
  Merge,
  ValueOf,
} from "../utility-types";
import type { MagicCacheData } from "../data/magic";

export type ChartType = "bar" | "line"; // 图表类型：柱状图或折线图
export type FillStyle = "hachure" | "cross-hatch" | "solid" | "zigzag"; // 填充样式的选项包括：阴影线、交叉阴影线、实心填充和锯齿线
export type FontFamilyKeys = keyof typeof FONT_FAMILY; // 字体家族 key
export type FontFamilyValues = typeof FONT_FAMILY[FontFamilyKeys]; // 字体家族 value
export type Theme = typeof THEME[keyof typeof THEME]; // 主题类型
export type FontString = string & { _brand: "fontString" }; // 字体字符串类型
export type GroupId = string; // 分组ID
export type PointerType = "mouse" | "pen" | "touch"; // 指针类型
export type StrokeRoundness = "round" | "sharp"; // 线条圆角类型
export type RoundnessType = ValueOf<typeof ROUNDNESS>; // 圆角类型
export type StrokeStyle = "solid" | "dashed" | "dotted"; // 线条样式
export type TextAlign = typeof TEXT_ALIGN[keyof typeof TEXT_ALIGN]; // 文本对齐方式

type VerticalAlignKeys = keyof typeof VERTICAL_ALIGN;
export type VerticalAlign = typeof VERTICAL_ALIGN[VerticalAlignKeys]; // 垂直对齐方式
export type FractionalIndex = string & { _brand: "franctionalIndex" }; // 分数索引类型

export type BoundElement = Readonly<{
  id: ExcalidrawLinearElement["id"]; // 绑定元素ID
  type: "arrow" | "text"; // 绑定类型
}>;

// 元素基础类型，所有绘图元素的基础属性
type _ExcalidrawElementBase = Readonly<{
  id: string;
  x: number;
  y: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: FillStyle;
  strokeWidth: number;
  strokeStyle: StrokeStyle;
  roundness: null | { type: RoundnessType; value?: number };
  roughness: number;
  opacity: number;
  width: number;
  height: number;
  angle: number;
  /** Random integer used to seed shape generation so that the roughjs shape
      doesn't differ across renders. */
  seed: number;
  /** Integer that is sequentially incremented on each change. Used to reconcile
      elements during collaboration or when saving to server. */
  version: number;
  /** Random integer that is regenerated on each change.
      Used for deterministic reconciliation of updates during collaboration,
      in case the versions (see above) are identical. */
  versionNonce: number;
  /** String in a fractional form defined by https://github.com/rocicorp/fractional-indexing.
      Used for ordering in multiplayer scenarios, such as during reconciliation or undo / redo.
      Always kept in sync with the array order by `syncMovedIndices` and `syncInvalidIndices`.
      Could be null, i.e. for new elements which were not yet assigned to the scene. */
  index: FractionalIndex | null;
  isDeleted: boolean;
  /** List of groups the element belongs to.
      Ordered from deepest to shallowest. */
  groupIds: readonly GroupId[];
  frameId: string | null;
  /** other elements that are bound to this element */
  boundElements: readonly BoundElement[] | null;
  /** epoch (ms) timestamp of last element update */
  updated: number;
  link: string | null;
  locked: boolean;
  customData?: Record<string, any>;
}>;

export type ExcalidrawSelectionElement = _ExcalidrawElementBase & {
  type: "selection"; // 选择元素
};

export type ExcalidrawRectangleElement = _ExcalidrawElementBase & {
  type: "rectangle"; // 矩形元素
};

export type ExcalidrawDiamondElement = _ExcalidrawElementBase & {
  type: "diamond"; // 菱形元素
};

export type ExcalidrawEllipseElement = _ExcalidrawElementBase & {
  type: "ellipse"; // 椭圆元素
};

export type ExcalidrawEmbeddableElement = _ExcalidrawElementBase &
  Readonly<{
    type: "embeddable"; // 可嵌入元素
  }>;

export type ExcalidrawIframeElement = _ExcalidrawElementBase &
  Readonly<{
    type: "iframe"; // iframe 元素
    // TODO move later to AI-specific frame
    customData?: { generationData?: MagicCacheData };
  }>;

export type ExcalidrawIframeLikeElement =
  | ExcalidrawIframeElement
  | ExcalidrawEmbeddableElement; // iframe 类元素

export type IframeData =
  | {
      intrinsicSize: { w: number; h: number }; // 内在尺寸
      error?: Error;
      sandbox?: { allowSameOrigin?: boolean };
    } & (
      | { type: "video" | "generic"; link: string }
      | { type: "document"; srcdoc: (theme: Theme) => string }
    );

export type ExcalidrawImageElement = _ExcalidrawElementBase &
  Readonly<{
    type: "image"; // 图片元素
    fileId: FileId | null; // 文件ID
    /** whether respective file is persisted */
    status: "pending" | "saved" | "error"; // 文件状态
    /** X and Y scale factors <-1, 1>, used for image axis flipping */
    scale: [number, number]; // 缩放比例
  }>;

export type InitializedExcalidrawImageElement = MarkNonNullable<
  ExcalidrawImageElement,
  "fileId"
>; // 已初始化图片元素

export type ExcalidrawFrameElement = _ExcalidrawElementBase & {
  type: "frame"; // 框架元素
  name: string | null; // 名称
};

export type ExcalidrawMagicFrameElement = _ExcalidrawElementBase & {
  type: "magicframe"; // 魔法框架元素
  name: string | null;
};

export type ExcalidrawFrameLikeElement =
  | ExcalidrawFrameElement
  | ExcalidrawMagicFrameElement; // 框架类元素

/**
 * These are elements that don't have any additional properties.
 */
export type ExcalidrawGenericElement =
  | ExcalidrawSelectionElement
  | ExcalidrawRectangleElement
  | ExcalidrawDiamondElement
  | ExcalidrawEllipseElement; // 通用元素类型

/**
 * ExcalidrawElement should be JSON serializable and (eventually) contain
 * no computed data. The list of all ExcalidrawElements should be shareable
 * between peers and contain no state local to the peer.
 */
export type ExcalidrawElement =
  | ExcalidrawGenericElement
  | ExcalidrawTextElement
  | ExcalidrawLinearElement
  | ExcalidrawFreeDrawElement
  | ExcalidrawImageElement
  | ExcalidrawFrameElement
  | ExcalidrawMagicFrameElement
  | ExcalidrawIframeElement
  | ExcalidrawEmbeddableElement; // 所有绘图元素类型

export type Ordered<TElement extends ExcalidrawElement> = TElement & {
  index: FractionalIndex; // 有序元素，带分数索引
};

export type OrderedExcalidrawElement = Ordered<ExcalidrawElement>; // 有序绘图元素

export type NonDeleted<TElement extends ExcalidrawElement> = TElement & {
  isDeleted: boolean; // 非删除元素
};

export type NonDeletedExcalidrawElement = NonDeleted<ExcalidrawElement>; // 非删除绘图元素

export type ExcalidrawTextElement = _ExcalidrawElementBase &
  Readonly<{
    type: "text"; // 文本元素
    fontSize: number; // 字号
    fontFamily: FontFamilyValues; // 字体
    text: string; // 文本内容
    textAlign: TextAlign; // 对齐方式
    verticalAlign: VerticalAlign; // 垂直对齐
    containerId: ExcalidrawGenericElement["id"] | null; // 容器ID
    originalText: string; // 原始文本
    /**
     * If `true` the width will fit the text. If `false`, the text will
     * wrap to fit the width.
     *
     * @default true
     */
    autoResize: boolean; // 是否自动调整宽度
    /**
     * Unitless line height (aligned to W3C). To get line height in px, multiply
     *  with font size (using `getLineHeightInPx` helper).
     */
    lineHeight: number & { _brand: "unitlessLineHeight" }; // 行高
  }>;

export type ExcalidrawBindableElement =
  | ExcalidrawRectangleElement
  | ExcalidrawDiamondElement
  | ExcalidrawEllipseElement
  | ExcalidrawTextElement
  | ExcalidrawImageElement
  | ExcalidrawIframeElement
  | ExcalidrawEmbeddableElement
  | ExcalidrawFrameElement
  | ExcalidrawMagicFrameElement; // 可绑定元素类型

export type ExcalidrawTextContainer =
  | ExcalidrawRectangleElement
  | ExcalidrawDiamondElement
  | ExcalidrawEllipseElement
  | ExcalidrawArrowElement; // 文本容器类型

export type ExcalidrawTextElementWithContainer = {
  containerId: ExcalidrawTextContainer["id"];
} & ExcalidrawTextElement; // 带容器的文本元素

export type FixedPoint = [number, number]; // 固定点坐标

export type PointBinding = {
  elementId: ExcalidrawBindableElement["id"]; // 绑定元素ID
  focus: number; // 焦点
  gap: number; // 间隙
  // Represents the fixed point binding information in form of a vertical and
  // horizontal ratio (i.e. a percentage value in the 0.0-1.0 range). This ratio
  // gives the user selected fixed point by multiplying the bound element width
  // with fixedPoint[0] and the bound element height with fixedPoint[1] to get the
  // bound element-local point coordinate.
  fixedPoint: FixedPoint | null; // 固定点信息
};

export type FixedPointBinding = Merge<PointBinding, { fixedPoint: FixedPoint }>; // 固定点绑定

export type Arrowhead =
  | "arrow"
  | "bar"
  | "dot" // legacy. Do not use for new elements.
  | "circle"
  | "circle_outline"
  | "triangle"
  | "triangle_outline"
  | "diamond"
  | "diamond_outline"; // 箭头类型

export type ExcalidrawLinearElement = _ExcalidrawElementBase &
  Readonly<{
    type: "line" | "arrow"; // 线条或箭头元素
    points: readonly Point[]; // 点集
    lastCommittedPoint: Point | null; // 最后提交点
    startBinding: PointBinding | null; // 起点绑定
    endBinding: PointBinding | null; // 终点绑定
    startArrowhead: Arrowhead | null; // 起点箭头
    endArrowhead: Arrowhead | null; // 终点箭头
  }>;

export type ExcalidrawArrowElement = ExcalidrawLinearElement &
  Readonly<{
    type: "arrow"; // 箭头元素
    elbowed: boolean; // 是否折线
  }>;

export type ExcalidrawElbowArrowElement = Merge<
  ExcalidrawArrowElement,
  {
    elbowed: true; // 折线箭头
    startBinding: FixedPointBinding | null;
    endBinding: FixedPointBinding | null;
  }
>; // 折线箭头元素

export type ExcalidrawFreeDrawElement = _ExcalidrawElementBase &
  Readonly<{
    type: "freedraw"; // 自由绘制元素
    points: readonly Point[]; // 点集
    pressures: readonly number[]; // 压力值
    simulatePressure: boolean; // 是否模拟压力
    lastCommittedPoint: Point | null; // 最后提交点
  }>;

export type FileId = string & { _brand: "FileId" }; // 文件ID类型

export type ExcalidrawElementType = ExcalidrawElement["type"]; // 元素类型

/**
 * Map of excalidraw elements.
 * Unspecified whether deleted or non-deleted.
 * Can be a subset of Scene elements.
 */
export type ElementsMap = Map<ExcalidrawElement["id"], ExcalidrawElement>; // 元素映射表

/**
 * Map of non-deleted elements.
 * Can be a subset of Scene elements.
 */
export type NonDeletedElementsMap = Map<
  ExcalidrawElement["id"],
  NonDeletedExcalidrawElement
> &
  MakeBrand<"NonDeletedElementsMap">; // 非删除元素映射表

/**
 * Map of all excalidraw Scene elements, including deleted.
 * Not a subset. Use this type when you need access to current Scene elements.
 */
export type SceneElementsMap = Map<
  ExcalidrawElement["id"],
  Ordered<ExcalidrawElement>
> &
  MakeBrand<"SceneElementsMap">; // 场景元素映射表

/**
 * Map of all non-deleted Scene elements.
 * Not a subset. Use this type when you need access to current Scene elements.
 */
export type NonDeletedSceneElementsMap = Map<
  ExcalidrawElement["id"],
  Ordered<NonDeletedExcalidrawElement>
> &
  MakeBrand<"NonDeletedSceneElementsMap">; // 非删除场景元素映射表

export type ElementsMapOrArray =
  | readonly ExcalidrawElement[]
  | Readonly<ElementsMap>; // 元素数组或映射表
