import {
  Button,
  Menu,
  MenuItem,
  MenuTrigger,
  Slider,
  Switch,
} from '@affine/component';
import {
  SettingHeader,
  SettingRow,
} from '@affine/component/setting-components';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { useLiveData, useService } from '@toeverything/infra';
import { useEffect, useMemo, useState } from 'react';

import { menuTrigger } from '../editor/style.css';

export const WoodglassSettings = () => {
  const editorSetting = useService(EditorSettingService).editorSetting;
  const panActivation = useLiveData(
    editorSetting.settings$
  ).edgelessPanActivation;
  const tabletPencilMode = useLiveData(
    editorSetting.settings$
  ).edgelessTabletPencilMode;
  const pinchSmoothAlpha =
    useLiveData(editorSetting.settings$).edgelessPinchSmoothAlpha ?? 0.25;

  // Web Fullscreen state + handlers
  const initialFullscreen = useMemo(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
    []
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(initialFullscreen);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen?.({
        navigationUI: 'hide',
      } as any);
    } catch {
      // ignore
    }
  };
  const exitFullscreen = async () => {
    try {
      await document.exitFullscreen?.();
    } catch {
      // ignore
    }
  };

  const handleEnterFullscreen = () => {
    enterFullscreen().catch(() => {});
  };

  const handleExitFullscreen = () => {
    exitFullscreen().catch(() => {});
  };

  return (
    <>
      <SettingHeader
        title={'Woodglass 功能'}
        subtitle={'自定义 AFFiNE 行为的实验性选项'}
      />

      <SettingRow
        name={'平板 Pencil 模式'}
        desc={'开启后：手指仅用于平移、禁止选中；手写笔仅用于画笔绘制'}
      >
        <Switch
          checked={tabletPencilMode}
          onChange={(checked: boolean) =>
            editorSetting.set('edgelessTabletPencilMode', checked)
          }
        ></Switch>
      </SettingRow>

      <SettingRow name={'画布平移按键'} desc={'选择无界画布临时平移的按键'}>
        <Menu
          items={[
            <MenuItem
              key="middle"
              selected={panActivation === 'middle'}
              onSelect={() =>
                editorSetting.set('edgelessPanActivation', 'middle')
              }
            >
              鼠标中键
            </MenuItem>,
            <MenuItem
              key="right"
              selected={panActivation === 'right'}
              onSelect={() =>
                editorSetting.set('edgelessPanActivation', 'right')
              }
            >
              鼠标右键
            </MenuItem>,
          ]}
          contentOptions={{
            align: 'end',
            sideOffset: 16,
            style: { width: '280px' },
          }}
        >
          <MenuTrigger
            className={menuTrigger}
            tooltip={panActivation === 'right' ? '鼠标右键' : '鼠标中键'}
          >
            {panActivation === 'right' ? '鼠标右键' : '鼠标中键'}
          </MenuTrigger>
        </Menu>
      </SettingRow>

      <SettingRow
        name={'双指缩放平滑'}
        desc={`降低缩放抖动（0 关闭） 当前：${pinchSmoothAlpha.toFixed(2)}`}
      >
        <Slider
          value={[pinchSmoothAlpha]}
          onValueChange={(v: number[]) =>
            editorSetting.set(
              'edgelessPinchSmoothAlpha',
              Number((v?.[0] ?? 0).toFixed(2))
            )
          }
          min={0}
          max={1}
          step={0.05}
          width={280}
          nodes={[0, 0.25, 0.5, 0.75, 1]}
        />
      </SettingRow>

      <SettingRow
        name={'网页全屏'}
        desc={'使用浏览器全屏显示 AFFiNE（需要用户点击触发）'}
      >
        {isFullscreen ? (
          <Button onClick={handleExitFullscreen}>退出全屏</Button>
        ) : (
          <Button variant="primary" onClick={handleEnterFullscreen}>
            进入全屏
          </Button>
        )}
      </SettingRow>
    </>
  );
};
