import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface ReportingSettings {
  logoDataUrl: string | null;
  companyName: string;
  phone: string;
  email: string;
  address: string;
}

interface ReportingSettingsStore extends ReportingSettings {
  setLogo: (dataUrl: string) => void;
  removeLogo: () => void;
  updateContactInfo: (info: Partial<Omit<ReportingSettings, 'logoDataUrl'>>) => void;
}

export const useReportingSettingsStore = create<ReportingSettingsStore>()(
  persist(
    (set) => ({
      logoDataUrl: null,
      companyName: '',
      phone: '',
      email: '',
      address: '',
      setLogo: (dataUrl) => set({ logoDataUrl: dataUrl }),
      removeLogo: () => set({ logoDataUrl: null }),
      updateContactInfo: (info) => set(info),
    }),
    {
      name: 'cargo-pilot-reporting-settings',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
