import { z } from 'zod';

export const VehicleType = {
  Tir: 'Tir',
  Kamyon: 'Kamyon',
  Kamposet: 'Kamposet',
  Konteyner: 'Konteyner',
} as const;
export type VehicleType = (typeof VehicleType)[keyof typeof VehicleType];

export const DoorDirection = {
  Front: 'front',
  Rear: 'rear',
  Side: 'side',
  Top: 'top',
  RearAndSide: 'rearAndSide',
} as const;
export type DoorDirection = (typeof DoorDirection)[keyof typeof DoorDirection];

const VEHICLE_TYPE_VALUES = Object.values(VehicleType) as [VehicleType, ...VehicleType[]];
const DOOR_DIRECTION_VALUES = Object.values(DoorDirection) as [DoorDirection, ...DoorDirection[]];

const axleSchema = z.object({
  distance: z.number().positive(),
  tareWeight: z.number().min(0),
  maxLoad: z.number().positive(),
});

export const vehicleSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  vehicleType: z.enum(VEHICLE_TYPE_VALUES),
  description: z.string().optional(),
  plate: z.string().optional(),
  serialNumber: z.string().optional(),
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  maxCargoWeight: z.number().positive(),
  grossWeight: z.number().positive().optional(),
  tareWeight: z.number().min(0).optional(),
  maxLayerCount: z.number().int().positive().optional(),
  doorDirection: z.enum(DOOR_DIRECTION_VALUES),
  doorSide: z.enum(['right', 'left']).optional(),
  kingpin: axleSchema.optional(),
  axleB: axleSchema.optional(),
  axles: z.array(axleSchema).optional(),
  isFavorite: z.boolean().default(false),
  isActive: z.boolean().default(true),
  isDeleted: z.boolean().default(false),
  status: z.enum(['active', 'draft']).optional(),
  createdAt: z.string().datetime(),
  createdBy: z.object({ id: z.string(), fullName: z.string() }),
  updatedAt: z.string().datetime().optional(),
  updatedBy: z.object({ id: z.string(), fullName: z.string() }).optional(),
  payload: z.number().positive().optional(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;
