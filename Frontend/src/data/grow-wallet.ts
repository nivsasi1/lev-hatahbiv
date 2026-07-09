// Grow (Meshulam) Growin Wallet SDK — loads the SDK once, initialises it with our
// event handlers, then opens the wallet sheet with an authCode from /api/checkout.
// NOTE: an authCode is valid ~4 minutes — create it only on the pay click.
// The wallet's onSuccess is a UX signal only; the authoritative "paid" is the
// server-to-server callback → /thank-you polls /api/order-status for it.

export const GROW_SDK_URL = "https://cdn.meshulam.co.il/sdk/gs.min.js";
// "DEV" for sandbox, "PRODUCTION" for live. TODO: flip to "PRODUCTION" at go-live.
export const GROW_ENV: "DEV" | "PRODUCTION" = "DEV";

type GrowPayment = {
  init: (config: unknown) => void;
  renderPaymentOptions: (authCode: string) => void;
};
const growSdk = () => (window as { growPayment?: GrowPayment }).growPayment;

let sdkLoad: Promise<void> | null = null;

// inject the SDK <script> once; concurrent/later calls reuse the same promise
const loadSdk = (): Promise<void> => {
  if (!sdkLoad) {
    sdkLoad = new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.type = "text/javascript";
      s.async = true;
      s.src = GROW_SDK_URL;
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

export type WalletHandlers = {
  onSuccess: () => void; // payment reported successful by the SDK
  onFailure: (message: string) => void; // failed / errored / timed out / cancelled
};

// load + init + open the wallet. The SDK REQUIRES init(config) with the events
// object before renderPaymentOptions — skipping it silently no-ops the wallet.
export async function openGrowWallet(
  authCode: string,
  handlers: WalletHandlers
): Promise<void> {
  await loadSdk();
  const grow = growSdk();
  if (!grow || typeof grow.init !== "function" || typeof grow.renderPaymentOptions !== "function") {
    throw new Error("grow sdk loaded but growPayment API missing");
  }
  grow.init({
    environment: GROW_ENV,
    version: 1,
    events: {
      onSuccess: () => handlers.onSuccess(),
      onFailure: (r: { message?: string }) => handlers.onFailure(r?.message || "התשלום נכשל"),
      onError: (r: { message?: string }) => handlers.onFailure(r?.message || "אירעה שגיאה בתשלום"),
      onTimeout: () => handlers.onFailure("תם הזמן לתשלום — נסו שוב"),
    },
  });
  grow.renderPaymentOptions(authCode);
}
