import Image from "next/image";

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-neutral-50 py-16 sm:py-20 lg:py-28"
    >
      {/* Background accents */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-0 h-[300px] w-[300px] rounded-full bg-brand-100/20 blur-3xl" />
        <div className="absolute -right-20 bottom-0 h-[300px] w-[300px] rounded-full bg-orange-100/20 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Showcase image — replaces device mockups with the actual design asset */}
        <div className="relative mx-auto max-w-6xl">
          <Image
            src="/images/how-it-works-showcase.png"
            alt="Effortless Business Digitization — TakeaBite dashboard views across tablet, desktop, and mobile showing menu management, order tracking, and sales reporting"
            width={1920}
            height={960}
            className="h-auto w-full"
            priority
            quality={90}
          />
        </div>
      </div>
    </section>
  );
}
