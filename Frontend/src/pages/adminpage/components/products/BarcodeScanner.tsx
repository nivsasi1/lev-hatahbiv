import { useEffect, useRef, useState } from "react";

// Camera barcode scanner for the dashboard. Two engines, in order:
//   1. the browser's own BarcodeDetector (Android Chrome) — free, instant;
//   2. ZXing, imported dynamically so it becomes its own chunk and the
//      storefront bundle never carries it. This is what makes iPhone/Safari
//      work, where BarcodeDetector doesn't exist.
// Whatever happens with the camera, the manual field below the viewfinder
// still accepts a typed barcode — or a USB scanner "typing" one — so the
// dialog is never a dead end.

// Retail EAN/UPC plus the Code 128/39 that supplier labels use.
const NATIVE_FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "codabar",
];

type Engine = {
  read: (video: HTMLVideoElement) => Promise<string | null>;
  stop: () => void;
};

async function makeEngine(): Promise<Engine> {
  const w = window as any;
  if (w.BarcodeDetector) {
    try {
      const supported: string[] = await w.BarcodeDetector.getSupportedFormats();
      const formats = NATIVE_FORMATS.filter((f) => supported.includes(f));
      if (formats.length) {
        const detector = new w.BarcodeDetector({ formats });
        return {
          read: async (video) => {
            const hits = await detector.detect(video);
            return hits?.[0]?.rawValue || null;
          },
          stop: () => {},
        };
      }
    } catch {
      // a broken or partial implementation — fall through to ZXing
    }
  }
  // BrowserBarcodeReader is the 1-D-only reader — product barcodes are all 1-D.
  // It comes through a tiny static re-export (lib/zxing-1d) so the bundler can
  // shake the library instead of inlining the whole barrel namespace. The chunk
  // is ~100KB gzipped and is fetched only here, only on a browser that has no
  // BarcodeDetector of its own.
  const { BrowserBarcodeReader, DecodeHintType, BarcodeFormat } = await import(
    "../../lib/zxing-1d"
  );
  const hints = new Map<any, any>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128,
    BarcodeFormat.CODE_39,
    BarcodeFormat.ITF,
    BarcodeFormat.CODABAR,
  ]);
  const reader = new BrowserBarcodeReader(undefined, hints);
  return {
    // decode() sizes its capture canvas from the video ONCE, so it must not run
    // before the first real frame has arrived (videoWidth still 0).
    read: async (video) => {
      if (!video.videoWidth) return null;
      try {
        return reader.decode(video).getText() || null;
      } catch {
        return null; // NotFoundException on a frame without a barcode — normal
      }
    },
    stop: () => reader.reset(),
  };
}

// short confirmation blip; both are best-effort and silent where unsupported
const confirmHit = () => {
  try {
    navigator.vibrate?.(80);
  } catch {
    /* ignore */
  }
  try {
    const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
    setTimeout(() => ctx.close(), 400);
  } catch {
    /* ignore */
  }
};

export function BarcodeScanner({
  onDetected,
  onClose,
}: {
  onDetected: (code: string) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trackRef = useRef<MediaStreamTrack | null>(null);
  // keep the latest callback without re-running the camera effect
  const hit = useRef(onDetected);
  hit.current = onDetected;

  const [status, setStatus] = useState<"starting" | "scanning" | "blocked">("starting");
  const [hint, setHint] = useState("");
  const [manual, setManual] = useState("");
  const [torch, setTorch] = useState<boolean | null>(null); // null = no torch on this camera

  useEffect(() => {
    let cancelled = false;
    let stream: MediaStream | null = null;
    let engine: Engine | null = null;
    let timer = 0;

    const fail = (msg: string) => {
      if (cancelled) return;
      setStatus("blocked");
      setHint(msg);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        fail("הדפדפן הזה לא נותן גישה למצלמה. אפשר להקליד את הברקוד למטה, או לסרוק עם סורק USB.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (e: any) {
        const name = e?.name || "";
        fail(
          name === "NotAllowedError" || name === "SecurityError"
            ? "הדפדפן חסם את המצלמה. אפשרו גישה למצלמה (בסמל שליד כתובת האתר) ונסו שוב."
            : name === "NotFoundError" || name === "OverconstrainedError"
              ? "לא נמצאה מצלמה במכשיר הזה."
              : "לא הצלחנו להפעיל את המצלמה."
        );
        return;
      }
      const video = videoRef.current;
      if (cancelled || !video) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      video.srcObject = stream;
      try {
        await video.play();
      } catch {
        /* autoplay hiccup — the frames still arrive once the element is visible */
      }
      const track = stream.getVideoTracks()[0] || null;
      trackRef.current = track;
      if ((track?.getCapabilities?.() as any)?.torch) setTorch(false);

      try {
        engine = await makeEngine();
      } catch {
        fail("לא הצלחנו לטעון את מנוע הסריקה. אפשר להקליד את הברקוד למטה.");
        return;
      }
      if (cancelled) return;
      setStatus("scanning");

      const tick = async () => {
        if (cancelled || !videoRef.current || !engine) return;
        let code: string | null = null;
        try {
          code = await engine.read(videoRef.current);
        } catch {
          code = null;
        }
        if (cancelled) return;
        const clean = (code || "").trim();
        if (clean) {
          confirmHit();
          hit.current(clean);
          return; // the parent closes us; no further frames
        }
        timer = window.setTimeout(tick, 180);
      };
      tick();
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      engine?.stop();
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const toggleTorch = async () => {
    const track = trackRef.current;
    if (!track || torch === null) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch }] } as any);
      setTorch(!torch);
    } catch {
      setTorch(null); // the camera refused it — stop offering
    }
  };

  return (
    <div
      className="ui-veil"
      onClick={onClose}
      onKeyDown={(e: any) => {
        if (e.key === "Escape") onClose();
      }}
    >
      <div
        className="scan-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="סריקת ברקוד"
        onClick={(e: any) => e.stopPropagation()}
      >
        <h3 className="display">סריקת ברקוד</h3>

        <div className={`scan-stage ${status}`}>
          <video ref={videoRef} playsInline muted autoPlay aria-label="תצוגת מצלמה" />
          {status !== "blocked" && <div className="scan-frame" aria-hidden="true" />}
          {status === "starting" && <p className="scan-over">מפעיל מצלמה…</p>}
          {status === "blocked" && <p className="scan-over">{hint}</p>}
        </div>

        {status === "scanning" && (
          <p className="import-help">
            כוונו את הברקוד למסגרת. המוצר ייפתח לעריכה אם הוא כבר קיים, ואם לא — ייפתח טופס
            מוצר חדש עם הברקוד.
          </p>
        )}

        <form
          className="scan-manual"
          onSubmit={(e: any) => {
            e.preventDefault();
            const code = manual.trim();
            if (code) hit.current(code);
          }}
        >
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="או הקלדת ברקוד ידנית"
            value={manual}
            onInput={(e: any) => setManual(e.target.value)}
          />
          <button className="btn small" type="submit" disabled={!manual.trim()}>
            חיפוש
          </button>
        </form>

        <div className="admin-form-foot">
          {torch !== null && (
            <button type="button" className="btn small ghost" onClick={toggleTorch}>
              {torch ? "🔦 כיבוי פנס" : "🔦 הדלקת פנס"}
            </button>
          )}
          <button type="button" className="btn small ghost" onClick={onClose}>
            סגירה
          </button>
        </div>
      </div>
    </div>
  );
}
