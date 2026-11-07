import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export interface PlatformInfo {
  isAndroid: boolean;
  isIOS: boolean;
  isWindows: boolean;
  isMac: boolean;
  isMobile: boolean;
  platformName: string;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<PlatformInfo>({
    isAndroid: false,
    isIOS: false,
    isWindows: false,
    isMac: false,
    isMobile: false,
    platformName: 'Device'
  });

  useEffect(() => {
    // Detect standalone mode (already running as installed PWA / home-screen app)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    // Platform detection
    const ua = (window.navigator.userAgent || '').toLowerCase();
    const isAndroid = /android/.test(ua);
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isWindows = /windows|win32|win64/.test(ua);
    const isMac = /macintosh|mac os x/.test(ua) && !isIOS;
    const isMobile = isAndroid || isIOS || /mobile|tablet/.test(ua);

    let platformName = 'Device';
    if (isAndroid) platformName = 'Android';
    else if (isIOS) platformName = 'iPhone / iPad';
    else if (isWindows) platformName = 'Windows';
    else if (isMac) platformName = 'Mac';

    setPlatform({
      isAndroid,
      isIOS,
      isWindows,
      isMac,
      isMobile,
      platformName
    });

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (): Promise<boolean> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return true;
        }
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    platform,
    triggerInstall
  };
}
