import { useEffect } from "react";
import { useLocation } from "react-router-dom";

// React Router doesn't scroll to #anchors by itself: after a navigation that
// carries a hash (header/footer links to "/#tin-hieu" from another page, or a
// repeat click on the same link), bring the matching element into view once the
// page has rendered it. Navigations without a hash are left alone.
export default function ScrollToHash() {
  const { hash, key } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    let tries = 0;
    // The target may be rendered a moment later (route change, data), so retry
    // briefly instead of giving up on the first frame.
    const timer = window.setInterval(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        window.clearInterval(timer);
      } else if (++tries > 20) {
        window.clearInterval(timer);
      }
    }, 50);
    return () => window.clearInterval(timer);
  }, [hash, key]);

  return null;
}
