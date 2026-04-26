import { useEffect } from 'react';
import { toast } from 'sonner';
import { useUIStore } from '@/lib/store/useUIStore';

export function NotificationBridge() {
  const notifications = useUIStore((s) => s.notifications);
  const removeNotification = useUIStore((s) => s.removeNotification);

  useEffect(() => {
    notifications.forEach((n) => {
      toast[n.variant](n.message, { id: n.id });
      removeNotification(n.id);
    });
  }, [notifications, removeNotification]);

  return null;
}
