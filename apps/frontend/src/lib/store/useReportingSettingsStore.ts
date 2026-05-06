import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { toDateKey, deriveCustomerCode } from '@/lib/utils/pdfDateUtils';
import type { DateFormat } from '@/lib/utils/pdfDateUtils';

export type { DateFormat };

export interface ReportingSettings {
  logoDataUrl: string | null;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  dateFormat: DateFormat;
  showSignatureArea: boolean;
  docSequence: { lastDate: string; count: number };
}

interface ReportingSettingsStore extends ReportingSettings {
  setLogo: (dataUrl: string) => void;
  removeLogo: () => void;
  updateContactInfo: (
    info: Partial<Pick<ReportingSettings, 'companyName' | 'phone' | 'email' | 'address'>>,
  ) => void;
  setDateFormat: (format: DateFormat) => void;
  toggleSignatureArea: () => void;
  nextDocumentNumber: () => string;
}

export const useReportingSettingsStore = create<ReportingSettingsStore>()(
  persist(
    (set, get) => ({
      logoDataUrl: null,
      companyName: '',
      phone: '',
      email: '',
      address: '',
      dateFormat: 'DD.MM.YYYY',
      showSignatureArea: true,
      docSequence: { lastDate: '', count: 0 },

      setLogo: (dataUrl) => set({ logoDataUrl: dataUrl }),
      removeLogo: () => set({ logoDataUrl: null }),
      updateContactInfo: (info) => set(info),
      setDateFormat: (format) => set({ dateFormat: format }),
      toggleSignatureArea: () => set((s) => ({ showSignatureArea: !s.showSignatureArea })),

      nextDocumentNumber: () => {
        const today = toDateKey(new Date());
        const { docSequence, companyName } = get();
        const isNewDay = docSequence.lastDate !== today;
        const newCount = isNewDay ? 1 : docSequence.count + 1;
        set({ docSequence: { lastDate: today, count: newCount } });
        const code = deriveCustomerCode(companyName);
        const seq = String(newCount).padStart(4, '0');
        return `${code}-RPT-${today}-${seq}`;
      },
    }),
    {
      name: 'cargo-pilot-reporting-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
