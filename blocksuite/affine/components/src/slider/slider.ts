import { on, once } from '@blocksuite/affine-shared/utils';
import { clamp } from '@blocksuite/global/gfx';
import { WithDisposable } from '@blocksuite/global/lit';
import { PropTypes, requiredProperties } from '@blocksuite/std';
import { html, LitElement, nothing, type PropertyValues } from 'lit';
import { property } from 'lit/decorators.js';
import { repeat } from 'lit/directives/repeat.js';

import { styles } from './styles';
import type {
  SliderContinuousRange,
  SliderRange,
  SliderSelectEvent,
  SliderStyle,
} from './types';
import { isContinuousRange, isDiscreteRange, isSliderRange } from './utils';

const defaultSliderStyle: SliderStyle = {
  width: '100%',
  itemSize: 16,
  itemIconSize: 8,
  dragHandleSize: 14,
};

@requiredProperties({
  range: PropTypes.of(isSliderRange),
})
export class Slider extends WithDisposable(LitElement) {
  static override styles = styles;

  @property({ attribute: false })
  accessor value: number = 0;

  @property({ attribute: true, type: Boolean })
  accessor disabled = false;

  @property({ attribute: false })
  accessor tooltip: string | undefined = undefined;

  @property({ attribute: false })
  accessor range!: SliderRange;

  @property({ attribute: false })
  accessor sliderStyle: Partial<SliderStyle> | undefined = defaultSliderStyle;

  private get _sliderStyle(): SliderStyle {
    return {
      ...defaultSliderStyle,
      ...this.sliderStyle,
    };
  }

  private _onSelect(value: number) {
    this.dispatchEvent(
      new CustomEvent('select', {
        detail: { value },
        bubbles: true,
        composed: true,
      }) satisfies SliderSelectEvent
    );
  }

  private _updateLineWidthPanelByDragHandlePosition(x: number) {
    const {
      _sliderStyle: { itemSize, dragHandleSize },
    } = this;

    const width = this.getBoundingClientRect().width;
    const halfItemSize = itemSize / 2;
    const halfDragHandleSize = dragHandleSize / 2;
    const padding = Math.max(halfItemSize, halfDragHandleSize);
    const trackLength = Math.max(width - padding * 2, 0);
    const ratio =
      trackLength === 0 ? 0 : clamp((x - padding) / trackLength, 0, 1);

    if (isContinuousRange(this.range)) {
      const { min, max, step } = this.range;
      const span = max - min || 1;
      const raw = min + ratio * span;
      const selected = clamp(
        Number((Math.round(raw / step) * step).toFixed(2)),
        Math.min(min, max),
        Math.max(min, max)
      );
      const displayRatio =
        span === 0 ? 0 : clamp((selected - min) / span, 0, 1);
      this.style.setProperty('--cursor-ratio', `${displayRatio}`);
      this._onSelect(selected);
      return;
    }

    const { points } = this.range;
    const count = points.length;
    if (count === 0) return;

    const index =
      count === 1 ? 0 : Math.round(ratio * (count - 1));
    const clampedIndex = clamp(index, 0, count - 1);
    const selectedSize = points[clampedIndex];
    if (selectedSize === undefined) return;

    const displayRatio =
      count <= 1 ? 0 : clampedIndex / (count - 1);
    this.style.setProperty('--cursor-ratio', `${displayRatio}`);
    this._onSelect(selectedSize);
  }

  private readonly _getDragHandlePosition = (e: PointerEvent) => {
    const width = this.getBoundingClientRect().width;
    return clamp(e.offsetX, 0, width);
  };

  private readonly _onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    this._onPointerMove(e);

    const dispose = on(this, 'pointermove', this._onPointerMove);
    this._disposables.add(once(this, 'pointerup', dispose));
    this._disposables.add(once(this, 'pointerleave', dispose));
  };

  private readonly _onPointerMove = (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const x = this._getDragHandlePosition(e);

    this._updateLineWidthPanelByDragHandlePosition(x);
  };

  override connectedCallback() {
    super.connectedCallback();

    this.style.setProperty('--cursor-ratio', '0');
    this._disposables.addFromEvent(this, 'pointerdown', this._onPointerDown);
    this._disposables.addFromEvent(this, 'click', e => {
      e.stopPropagation();
    });
  }

  override willUpdate(changedProperties: PropertyValues<this>) {
    const { style } = this;
    if (changedProperties.has('sliderStyle')) {
      const {
        _sliderStyle: { width, itemSize, itemIconSize, dragHandleSize },
      } = this;
      style.setProperty('--width', width);
      style.setProperty('--item-size', `${itemSize}px`);
      style.setProperty('--item-icon-size', `${itemIconSize}px`);
      style.setProperty('--drag-handle-size', `${dragHandleSize}px`);
    }
    if (changedProperties.has('range')) {
      if (isContinuousRange(this.range)) {
        const { min, max, step } = this.range;
        const count = Math.max(Math.round((max - min) / step), 1) + 1;
        style.setProperty('--count', `${count}`);
        this.toggleAttribute('data-continuous', true);
      } else {
        style.setProperty('--count', `${this.range.points.length}`);
        this.toggleAttribute('data-continuous', false);
      }
    }
    if (
      changedProperties.has('value') ||
      changedProperties.has('range') ||
      changedProperties.has('sliderStyle')
    ) {
      this._updateCursorRatio();
    }
  }

  private _updateCursorRatio() {
    if (!this.range) {
      this.style.setProperty('--cursor-ratio', '0');
      return;
    }

    if (isContinuousRange(this.range)) {
      const { min, max } = this.range;
      const span = max - min || 1;
      const ratio = span === 0 ? 0 : clamp((this.value - min) / span, 0, 1);
      this.style.setProperty('--cursor-ratio', `${ratio}`);
      return;
    }

    const { points } = this.range;
    const count = points.length;
    if (count === 0) {
      this.style.setProperty('--cursor-ratio', '0');
      return;
    }

    const index = points.findIndex(p => p === this.value);
    const nearestIndex =
      index !== -1 ? index : this._findNearestIndex(points, this.value);
    const denominator = count <= 1 ? 1 : count - 1;
    const ratio = clamp(nearestIndex / denominator, 0, 1);
    this.style.setProperty('--cursor-ratio', `${ratio}`);
  }

  private _findNearestIndex(points: number[], value: number): number {
    if (!points.length) {
      return 0;
    }

    let nearestIndex = 0;
    let minDiff = Math.abs(points[0] - value);
    for (let i = 1; i < points.length; i++) {
      const diff = Math.abs(points[i] - value);
      if (diff < minDiff) {
        minDiff = diff;
        nearestIndex = i;
      }
    }
    return nearestIndex;
  }

  override render() {
    const pointsToRender = isContinuousRange(this.range)
      ? [this.range.min, this.range.max]
      : this.range.points;
    return html`<div class="slider-container">
      ${repeat(
        pointsToRender,
        w => w,
        (w, n) =>
          html`<div
            class="point-button"
            aria-label=${w}
            data-index=${n}
            ?data-selected=${w <= this.value}
          >
            <div class="point-circle"></div>
          </div>`
      )}
      <div class="drag-handle"></div>
      <div class="bottom-line"></div>
      <div class="slider-selected-overlay"></div>
      ${this.tooltip
        ? html`<affine-tooltip .offset=${8}>${this.tooltip}</affine-tooltip>`
        : nothing}
    </div>`;
  }
}
