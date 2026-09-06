import Link from "next/link";
import { Heart, Award, Leaf, ShieldCheck, MapPin, MessageCircle } from "lucide-react";

export const metadata = {
  title: "About",
};

const values = [
  {
    icon: Award,
    label: "Premium Ingredients",
    description:
      "We never compromise on quality. Every product is made with 100% pure oats powder, real butter, and premium chocolate — because you deserve the best.",
  },
  {
    icon: Leaf,
    label: "100% ZERO MAIDHA",
    description:
      "No refined flour, no artificial flavors, no preservatives. Just pure oats and honest baking you can trust.",
  },
  {
    icon: Heart,
    label: "Made With Love",
    description:
      "Every cookie and brownie is handcrafted with passion and care in small batches in Nellore. Love goes into every batch.",
  },
  {
    icon: ShieldCheck,
    label: "Handcrafted",
    description:
      "From mixing to baking to packing, every step is done by hand — ensuring consistent quality and a personal touch.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-royal py-24 relative overflow-hidden">
        <div className="absolute top-20 right-[10%] w-72 h-72 rounded-full bg-gold/10 blur-3xl" />
        <div className="absolute bottom-20 left-[5%] w-96 h-96 rounded-full bg-plum/10 blur-3xl" />
        <div className="container-tight text-center relative z-10">
          <p className="eyebrow text-gold-soft mb-4">Our Story</p>
          <h1 className="font-heading text-5xl lg:text-display text-cream font-bold mb-4">
            A Little Crisp. A Lot of Love.
          </h1>
          <p className="text-cream/70 text-lg max-w-xl mx-auto">
            From Nellore with love — premium oat-based cookies and brownies,
            100% ZERO MAIDHA.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              "100% ZERO MAIDHA",
              "MADE WITH OATS",
              "PREMIUM INGREDIENTS",
              "HANDCRAFTED",
              "MADE WITH LOVE",
            ].map((badge) => (
              <span
                key={badge}
                className="px-4 py-2 rounded-full border border-gold/40 bg-gold/10 text-gold-soft text-xs font-bold tracking-widest uppercase"
              >
                {badge}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Story Block 1 */}
      <section className="container-tight py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="rounded-3xl aspect-[4/3] overflow-hidden shadow-lift">
            <img
              src="/our story.jpg"
              alt="Crispo Cookies — our story"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="eyebrow mb-4">How It All Started</p>
            <h2 className="font-heading text-4xl text-royal font-bold mb-4">
              Crafted with Purpose
            </h2>
            <p className="text-muted leading-relaxed mb-4">
              What started as a passion project in Nellore has now become a
              beloved cookie brand. Armed with a commitment to using only 100%
              pure oats and zero maida, we set out to create cookies and
              brownies that would make people smile with every bite — without
              any compromises on health.
            </p>
            <p className="text-muted leading-relaxed">
              From indulgent chocolate cookies to fruity and nutritious
              creations, every bite is made to bring together great taste,
              quality ingredients, and wholesome goodness.
            </p>
          </div>
        </div>
      </section>

      {/* Story Block 2 */}
      <section className="container-tight py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div className="order-2 md:order-1">
            <p className="eyebrow mb-4">Our Promise</p>
            <h2 className="font-heading text-4xl text-royal font-bold mb-4">
              Baked to Impress. Baked With Purpose.
            </h2>
            <p className="text-muted leading-relaxed">
              We believe that great cookies start with great ingredients.
              That&apos;s why we use 100% pure oats powder, real butter, and
              premium chocolate — never compromising on quality. Every batch is
              baked with 100% ZERO MAIDHA, no artificial flavors, and no
              preservatives.
            </p>
            <p className="text-muted leading-relaxed mt-4">
              From Nellore to your doorstep, every CRISPO creation is made to
              bring a little more joy to your day.
            </p>
          </div>
          <div className="order-1 md:order-2 rounded-3xl aspect-[4/3] overflow-hidden shadow-lift relative">
            <video
              className="w-full h-full object-cover"
              autoPlay
              muted
              loop
              playsInline
            >
              <source src="/hero-2.mp4" type="video/mp4" />
            </video>
            <div className="absolute inset-0 bg-gradient-to-t from-plum/30 to-transparent pointer-events-none" />
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="bg-cream-dark py-20">
        <div className="container-tight">
          <p className="eyebrow text-center mb-3">Our Values</p>
          <h2 className="section-heading text-center mb-12">
            What Makes Crispo, Crispo
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((v) => (
              <div
                key={v.label}
                className="surface-card rounded-3xl p-8 text-center hover:shadow-lift transition-shadow duration-300"
              >
                <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-5">
                  <v.icon size={28} className="text-gold" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-royal mb-3">
                  {v.label}
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  {v.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="container-tight py-20">
        <p className="eyebrow text-center mb-3">Meet Our Founder</p>
        <h2 className="font-heading text-4xl text-royal font-bold text-center mb-12">
          The Hands Behind Crispo
        </h2>
        <div className="max-w-2xl mx-auto surface-card rounded-[2rem] p-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold to-royal flex items-center justify-center text-4xl mb-5">
            👨‍🍳
          </div>
          <h3 className="font-heading text-2xl font-bold text-royal">Rahul</h3>
          <p className="text-gold text-sm font-semibold">
            Founder & Head Baker
          </p>
          <p className="font-heading italic text-muted text-lg mt-5 max-w-md leading-relaxed">
            &ldquo;Every cookie we bake is 100% ZERO MAIDHA — made with pure
            oats, no compromises. That&apos;s the Crispo promise.&rdquo;
          </p>
          <div className="flex items-center gap-2 text-muted text-sm mt-6">
            <MapPin size={16} className="text-gold" />
            Nellore, Andhra Pradesh
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="container-tight">
          <div className="surface-card rounded-[2.5rem] p-14 text-center bg-gradient-to-br from-royal to-plum relative overflow-hidden">
            <div className="absolute top-10 right-[15%] w-56 h-56 rounded-full bg-gold/10 blur-3xl" />
            <div className="relative z-10">
              <h2 className="font-heading text-4xl lg:text-section text-cream font-bold mb-4">
                Craving Something Crispy?
              </h2>
              <p className="text-cream/70 text-lg mb-8">
                Explore our 100% ZERO MAIDHA cookies and brownies.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/cookies" className="btn-gold">
                  Shop Cookies
                </Link>
                <a
                  href="https://wa.me/917569831560"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 border-2 border-cream/40 text-cream hover:bg-cream hover:text-plum font-semibold px-8 py-3.5 rounded-full transition-all duration-300 text-sm tracking-wider uppercase"
                >
                  <MessageCircle size={16} />
                  Order on WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}