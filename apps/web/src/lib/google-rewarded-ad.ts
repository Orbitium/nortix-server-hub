type RewardedAdResult = "granted" | "closed" | "unavailable";

type GoogleRewardedSlot = {
  addService: (service: GooglePublisherAdsService) => GoogleRewardedSlot;
};

type GooglePublisherAdsService = {
  addEventListener: (eventName: string, listener: (event: GoogleAdEvent) => void) => void;
  removeEventListener: (eventName: string, listener: (event: GoogleAdEvent) => void) => void;
};

type GoogleAdEvent = {
  slot: GoogleRewardedSlot;
  isEmpty?: boolean;
  makeRewardedVisible?: () => boolean;
};

type GoogleTag = {
  cmd: Array<() => void>;
  enums: { OutOfPageFormat: { REWARDED: string } };
  defineOutOfPageSlot: (adUnitPath: string, format: string) => GoogleRewardedSlot | null;
  pubads: () => GooglePublisherAdsService;
  enableServices: () => void;
  display: (slot: GoogleRewardedSlot) => void;
  destroySlots: (slots: GoogleRewardedSlot[]) => boolean;
};

declare global {
  interface Window {
    googletag?: GoogleTag;
  }
}

let scriptPromise: Promise<void> | null = null;

const loadGooglePublisherTag = () => {
  if (window.googletag) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    window.googletag = { cmd: [] } as unknown as GoogleTag;
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("The rewarded ad provider could not be loaded."));
    document.head.appendChild(script);
  });
  return scriptPromise;
};

export const showGoogleRewardedAd = async (adUnitPath: string): Promise<RewardedAdResult> => {
  await loadGooglePublisherTag();
  return new Promise<RewardedAdResult>((resolve) => {
    window.googletag!.cmd.push(() => {
      const googletag = window.googletag!;
      const slot = googletag.defineOutOfPageSlot(
        adUnitPath,
        googletag.enums.OutOfPageFormat.REWARDED,
      );
      if (!slot) {
        resolve("unavailable");
        return;
      }

      const service = googletag.pubads();
      let rewardGranted = false;
      let settled = false;
      let timeoutId = 0;
      const finish = (result: RewardedAdResult) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timeoutId);
        service.removeEventListener("rewardedSlotReady", onReady);
        service.removeEventListener("rewardedSlotGranted", onGranted);
        service.removeEventListener("rewardedSlotClosed", onClosed);
        service.removeEventListener("slotRenderEnded", onRenderEnded);
        googletag.destroySlots([slot]);
        resolve(result);
      };
      const onReady = (event: GoogleAdEvent) => {
        if (event.slot !== slot || !event.makeRewardedVisible) return;
        if (!event.makeRewardedVisible()) finish("unavailable");
      };
      const onGranted = (event: GoogleAdEvent) => {
        if (event.slot === slot) rewardGranted = true;
      };
      const onClosed = (event: GoogleAdEvent) => {
        if (event.slot === slot) finish(rewardGranted ? "granted" : "closed");
      };
      const onRenderEnded = (event: GoogleAdEvent) => {
        if (event.slot === slot && event.isEmpty) finish("unavailable");
      };

      service.addEventListener("rewardedSlotReady", onReady);
      service.addEventListener("rewardedSlotGranted", onGranted);
      service.addEventListener("rewardedSlotClosed", onClosed);
      service.addEventListener("slotRenderEnded", onRenderEnded);
      slot.addService(service);
      googletag.enableServices();
      googletag.display(slot);
      timeoutId = window.setTimeout(() => finish("unavailable"), 30_000);
    });
  });
};
