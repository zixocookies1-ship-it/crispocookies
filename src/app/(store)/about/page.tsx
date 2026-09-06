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
      "We never compromise on ingredients. Every cookie is made with 100% pure oats powder, real butter, and premium chocolate — because you deserve the best.",
  },
  {
    icon: Leaf,
    label: "Zero Maida",
    description:
      "100% ZERO MAIDHA — our cookies are made entirely with oats powder, with no refined flour, no artificial flavors, and no preservatives.",
  },
  {
    icon: Heart,
    label: "Handcrafted",
    description:
      "Every cookie is handcrafted with passion and care in Nellore. From our family to yours, we pour love into every batch we bake.",
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-royal py-20">
        <div className="container-tight text-center">
          <ScrollReveal>
            <p className="text-gold text-xs font-semibold tracking-[0.2em] uppercase mb-4">
              Our Story
            </p>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <h1 className="font-heading text-5xl text-white font-bold mb-4">
              Baked to Impress. Baked With Purpose.
            </h1>
          </ScrollReveal>
          <ScrollReveal delay={200}>
            <p className="text-cream/60 text-lg max-w-xl mx-auto">
              From Nellore with love — premium oat-based cookies and brownies, 100% ZERO MAIDHA.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Story Block 1 */}
      <section className="container-tight py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <ScrollReveal direction="left">
            <div className="rounded-3xl aspect-[4/3] bg-gradient-to-br from-gold/15 to-royal/5 flex items-center justify-center">
              <span className="text-[100px] select-none">👨‍🍳</span>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="right">
            <div>
              <h2 className="font-heading text-3xl text-royal font-bold mb-4">
                How It All Started
              </h2>
              <p className="text-muted leading-relaxed">
                What started as a passion project in Nellore has now become a beloved cookie brand. 
                Armed with a commitment to using only 100% pure oats and zero maida, we set out to 
                create cookies and brownies that would make people smile with every bite — without 
                any compromises on health.
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
              <h2 className="font-heading text-3xl text-royal font-bold mb-4">
                Our Promise
              </h2>
              <p className="text-muted leading-relaxed">
                We believe that great cookies start with great ingredients.
                That&apos;s why we use 100% pure oats powder, real butter, and
                premium chocolate — never compromising on quality. Every batch
                is baked with 100% ZERO MAIDHA, no artificial flavors, and no
                preservatives. From Nellore to your doorstep, every CRISPO 
                creation is made to bring a little more joy to your day.
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
                <h3 className="font-heading text-xl font-semibold text-royal">
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
            <h2 className="font-heading text-3xl text-royal font-bold text-center mb-12">
              Meet Our Founder
            </h2>
          </ScrollReveal>
          <ScrollReveal delay={100}>
            <div className="max-w-2xl mx-auto bg-surface rounded-3xl shadow-warm-lg p-10 flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gold to-royal flex items-center justify-center text-4xl mb-4">
                👨‍🍳
              </div>
              <h3 className="font-heading text-2xl font-bold text-royal">
                Rahul
              </h3>
              <p className="text-gold text-sm font-semibold">Founder & Head Baker</p>
              <p className="font-heading italic text-muted text-lg mt-4 max-w-md">
                &ldquo;Every cookie we bake is 100% ZERO MAIDHA — made with 
                pure oats, no compromises. That&apos;s the Crispo promise.&rdquo;
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </>
  );
}
