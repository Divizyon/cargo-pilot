export interface ScaledDimensions {
  scaledLength: number;
  scaledWidth: number;
  offsetX: number;
  offsetY: number;
}

export function scaleVehicleDimensions(
  length: number,
  width: number,
  containerWidth: number,
  containerHeight: number,
): ScaledDimensions {
  if (!length || !width) {
    return { scaledLength: 0, scaledWidth: 0, offsetX: 0, offsetY: 0 };
  }

  const aspectRatio = length / width;
  const containerAspect = containerWidth / containerHeight;

  let scaledLength: number;
  let scaledWidth: number;

  if (aspectRatio > containerAspect) {
    scaledLength = containerWidth;
    scaledWidth = containerWidth / aspectRatio;
  } else {
    scaledWidth = containerHeight;
    scaledLength = containerHeight * aspectRatio;
  }

  const offsetX = (containerWidth - scaledLength) / 2;
  const offsetY = (containerHeight - scaledWidth) / 2;

  return { scaledLength, scaledWidth, offsetX, offsetY };
}
