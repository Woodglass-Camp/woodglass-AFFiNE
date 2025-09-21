import { Menu, MenuItem, MenuTrigger } from '@affine/component';
import {
  SettingHeader,
  SettingRow,
} from '@affine/component/setting-components';
import { EditorSettingService } from '@affine/core/modules/editor-setting';
import { useLiveData, useService } from '@toeverything/infra';

import { menuTrigger } from '../editor/style.css';

export const WoodglassSettings = () => {
  const editorSetting = useService(EditorSettingService).editorSetting;
  const panActivation = useLiveData(
    editorSetting.settings$
  ).edgelessPanActivation;

  return (
    <>
      <SettingHeader
        title={'Woodglass 功能'}
        subtitle={'自定义 AFFiNE 行为的实验性选项'}
      />

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
    </>
  );
};
