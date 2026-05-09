import { z } from 'zod';

export const regionalSettingsSchema = z.object({
  language: z.enum(['tr', 'en']),
  timezone: z.string().min(1),
  dateFormat: z.enum(['DD.MM.YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']),
  dimensionUnit: z.enum(['cm', 'mm']),
  weightUnit: z.enum(['kg', 'ton']),
  volumeUnit: z.enum(['m³', 'dm³']),
});

export type RegionalSettingsValues = z.infer<typeof regionalSettingsSchema>;

export const visualizationSettingsSchema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  showGrid: z.boolean(),
  showLabels: z.boolean(),
  showAxes: z.boolean(),
  animationEnabled: z.boolean(),
  colorScheme: z.enum(['default', 'category', 'weight']),
});

export type VisualizationSettingsValues = z.infer<typeof visualizationSettingsSchema>;

export const reportingSettingsSchema = z.object({
  reportLanguage: z.enum(['tr', 'en']),
  pageSize: z.enum(['A4', 'A3', 'Letter']),
  exportFormat: z.enum(['pdf', 'excel', 'both']),
  includeCompanyLogo: z.boolean(),
  headerText: z.string().max(200),
  footerText: z.string().max(200),
});

export type ReportingSettingsValues = z.infer<typeof reportingSettingsSchema>;
