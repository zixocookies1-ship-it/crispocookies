const COPIES = 4;

export default function AnnouncementBar() {
  return (
    <div
      className="crispo-announce py-2 relative border-b border-gold/15"
      role="banner"
      aria-label="Announcements"
    >
      <div className="crispo-announce__track">
        {Array.from({ length: COPIES }).map((_, i) => (
          <span
            key={i}
            data-marquee={i === 0 ? "false" : "true"}
            aria-hidden={i === 0 ? undefined : true}
            className="px-6 text-[11px] sm:text-xs font-bold uppercase tracking-[0.24em] text-cream/95"
          >
            🍪 Welcome to Crispo Cookies
          </span>
        ))}
      </div>
    </div>
  );
}