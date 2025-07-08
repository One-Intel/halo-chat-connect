
import React from 'react';
import { supabase } from '@/integrations/supabase/client';

export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  private constructor() {}

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize() {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        // Register service worker
        this.registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully');

        // Request notification permission
        const permission = await this.requestPermission();
        if (permission === 'granted') {
          await this.subscribeUser();
        }
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    } else {
      console.log('Push messaging is not supported');
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  async subscribeUser() {
    if (!this.registration) {
      console.error('Service Worker not registered');
      return;
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          // You'll need to generate VAPID keys and replace this
          'BEl62iUYgUivxIkv69yViEuiBIa40HI80NE4q3DNxVUMtSq_PEgJEhHO-xDJpKHRq4XCsXf9oq5UrNbsVGMwKCU'
        )
      });

      this.subscription = subscription;
      console.log('User subscribed to push notifications');

      // For now, just log the subscription instead of saving to database
      // We'll need to create the push_subscriptions table first
      console.log('Push subscription:', subscription);
    } catch (error) {
      console.error('Failed to subscribe user:', error);
    }
  }

  async unsubscribe() {
    if (this.subscription) {
      try {
        await this.subscription.unsubscribe();
        console.log('User unsubscribed from push notifications');
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Check if notifications are supported and enabled
  isSupported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  // Get current notification permission status
  getPermissionStatus(): NotificationPermission {
    return Notification.permission;
  }

  // Show a local notification (for testing)
  showLocalNotification(title: string, options: NotificationOptions = {}) {
    if (Notification.permission === 'granted') {
      new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });
    }
  }
}

// Export singleton instance
export const pushNotificationService = PushNotificationService.getInstance();

// Hook for React components
export function usePushNotifications() {
  const [isSupported, setIsSupported] = React.useState(false);
  const [permission, setPermission] = React.useState<NotificationPermission>('default');
  const [isSubscribed, setIsSubscribed] = React.useState(false);

  React.useEffect(() => {
    const service = pushNotificationService;
    setIsSupported(service.isSupported());
    setPermission(service.getPermissionStatus());
    
    // Initialize service
    service.initialize().then(() => {
      setIsSubscribed(true);
    }).catch(() => {
      setIsSubscribed(false);
    });
  }, []);

  const requestPermission = async () => {
    const newPermission = await pushNotificationService.requestPermission();
    setPermission(newPermission);
    return newPermission;
  };

  const subscribe = async () => {
    await pushNotificationService.subscribeUser();
    setIsSubscribed(true);
  };

  const unsubscribe = async () => {
    await pushNotificationService.unsubscribe();
    setIsSubscribed(false);
  };

  return {
    isSupported,
    permission,
    isSubscribed,
    requestPermission,
    subscribe,
    unsubscribe,
    showLocalNotification: pushNotificationService.showLocalNotification.bind(pushNotificationService)
  };
}
