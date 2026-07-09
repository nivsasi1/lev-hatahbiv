// Grow (Meshulam) Growin Wallet — loads the SDK script once and opens the
// wallet payment sheet with an authCode from /api/checkout.
// NOTE: an authCode is valid for ~4 minutes — create it only on the pay click,
// never ahead of time.

export const GROW_SDK_URL = ""; // TODO: exact script URL from Grow's Wallet SDK implementation doc (with sandbox creds)

let sdkLoad: Promise<void> | null = null;

// inject the SDK <script> once; concurrent/later calls reuse the same promise
const loadSdk = (): Promise<void> => {
  if (!sdkLoad) {
    sdkLoad = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = GROW_SDK_URL;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        sdkLoad = null; // allow a retry after a network hiccup
        reject(new Error("grow sdk failed to load"));
      };
      document.head.appendChild(s);
    });
  }
  return sdkLoad;
};

export async function openGrowWallet(authCode: string): Promise<void> {
  if (!GROW_SDK_URL) throw new Error("grow wallet sdk url not configured");
  await loadSdk();
  const grow = (window as any).growPayment;
  if (!grow || typeof grow.renderPaymentOptions !== "function") {
    throw new Error("grow sdk loaded but growPayment.renderPaymentOptions missing");
  }
  grow.renderPaymentOptions(authCode);
}
