import { useTheme } from "../hooks/useTheme";

// Sun / moon button in the header: switches the whole site between light and dark.
export default function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  const label = dark ? "Chuyển sang nền sáng" : "Chuyển sang nền tối";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-[#e7ece2] transition-colors duration-200 hover:bg-[rgba(255,255,255,0.08)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#b9cba9]"
    >
      {dark ? (
        // Sun: tap to go light.
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        // Moon: tap to go dark.
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
        </svg>
      )}
    </button>
  );
}
