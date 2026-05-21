const SW_URL = "/sw-drill-mode.js";

export async function registerDrillModeServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register(SW_URL, { scope: "/" });
  } catch (err) {
    console.warn("[drill-mode] service worker registration failed", err);
  }
}

export async function unregisterDrillModeServiceWorker(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      if (reg.active?.scriptURL.endsWith(SW_URL) || reg.installing?.scriptURL.endsWith(SW_URL)) {
        await reg.unregister();
      }
    }
  } catch (err) {
    console.warn("[drill-mode] service worker unregister failed", err);
  }
}
