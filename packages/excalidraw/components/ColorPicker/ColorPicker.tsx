import { isTransparent } from "../../utils";
import type { ExcalidrawElement } from "../../element/types";
import type { AppState } from "../../types";
import { TopPicks } from "./TopPicks";
import { ButtonSeparator } from "../ButtonSeparator";
import { Picker } from "./Picker";
import * as Popover from "@radix-ui/react-popover";
import { useAtom } from "jotai";
import type { ColorPickerType } from "./colorPickerUtils";
import { activeColorPickerSectionAtom } from "./colorPickerUtils";
import { useExcalidrawContainer } from "../App";
import type { ColorTuple, ColorPaletteCustom } from "../../colors";
import { COLOR_PALETTE } from "../../colors";
import PickerHeading from "./PickerHeading";
import { t } from "../../i18n";
import clsx from "clsx";
import { useRef } from "react";
import { jotaiScope } from "../../jotai";
import { ColorInput } from "./ColorInput";
import { activeEyeDropperAtom } from "../EyeDropper";
import { PropertiesPopover } from "../PropertiesPopover";

import "./ColorPicker.scss";

/**
 * 颜色验证函数
 * 验证颜色字符串是否有效
 * @param color - 要验证的颜色字符串
 * @returns 返回布尔值表示颜色是否有效
 */
const isValidColor = (color: string) => {
  const style = new Option().style;
  style.color = color;
  return !!style.color;
};

/**
 * 获取有效的颜色值
 * @param color - 原始颜色字符串
 * @returns 返回处理后的有效颜色值，若无效则返回null
 */
export const getColor = (color: string): string | null => {
  if (isTransparent(color)) {
    return color;
  }

  // testing for `#` first fixes a bug on Electron (more specfically, an
  // Obsidian popout window), where a hex color without `#` is (incorrectly)
  // considered valid
  return isValidColor(`#${color}`)
    ? `#${color}`
    : isValidColor(color)
    ? color
    : null;
};

/**
 * ColorPicker组件的属性接口
 * @param type - 颜色选择器类型
 * @param color - 当前选中的颜色值
 * @param onChange - 颜色改变时的回调函数
 * @param label - 颜色选择器的标签
 * @param elements - 当前选中的元素
 * @param appState - 应用状态
 * @param palette - 自定义颜色调色板
 * @param topPicks - 常用颜色列表
 * @param updateData - 更新数据的回调函数
 */
interface ColorPickerProps {
  type: ColorPickerType;
  color: string;
  onChange: (color: string) => void;
  label: string;
  elements: readonly ExcalidrawElement[];
  appState: AppState;
  palette?: ColorPaletteCustom | null;
  topPicks?: ColorTuple;
  updateData: (formData?: any) => void;
}

/**
 * 弹出框组件
 * @param type - 颜色选择器类型
 * @param color - 当前选中的颜色值
 * @param onChange - 颜色改变时的回调函数
 * @param label - 颜色选择器的标签
 * @param elements - 当前选中的元素
 * @param palette - 颜色调色板
 * @param updateData - 更新数据的回调函数
 */
