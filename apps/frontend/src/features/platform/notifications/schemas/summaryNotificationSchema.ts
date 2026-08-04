import { z } from 'zod';

export const SummaryFrequency = {
  Gunluk: 'Gunluk',
  Haftalik: 'Haftalik',
} as const;

export type SummaryFrequency = (typeof SummaryFrequency)[keyof typeof SummaryFrequency];

export const SummaryEventType = {
  ErpExportError: 'ErpExportError',
  PendingShipment: 'PendingShipment',
  ProductChange: 'ProductChange',
} as const;

export type SummaryEventType = (typeof SummaryEventType)[keyof typeof SummaryEventType];

export const summaryNotificationSchema = z.object({
  enabled: z.boolean(),
  frequency: z.enum(['Gunluk', 'Haftalik']),
  sendTime: z.string().regex(/^\d{2}:\d{2}$/, 'Geçerli bir saat girin (ÖR: 08:00)'),
  eventTypes: z.array(z.enum(['ErpExportError', 'PendingShipment', 'ProductChange'])),
});

export type SummaryNotificationValues = z.infer<typeof summaryNotificationSchema>;
