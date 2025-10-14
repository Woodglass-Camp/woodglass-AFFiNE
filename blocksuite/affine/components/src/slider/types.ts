export type SliderDiscreteRange = {
  /**
   * a series of points in slider
   */
  points: number[];
  /**
   * whether the points are uniformly distributed
   * @default true
   */
  uniform?: boolean;
};

export type SliderContinuousRange = {
  /** minimum value */
  min: number;
  /** maximum value */
  max: number;
  /** step between values */
  step: number;
};

export type SliderRange = SliderDiscreteRange | SliderContinuousRange;

export type SliderStyle = {
  width: string;
  itemSize: number;
  itemIconSize: number;
  dragHandleSize: number;
};

export type SliderSelectEvent = CustomEvent<{
  value: number;
}>;