const ColorPickerPopupContent = ({
  type,
  color,
  onChange,
  label,
  elements,
  palette = COLOR_PALETTE,
  updateData,
}: Pick<
  ColorPickerProps,
  | "type"
  | "color"
  | "onChange"
  | "label"
  | "elements"
  | "palette"
  | "updateData"
>) => {
  const { container } = useExcalidrawContainer();
  const [, setActiveColorPickerSection] = useAtom(activeColorPickerSectionAtom);

  const [eyeDropperState, setEyeDropperState] = useAtom(
    activeEyeDropperAtom,
    jotaiScope,
  );

  const colorInputJSX = (
    <div>
      <PickerHeading>{t("colorPicker.hexCode")}</PickerHeading>
      <ColorInput
        color={color}
        label={label}
        onChange={(color) => {
          onChange(color);
        }}
        colorPickerType={type}
      />
    </div>
  );

  const popoverRef = useRef<HTMLDivElement>(null);

  const focusPickerContent = () => {
    popoverRef.current
      ?.querySelector<HTMLDivElement>(".color-picker-content")
      ?.focus();
  };

  return (
    <PropertiesPopover
      container={container}
      style={{ maxWidth: "208px" }}
      onFocusOutside={(event) => {
        // refocus due to eye dropper
        focusPickerContent();
        event.preventDefault();
      }}
      onPointerDownOutside={(event) => {
        if (eyeDropperState) {
          // prevent from closing if we click outside the popover
          // while eyedropping (e.g. click when clicking the sidebar;
          // the eye-dropper-backdrop is prevented downstream)
          event.preventDefault();
        }
      }}
      onClose={() => {
        updateData({ openPopup: null });
        setActiveColorPickerSection(null);
      }}
    >
      {palette ? (
        <Picker
          palette={palette}
          color={color}
          onChange={(changedColor) => {
            onChange(changedColor);
          }}
          onEyeDropperToggle={(force) => {
            setEyeDropperState((state) => {
              if (force) {
                state = state || {
                  keepOpenOnAlt: true,
                  onSelect: onChange,
                  colorPickerType: type,
                };
                state.keepOpenOnAlt = true;
                return state;
              }

              return force === false || state
                ? null
                : {
                    keepOpenOnAlt: false,
                    onSelect: onChange,
                    colorPickerType: type,
                  };
            });
          }}
          onEscape={(event) => {
            if (eyeDropperState) {
              setEyeDropperState(null);
            } else {
              updateData({ openPopup: null });
            }
          }}
          label={label}
          type={type}
          elements={elements}
          updateData={updateData}
        >
          {colorInputJSX}
        </Picker>
      ) : (
        colorInputJSX
      )}
    </PropertiesPopover>
  );
};

/**
 * 触发器组件
 * @param color - 当前选中的颜色值
 * @param label - 颜色选择器的标签
 * @param type - 颜色选择器类型
 */
const ColorPickerTrigger = ({
  label,
  color,
  type,
}: {
  color: string;
  label: string;
  type: ColorPickerType;
}) => {
  return (
    <Popover.Trigger
      type="button"
      className={clsx("color-picker__button active-color properties-trigger", {
        "is-transparent": color === "transparent" || !color,
      })}
      aria-label={label}
      style={color ? { "--swatch-color": color } : undefined}
      title={
        type === "elementStroke"
          ? t("labels.showStroke")
          : t("labels.showBackground")
      }
    >
      <div className="color-picker__button-outline" />
    </Popover.Trigger>
  );
};
// ColorPicker包组件是Excalidraw中用于颜色选择的核心组件，主要作用包括：
// 1. 颜色选择功能 ：提供颜色选择器界面，允许用户选择或输入颜色值。
// 2. 颜色管理 ：支持预设颜色、最近使用颜色和自定义颜色的管理。
// 3. 集成EyeDropper工具 ：允许用户直接从画布中拾取颜色。
// 4. 颜色格式处理 ：支持处理不同格式的颜色值（如HEX、RGB等）。
// 5. 状态管理 ：与Excalidraw的状态管理集成，实时更新元素颜色。
/**
 * ColorPicker主组件
 * @param type - 颜色选择器类型
 * @param color - 当前选中的颜色值
 * @param onChange - 颜色改变时的回调函数
 * @param label - 颜色选择器的标签
 * @param elements - 当前选中的元素
 * @param palette - 颜色调色板
 * @param topPicks - 常用颜色列表
 * @param updateData - 更新数据的回调函数
 * @param appState - 应用状态
 */
export const ColorPicker = ({
  type,
  color,
  onChange,
  label,
  elements,
  palette = COLOR_PALETTE,
  topPicks,
  updateData,
  appState,
}: ColorPickerProps) => {
  return (
    <div>
      <div role="dialog" aria-modal="true" className="color-picker-container">
        <TopPicks
          activeColor={color}
          onChange={onChange}
          type={type}
          topPicks={topPicks}
        />
        <ButtonSeparator />
        <Popover.Root
          open={appState.openPopup === type}
          onOpenChange={(open) => {
            updateData({ openPopup: open ? type : null });
          }}
        >
          {/* serves as an active color indicator as well */}
          <ColorPickerTrigger color={color} label={label} type={type} />
          {/* popup content */}
          {appState.openPopup === type && (
            <ColorPickerPopupContent
              type={type}
              color={color}
              onChange={onChange}
              label={label}
              elements={elements}
              palette={palette}
              updateData={updateData}
            />
          )}
        </Popover.Root>
      </div>
    </div>
  );
};
