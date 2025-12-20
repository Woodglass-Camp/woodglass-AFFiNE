import { unsafeCSSVarV2 } from '@blocksuite/affine-shared/theme';
import { css } from 'lit';

export const styles = css`
  :host {
    display: block;
    touch-action: none;
  }

  :host([disabled]) {
    opacity: 0.5;
    pointer-events: none;
  }

  .slider-container {
    --track-start: max(
      calc(var(--item-size) / 2),
      calc(var(--drag-handle-size) / 2)
    );
    --track-length: max(calc(var(--width) - 2 * var(--track-start)), 0px);
    --drag-handle-left: calc(
      var(--track-start) - var(--drag-handle-size) / 2 +
        var(--cursor-ratio, 0) * var(--track-length)
    );

    width: var(--width);
    height: 24px;
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    position: relative;
    cursor: default;
  }

  .point-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--item-size);
    height: var(--item-size);
    z-index: 2;
  }

  :host([data-continuous]) .point-button {
    display: none;
  }

  .point-circle {
    width: var(--item-icon-size);
    height: var(--item-icon-size);
    background-color: ${unsafeCSSVarV2('layer/insideBorder/border')};
    border-radius: 50%;
  }

  .point-button[data-selected] .point-circle {
    background-color: ${unsafeCSSVarV2('icon/primary')};
  }

  .drag-handle {
    position: absolute;
    width: var(--drag-handle-size);
    height: var(--drag-handle-size);
    border-radius: 50%;
    background-color: ${unsafeCSSVarV2('icon/primary')};
    z-index: 3;
    left: var(--drag-handle-left);
  }

  .bottom-line,
  .slider-selected-overlay {
    position: absolute;
    height: 1px;
    left: var(--track-start);
  }

  .bottom-line {
    width: var(--track-length);
    background-color: ${unsafeCSSVarV2('layer/insideBorder/border')};
  }

  .slider-selected-overlay {
    background-color: ${unsafeCSSVarV2('icon/primary')};
    z-index: 1;
    width: calc(var(--cursor-ratio, 0) * var(--track-length));
  }
`;
