"use client";



export default function AnnouncementBar() {
  const items = [
    "Freshly Baked Every Day",
    "Free Delivery Above ₹499",
    "Perfect Gifts For Every Occasion",
    "100% Natural Ingredients",
    "Handcrafted With Love",
  ];

  return (
    <div className="bg-navy-dark text-gold overflow-hidden py-2.5 relative" role="banner" aria-label="Announcements">
      <div className="flex animate-marquee whitespace-nowrap">
        {[...items, ...items, ...items].map((item, i) => (
          <span key={i} className="mx-8 text-xs font-semibold tracking-widest uppercase flex items-center gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-gold/60" aria-hidden="true" />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
