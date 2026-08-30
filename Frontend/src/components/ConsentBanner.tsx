import { useState } from "react";
import { Link } from "react-router-dom";
import { needsConsentBanner, grantConsent, denyConsent } from "../data/analytics";

// Marketing-cookie consent bar. Only appears when an ad pixel (Meta / Google Ads)
// is actually configured AND the shopper hasn't chosen yet — so the shop's UX is
// untouched until paid ads are turned on. Analytics is unaffected either way
// (granted by default under Consent Mode); this gates ad personalization only.
export const ConsentBanner = () => {
  const [show, setShow] = useState(() => needsConsentBanner());
  if (!show) return null;

  const decide = (accept: boolean) => {
    if (accept) grantConsent();
    else denyConsent();
    setShow(false);
  };

  return (
    <div className="consent-bar" role="dialog" aria-label="הסכמה לעוגיות שיווק">
      <p className="consent-text">
        אנחנו משתמשים בעוגיות למדידה ולשיווק כדי לשפר את החוויה ואת המבצעים שלנו.
        פרטים ב<Link to="/privacy">מדיניות הפרטיות</Link>.
      </p>
      <div className="consent-actions">
        <button type="button" className="btn small ghost" onClick={() => decide(false)}>
          רק ההכרחי
        </button>
        <button type="button" className="btn small" onClick={() => decide(true)}>
          אישור
        </button>
      </div>
    </div>
  );
};
