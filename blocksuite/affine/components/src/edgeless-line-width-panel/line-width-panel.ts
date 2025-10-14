import { BRUSH_LINE_WIDTHS, LineWidth } from '@blocksuite/affine-model';
import { WithDisposable } from '@blocksuite/global/lit';
import { css, html, LitElement } from 'lit';
import { property } from 'lit/decorators.js';

import type { SliderSelectEvent } from '../slider';
import type { SliderContinuousRange, SliderStyle } from '../slider/types';

const defaultSliderStyle: Partial<SliderStyle> = {
  width: '120px',
  itemSize: 16,
  itemIconSize: 8,
  dragHandleSize: 14,
};

export class EdgelessLineWidthPanel extends WithDisposable(LitElement) {
  static override styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .value {
      min-width: 56px;
      text-align: right;
      font-size: 12px;
      color: var(--affine-text-secondary-color, #6c6f73);
      user-select: none;
    }
  `;

  private _onSelect(lineWidth: number) {
    this.dispatchEvent(
      new CustomEvent('select', {
        detail: lineWidth,
        bubbles: true,
        composed: true,
        cancelable: true,
      })
    );
  }

  override render() {
    const range = this.continuousRange
      ? {
          min: this.continuousRange.min,
          max: this.continuousRange.max,
          step: this.continuousRange.step,
        }
      : { points: this.lineWidths };

    return html`<affine-slider
        ?disabled=${this.disabled}
        .range=${range}
        .sliderStyle=${this.sliderStyle ?? defaultSliderStyle}
        .value=${this.selectedSize}
        .tooltip=${this.hasTooltip ? 'Thickness' : undefined}
        @select=${(e: SliderSelectEvent) => {
          e.stopPropagation();
          this._onSelect(e.detail.value);
        }}
      ></affine-slider>
      <span class="value">${this.selectedSize.toFixed(1)} px</span>`;
  }

  @property({ attribute: false })
  accessor disabled = false;

  @property({ attribute: false })
  accessor hasTooltip = true;

  @property({ attribute: false })
  accessor lineWidths: number[] = BRUSH_LINE_WIDTHS;

  @property({ attribute: false })
  accessor continuousRange: SliderContinuousRange | undefined = undefined;

  @property({ attribute: false })
  accessor selectedSize: number = LineWidth.Two;

  @property({ attribute: false })
  accessor sliderStyle: Partial<SliderStyle> | undefined = undefined;
}

declare global {
  interface HTMLElementTagNameMap {
    'edgeless-line-width-panel': EdgelessLineWidthPanel;
  }
}
