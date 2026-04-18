import { FORM_MODES } from '@/lib/types';
import { useAuthStore } from '@/lib/store/useAuthStore';
import { useFormStore } from '@/lib/store/useFormStore';
import { usePlanStore } from '@/lib/store/usePlanStore';
import { useSceneStore } from '@/lib/store/useSceneStore';
import { useUIStore } from '@/lib/store/useUIStore';

/**
 * Scenario 1: API interceptor can notify without React hooks.
 */
export const notifyFromApiInterceptor = (statusCode: number, message: string): void => {
  const uiState = useUIStore.getState();
  uiState.addNotification({
    message: `[${statusCode}] ${message}`,
    type: statusCode >= 500 ? 'error' : 'warning',
    duration: 5000,
  });
};

/**
 * Scenario 2: When a box is selected in 3D scene, sync active layer from plan placements.
 */
export const syncSceneLayerWithPlacement = (selectedItemId: string): void => {
  const planState = usePlanStore.getState();
  const sceneState = useSceneStore.getState();

  const placement = planState.placements.find((entry) => entry.itemId === selectedItemId);
  if (!placement) {
    return;
  }

  sceneState.setActiveLayer(placement.layer);
  sceneState.setLayerVisibility(placement.layer, true);
};

/**
 * Scenario 3: On auth expiration, clear all UI-only slices from non-React runtime.
 */
export const resetUiSlicesOnAuthExpiration = (): void => {
  useAuthStore.getState().clearSession();
  usePlanStore.getState().reset();
  useSceneStore.getState().reset();
  useFormStore.getState().reset();
  useUIStore.getState().clearNotifications();
};

/**
 * Scenario 4: Auto-open edit wizard when selected plan item exists in cart.
 */
export const openEditWizardForPlanItem = (itemId: string): void => {
  const planState = usePlanStore.getState();
  const formState = useFormStore.getState();

  const hasItemInCart = planState.selectedItems.some((entry) => entry.itemId === itemId);
  if (!hasItemInCart) {
    useUIStore.getState().addNotification({
      message: 'Selected item is not in planning cart.',
      type: 'info',
      duration: 3000,
    });
    return;
  }

  formState.setMode(FORM_MODES.Edit, itemId);
  formState.setCurrentStep(1);
};
