export function useAppBadge() {
  const setBadge = async (count: number) => {
    try {
      if ('setAppBadge' in navigator) {
        if (count > 0) {
          await (navigator as any).setAppBadge(count);
        } else {
          await (navigator as any).clearAppBadge();
        }
      }
    } catch (e) {
      console.warn('Badge API not supported:', e);
    }
  };

  const clearBadge = async () => {
    try {
      if ('clearAppBadge' in navigator) {
        await (navigator as any).clearAppBadge();
      }
    } catch (e) {}
  };

  return { setBadge, clearBadge };
}
