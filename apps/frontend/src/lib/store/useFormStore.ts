import { create } from 'zustand';
import { FORM_MODES, type FormMode } from '@/lib/types';

interface FormState {
  currentStep: number;
  mode: FormMode;
  isDirty: boolean;
  isSubmitting: boolean;
  editingItemId: string | null;
}

interface FormActions {
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  setMode: (mode: FormMode, editingItemId?: string | null) => void;
  setDirty: (isDirty: boolean) => void;
  setSubmitting: (isSubmitting: boolean) => void;
  reset: () => void;
}

type FormStore = FormState & FormActions;

const initialState = {
  currentStep: 0,
  mode: FORM_MODES.Create,
  isDirty: false,
  isSubmitting: false,
  editingItemId: null,
} satisfies FormState;

export const useFormStore = create<FormStore>((set) => ({
  ...initialState,
  setCurrentStep: (step) => set({ currentStep: Math.max(0, Math.floor(step)) }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  previousStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),
  setMode: (mode, editingItemId = null) => set({ mode, editingItemId }),
  setDirty: (isDirty) => set({ isDirty }),
  setSubmitting: (isSubmitting) => set({ isSubmitting }),
  reset: () => set(initialState),
}));
