"use client";

export default function AnnouncementBar() {
  const items = [
    "Welcome to Crispo Cookies",
    "100% ZERO MAIDHA",
    "Made With Pure Oats",
    "Baked to Impress. Baked With Purpose.",
    "Handcrafted in Nellore",
  ];

  return (
    <div
      className="bg-royal text-gold-soft overflow-hidden py-2.5 relative border-b border-gold/20"
      role="banner"
      aria-label="Announcements"
    >
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items, ...items].map((item, i) => (
          <span
            key={i}
            className="mx-8 text-xs font-semibold tracking-widest uppercase flex items-center gap-3"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold/60" aria-hidden="true" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}