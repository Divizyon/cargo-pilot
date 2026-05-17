import { z } from 'zod';
import { VehicleType, type VehicleType as VehicleTypeValue } from '@/lib/types/vehicle';
import { DIMENSION_MAX, KINGPIN_LEGAL_MAX_LOAD } from '@/lib/config/vehicle-config';

const VEHICLE_TYPE_VALUES = Object.values(VehicleType) as [VehicleTypeValue, ...VehicleTypeValue[]];

const numField = (msg: string) =>
  z
    .number({ error: msg })
    .positive(`${msg.replace('giriniz', '').trim()} sıfırdan büyük olmalıdır`);

const nonnegField = (msg: string) => z.number({ error: msg }).min(0, 'Değer negatif olamaz');

const axleEntrySchema = z.object({
  distance: numField('Geçerli bir uzaklık giriniz'),
  tareWeight: nonnegField('Geçerli bir ağırlık giriniz'),
  maxLoad: numField('Geçerli bir maksimum yük giriniz'),
});

export const vehicleFormSchema = z
  .object({
    vehicleType: z.enum(VEHICLE_TYPE_VALUES, { message: 'Araç tipi zorunludur' }),
    name: z
      .string()
      .min(1, 'Araç adı zorunludur')
      .max(100, 'Araç adı en fazla 100 karakter olabilir'),
    description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').optional(),
    plate: z.string().max(20, 'Plaka en fazla 20 karakter olabilir').optional(),
    serialNumber: z.string().max(50, 'Seri numarası en fazla 50 karakter olabilir').optional(),

    // VY-04: Fiziksel iç ölçüler
    length: z
      .number({ error: 'Geçerli bir uzunluk giriniz' })
      .positive('Uzunluk sıfırdan büyük olmalıdır')
      .max(DIMENSION_MAX, `Uzunluk en fazla ${DIMENSION_MAX} cm olabilir`),
    width: z
      .number({ error: 'Geçerli bir genişlik giriniz' })
      .positive('Genişlik sıfırdan büyük olmalıdır')
      .max(DIMENSION_MAX, `Genişlik en fazla ${DIMENSION_MAX} cm olabilir`),
    height: z
      .number({ error: 'Geçerli bir yükseklik giriniz' })
      .positive('Yükseklik sıfırdan büyük olmalıdır')
      .max(DIMENSION_MAX, `Yükseklik en fazla ${DIMENSION_MAX} cm olabilir`),

    // Katman sayısı
    layerCount: z
      .number({ error: 'Geçerli bir katman sayısı giriniz' })
      .int('Katman sayısı tam sayı olmalıdır')
      .min(1, 'Katman sayısı en az 1 olmalıdır')
      .optional(),

    // VY-06: Ağırlık limitleri
    maxCargoWeight: z
      .number({ error: 'Geçerli bir ağırlık giriniz' })
      .positive('Maksimum kargo yükü sıfırdan büyük olmalıdır'),
    grossWeight: z
      .number({ error: 'Geçerli bir ağırlık giriniz' })
      .positive('Brüt ağırlık sıfırdan büyük olmalıdır')
      .optional(),
    tareWeight: z
      .number({ error: 'Geçerli bir ağırlık giriniz' })
      .min(0, 'Dara ağırlığı negatif olamaz')
      .optional(),

    // VY-07: Kapı yönü
    doorDirection: z.enum(['front', 'rear', 'side', 'top', 'rearAndSide'] as const, {
      message: 'Lütfen kapı yönünü seçiniz',
    }),
    doorSide: z.enum(['right', 'left'] as const).optional(),

    // VY-09: King pimi (Tır/Kamposet)
    kingpin: z
      .object({
        distance: numField('Geçerli bir uzaklık giriniz'),
        tareWeight: nonnegField('Geçerli bir ağırlık giriniz'),
        maxLoad: z
          .number({ error: 'Geçerli bir yük değeri giriniz' })
          .positive('Maksimum yük sıfırdan büyük olmalıdır')
          .max(
            KINGPIN_LEGAL_MAX_LOAD,
            `Yasal limit ${KINGPIN_LEGAL_MAX_LOAD.toLocaleString('tr-TR')} kg'yi aşamaz`,
          ),
      })
      .optional(),

    // VY-10: Ana aks (B)
    axleB: z
      .object({
        distance: numField('Geçerli bir uzaklık giriniz'),
        tareWeight: nonnegField('Geçerli bir ağırlık giriniz'),
        maxLoad: numField('Lütfen Aks B için maksimum yük değerini giriniz'),
      })
      .optional(),

    // VY-11: İlave akslar
    axles: z.array(axleEntrySchema).optional(),

    // VY-14: Taslak durumu
    status: z.enum(['active', 'draft', 'taslak']).optional(),

    // VY-15: Operasyonel uygunluk
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.vehicleType) return;

    const isTirOrKamposet =
      data.vehicleType === VehicleType.Tir || data.vehicleType === VehicleType.Kamposet;
    const isRoadVehicle = isTirOrKamposet || data.vehicleType === VehicleType.Kamyon;

    // VY-09: King pimi Tır/Kamposet için zorunlu
    if (isTirOrKamposet && !data.kingpin) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'King Pimi bilgileri zorunludur',
        path: ['kingpin'],
      });
    }

    // VY-10: Ana aks (B) karayolu araçları için zorunlu
    if (isRoadVehicle && !data.axleB) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Ana Aks (B) bilgileri zorunludur',
        path: ['axleB'],
      });
    }

    // VY-06: Aksların toplam kapasitesi
    const allAxles = [
      ...(data.axleB ? [data.axleB] : []),
      ...(data.axles ?? []),
      ...(data.kingpin ? [data.kingpin] : []),
    ];
    if (allAxles.length > 0 && data.maxCargoWeight) {
      const totalAxleCapacity = allAxles.reduce((s, a) => s + (a.maxLoad ?? 0), 0);
      if (totalAxleCapacity < data.maxCargoWeight) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Aksların toplam kapasitesi maksimum kargo yükünden düşük',
          path: ['maxCargoWeight'],
        });
      }
    }

    // VY-13: Aks mesafeleri araç uzunluğunu aşmamalı
    if (data.length && data.axles && data.axles.length > 0) {
      const distanceSum = data.axles.reduce((s, a) => s + (a.distance ?? 0), 0);
      if (distanceSum > data.length) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Geçersiz Mesafe: Aks mesafeleri toplam araç boyunu aşıyor',
          path: ['axles'],
        });
      }
    }
  });

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;
export type AxleEntry = z.infer<typeof axleEntrySchema>;
