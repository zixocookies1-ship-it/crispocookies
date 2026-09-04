import { Heart, Award, Leaf } from "lucide-react";
import ScrollReveal from "@/components/scroll-reveal";

export const metadata = {
  title: "About",
};

const values = [
  {
    icon: Award,
    label: "Quality",
    description:
      "We never compromise on ingredients. Every cookie is made with real butter, premium flour, and the finest chocolate — because you deserve the best.",
  },
  {
    icon: Leaf,
    label: "Freshness",
    description:
      "Our cookies are baked fresh every single day. No sitting on shelves, no preservatives — just pure, wholesome freshness in every bite.",
  },
  {
    icon: Heart,
    label: "Love",
    description:
      "Every cookie is crafted with passion and care. From our family to yours, we pour love into every batch we bake.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-navy py-20">
        <div className="container-tight text-center">
          <ScrollReveal>
            <p className="text-gold text-xs font-semibold tracking-[0.2em] uppercase mb-4">
              Our Story
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h1 className="font-heading text-5xl text-white font-bold mb-4">
              Baked with Love, Delivered Fresh
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-cream/60 text-lg max-w-xl mx-auto">
              From a small family kitchen to your doorstep, every cookie tells a
              story of passion and quality.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Story Block 1 */}
      <section className="container-tight py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <ScrollReveal direction="left">
            <div className="rounded-3xl aspect-[4/3] bg-gradient-to-br from-gold/15 to-navy/5 flex items-center justify-center">
              <span className="text-[100px] select-none">👨‍🍳</span>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right">
            <div>
              <h2 className="font-heading text-3xl text-navy font-bold mb-4">
                How It All Started
              </h2>
              <p className="text-muted leading-relaxed">
                What started in 2020 as weekend baking experiments in a tiny
                Mumbai kitchen has now become a beloved cookie brand trusted by
                thousands across India. Armed with grandmother&apos;s recipes and
                a commitment to using only the finest ingredients, we set out to
                create cookies that would make people smile with every bite.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Story Block 2 */}
      <section className="container-tight py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <ScrollReveal direction="left" className="order-2 md:order-1">
            <div>
              <h2 className="font-heading text-3xl text-navy font-bold mb-4">
                Our Promise
              </h2>
              <p className="text-muted leading-relaxed">
                We believe that great cookies start with great ingredients.
                That&apos;s why we source only the finest butter, premium
                chocolate, and natural ingredients — never compromising on
                quality. From our family to yours, every batch is baked with
                the same love and care that started it all.
              </p>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right" className="order-1 md:order-2">
            <div className="rounded-3xl aspect-[4/3] bg-gradient-to-br from-gold/10 to-cream flex items-center justify-center">
              <span className="text-[100px] select-none">✨</span>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Values */}
      <section className="container-tight py-20">
        <ScrollReveal>
          <h2 className="section-heading text-center mb-12">Our Values</h2>
        </ScrollReveal>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {values.map((v, i) => (
            <ScrollReveal key={v.label} delay={i * 100}>
              <div className="bg-surface rounded-2xl p-8 shadow-warm text-center">
                <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <v.icon size={26} className="text-gold" />
                </div>
                <h3 className="font-heading text-xl font-semibold text-navy">
                  {v.label}
                </h3>
                <p className="text-muted text-sm mt-2 leading-relaxed">
                  {v.description}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* Founder */}
      <section className="bg-cream-dark py-20">
        <div className="container-tight">
          <ScrollReveal>
            <h2 className="font-heading text-3xl text-navy font-bold text-center mb-12">
              Meet Our Founder
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="max-w-2xl mx-auto bg-surface rounded-3xl shadow-warm-lg p-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold to-navy flex items-center justify-center text-4xl mb-4">
                👩‍🍳
              </div>
              <h3 className="font-heading text-2xl font-bold text-navy">
                Meera Kapoor
              </h3>
              <p className="text-gold text-sm font-semibold">Founder & Head Baker</p>
              <p className="font-heading italic text-muted text-lg mt-4 max-w-md">
                &ldquo;Every cookie we bake carries a piece of our
                grandmother&apos;s legacy. That&apos;s the Crispo
                promise.&rdquo;
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
