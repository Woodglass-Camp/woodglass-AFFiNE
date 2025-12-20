import type {
  SliderContinuousRange,
  SliderDiscreteRange,
  SliderRange,
} from './types';

export function isDiscreteRange(range: unknown): range is SliderDiscreteRange {
  return (
    typeof range === 'object' &&
    range !== null &&
    'points' in range &&
    Array.isArray((range as SliderDiscreteRange).points)
  );
}

export function isContinuousRange(
  range: unknown
): range is SliderContinuousRange {
  return (
    typeof range === 'object' &&
    range !== null &&
    'min' in range &&
    'max' in range &&
    'step' in range &&
    typeof (range as SliderContinuousRange).min === 'number' &&
    typeof (range as SliderContinuousRange).max === 'number' &&
    typeof (range as SliderContinuousRange).step === 'number'
  );
}

export function isSliderRange(range: unknown): range is SliderRange {
  return isDiscreteRange(range) || isContinuousRange(range);
}
