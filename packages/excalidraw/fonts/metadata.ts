import {
  FontFamilyCodeIcon,
  FontFamilyHeadingIcon,
  FontFamilyNormalIcon,
  FreedrawIcon,
} from "../components/icons";
import { FONT_FAMILY } from "../constants";

/**
 * Encapsulates font metrics with additional font metadata.
 * 字体元数据接口，包含字体度量和额外信息
 * */
export interface FontMetadata {
  /** for head & hhea metrics read the woff2 with https://fontdrop.info/ */
  // 字体的单位方框大小
  metrics: {
    /** head.unitsPerEm metric */
    unitsPerEm: 1000 | 1024 | 2048;
    /** hhea.ascender metric */
    // 字体上升线
    ascender: number;
    /** hhea.descender metric */
    // 字体下降线
    descender: number;
    /** harcoded unitless line-height, https://github.com/excalidraw/excalidraw/pull/6360#issuecomment-1477635971 */
    // 行高（无单位）
    lineHeight: number;
  };
  /** element to be displayed as an icon  */
  // 用作字体图标的元素
  icon: JSX.Element;
  /** flag to indicate a deprecated font */
  // 是否为弃用字体
  deprecated?: true;
  /** flag to indicate a server-side only font */
  // 是否为仅服务端字体
  serverSide?: true;
  /** flag to indiccate a local-only font */
  // 是否为本地字体
  local?: true;
}

// 字体元数据映射表，key为字体编号
export const FONT_METADATA: Record<number, FontMetadata> = {
  [FONT_FAMILY.Excalifont]: {
    metrics: {
      unitsPerEm: 1000,
      ascender: 886,
      descender: -374,
      lineHeight: 1.25,
    },
    icon: FreedrawIcon,
  },
  [FONT_FAMILY.Nunito]: {
    metrics: {
      unitsPerEm: 1000,
      ascender: 1011,
      descender: -353,
      lineHeight: 1.35,
    },
    icon: FontFamilyNormalIcon,
  },
  [FONT_FAMILY["Lilita One"]]: {
    metrics: {
      unitsPerEm: 1000,
      ascender: 923,
      descender: -220,
      lineHeight: 1.15,
    },
    icon: FontFamilyHeadingIcon,
  },
  [FONT_FAMILY["Comic Shanns"]]: {
    metrics: {
      unitsPerEm: 1000,
      ascender: 750,
      descender: -250,
      lineHeight: 1.25,
    },
    icon: FontFamilyCodeIcon,
  },
  [FONT_FAMILY.Virgil]: {
    metrics: {
      unitsPerEm: 1000,
      ascender: 886,
      descender: -374,
      lineHeight: 1.25,
    },
    icon: FreedrawIcon,
    deprecated: true,
  },
  [FONT_FAMILY.Helvetica]: {
    metrics: {
      unitsPerEm: 2048,
      ascender: 1577,
      descender: -471,
      lineHeight: 1.15,
    },
    icon: FontFamilyNormalIcon,
    deprecated: true,
    local: true,
  },
  [FONT_FAMILY.Cascadia]: {
    metrics: {
      unitsPerEm: 2048,
      ascender: 1900,
      descender: -480,
      lineHeight: 1.2,
    },
    icon: FontFamilyCodeIcon,
    deprecated: true,
  },
  [FONT_FAMILY["Liberation Sans"]]: {
    metrics: {
      unitsPerEm: 2048,
      ascender: 1854,
      descender: -434,
      lineHeight: 1.15,
    },
    icon: FontFamilyNormalIcon,
    serverSide: true,
  },
};

/** Unicode ranges */
// Unicode 字符范围
export const RANGES = {
  LATIN:
    "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD",
  LATIN_EXT:
    "U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF",
  CYRILIC_EXT:
    "U+0460-052F, U+1C80-1C88, U+20B4, U+2DE0-2DFF, U+A640-A69F, U+FE2E-FE2F",
  CYRILIC: "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116",
  VIETNAMESE:
    "U+0102-0103, U+0110-0111, U+0128-0129, U+0168-0169, U+01A0-01A1, U+01AF-01B0, U+0300-0301, U+0303-0304, U+0308-0309, U+0323, U+0329, U+1EA0-1EF9, U+20AB",
};

/** local protocol to skip the local font from registering or inlining */
// 本地字体协议前缀，跳过本地字体注册或内联
export const LOCAL_FONT_PROTOCOL = "local:";
