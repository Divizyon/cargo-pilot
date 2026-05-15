import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ErpSettingsStore {
  autoTriggerOnApproval: boolean;
  setAutoTriggerOnApproval: (value: boolean) => void;
}

export const useErpSettingsStore = create<ErpSettingsStore>()(
  persist(
    (set) => ({
      autoTriggerOnApproval: true,
      setAutoTriggerOnApproval: (autoTriggerOnApproval) => set({ autoTriggerOnApproval }),
    }),
    { name: 'erp-settings' },
  ),
);
