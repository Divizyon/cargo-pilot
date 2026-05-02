export function validateAxleCapacity(axleMaxLoads: number[], maxCargoWeight: number): boolean {
  if (!maxCargoWeight) return true;
  return axleMaxLoads.reduce((sum, v) => sum + v, 0) >= maxCargoWeight;
}

export function validateAxleDistances(axleDistances: number[], vehicleLength: number): boolean {
  if (!vehicleLength) return true;
  return axleDistances.reduce((sum, v) => sum + v, 0) <= vehicleLength;
}
