import {
  LayoutGrid,
  Heart,
  BarChart3,
  MapPin,
  Table,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: LayoutGrid,
    title: "Integrated Inventory",
    description:
      "Seamless digital menus & ordering in means, customers and inventory.",
  },
  {
    icon: Heart,
    title: "Customer Loyalty",
    description:
      "Customer loyalty to circular customer like researches, and reward.",
  },
  {
    icon: BarChart3,
    title: "Advanced Analytics",
    description:
      "Secure, fast payment integration and data in advanced analytics.",
  },
  {
    icon: MapPin,
    title: "Multi-location Management",
    description:
      "Empower operations, multi, location, maintenance and management.",
  },
  {
    icon: Table,
    title: "Table Management",
    description:
      "Empower order management to tables for table management.",
  },
  {
    icon: Globe,
    title: "Online Presence",
    description:
      "Empower teams with real-time alerts to access in our website.",
  },
];

export default function FeaturesGrid() {
  return (
    <section id="features" className="bg-white py-16 sm:py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold tracking-wider text-brand-600 uppercase">
            Features
          </span>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            Powerful Features for Modern Businesses
          </h2>
        </div>

        {/* Features grid */}
        <div className="mx-auto mt-12 grid max-w-5xl gap-5 sm:mt-16 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className="feature-card group"
              id={`feature-card-${i}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              {/* Icon */}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 transition-colors duration-300 group-hover:bg-brand-100">
                <feature.icon className="h-6 w-6 text-brand-600" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-neutral-900">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-neutral-500">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
