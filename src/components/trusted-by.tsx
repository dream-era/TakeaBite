export default function TrustedBy() {
  const logos = [
    { name: "Forbes", style: "font-serif font-bold italic" },
    { name: "TechCrunch", style: "font-bold" },
    { name: "WIRED", style: "font-bold tracking-[0.3em] uppercase border border-neutral-800 px-2 py-0.5" },
    { name: "BUSINESS INSIDER", style: "font-bold text-xs tracking-wider uppercase" },
  ];

  return (
    <section id="trusted-by" className="border-y border-neutral-200 bg-white py-10 sm:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="mb-6 text-center text-xs font-semibold tracking-[0.2em] text-neutral-400 uppercase sm:mb-8">
          Trusted by 500+ Businesses
        </p>
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 lg:gap-16">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="flex items-center text-neutral-400 transition-colors duration-300 hover:text-neutral-800"
            >
              <span className={`text-lg sm:text-xl lg:text-2xl ${logo.style}`}>
                {logo.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
