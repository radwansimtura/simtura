import { useState, useEffect } from "react";

const CONSENT_KEY = "simtura_cookie_consent";

export function useCookieConsent() {
  const [consentGiven, setConsentGiven] = useState(() => {
    try {
      return localStorage.getItem(CONSENT_KEY) === "accepted";
    } catch {
      return false;
    }
  });

  const [bannerVisible, setBannerVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(CONSENT_KEY)) {
      const timer = setTimeout(() => setBannerVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const acceptCookies = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "accepted");
    } catch {}
    setConsentGiven(true);
    setBannerVisible(false);
  };

  const declineCookies = () => {
    try {
      localStorage.setItem(CONSENT_KEY, "dismissed");
    } catch {}
    setBannerVisible(false);
  };

  return { consentGiven, bannerVisible, acceptCookies, declineCookies };
}
