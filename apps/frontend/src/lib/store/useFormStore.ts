import { create } from 'zustand';

export type PlanWizardStep = 'vehicle' | 'items' | 'criteria' | 'review';

interface FormStore {
  wizardStep: PlanWizardStep;
  drafts: Record<string, unknown>;
  setWizardStep: (step: PlanWizardStep) => void;
  saveDraft: (key: string, value: unknown) => void;
  getDraft: <T>(key: string) => T | undefined;
  clearDraft: (key: string) => void;
  reset: () => void;
}

const initialState = {
  wizardStep: 'vehicle' as PlanWizardStep,
  drafts: {} as Record<string, unknown>,
};

export const useFormStore = create<FormStore>((set, get) => ({
  ...initialState,
  setWizardStep: (wizardStep) => set({ wizardStep }),
  saveDraft: (key, value) => set((s) => ({ drafts: { ...s.drafts, [key]: value } })),
  getDraft: <T>(key: string) => get().drafts[key] as T | undefined,
  clearDraft: (key) =>
    set((s) => {
      const next = { ...s.drafts };
      delete next[key];
      return { drafts: next };
    }),
  reset: () => set(initialState),
}));
