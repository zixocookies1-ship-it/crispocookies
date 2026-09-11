import Link from "next/link";

export default function NotFound() {
  return (
    <div className="bg-cocoa min-h-[70vh] flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <p className="eyebrow mb-4">Lost Your Way?</p>
        <p className="font-heading text-7xl font-bold text-gradient-gold select-none" aria-hidden="true">
          404
        </p>
        <h1 className="font-heading text-3xl font-bold text-cream mt-2 mb-3">
          This crumb went missing
        </h1>
        <p className="text-muted mb-8">
          The page you&apos;re looking for doesn&apos;t exist or was moved.
          Let&apos;s get you back to the good stuff.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/" className="crispo-btn-gold">
            Back Home
          </Link>
          <Link href="/shop" className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-gold-soft/60 text-gold-soft font-semibold px-6 py-3 text-sm transition-colors hover:bg-gold/10">
            Shop Cookies
          </Link>
        </div>
      </div>
    </div>
  );
}
