import Link from "next/link";
import { Utensils, Phone, Mail } from "lucide-react";

const footerSections = [
  {
    title: "TakeaBite",
    links: [
      { label: "TakeaBite Guide", href: "#" },
      { label: "TakeaBite Store", href: "#" },
      { label: "Restaurant Add-ons", href: "#" },
    ],
  },
  {
    title: "Company",
    description: "Dreamera Innovations is building the future of restaurant technology through TakeaBite.",
    links: [],
  },
];

export default function Footer() {
  return (
    <footer id="footer" className="border-t border-neutral-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 transition-transform group-hover:scale-110">
                <Utensils className="h-4 w-4 text-white" />
              </div>
              <span className="text-lg font-bold text-neutral-900">TakeaBite</span>
            </Link>
          </div>

          {/* Link sections */}
          {footerSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-sm font-bold text-neutral-900">{section.title}</h4>
              {section.description ? (
                <p className="mt-3 text-sm text-neutral-500 leading-relaxed max-w-[200px]">{section.description}</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-neutral-500 transition-colors hover:text-brand-600"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Social + Contact */}
          <div>
            <h4 className="text-sm font-bold text-neutral-900">Social</h4>
            <div className="mt-3 flex gap-3">
              {[
                { label: "Facebook", href: "https://www.facebook.com/profile.php?id=61590470259008", path: "M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" },
                { label: "Instagram", href: "https://www.instagram.com/dreamera.innovations?utm_source=qr&igsh=MTFxbjZnYmp4cDRybg==", path: "M16 11.37A4 4 0 1112.63 8 4 4 0 0116 11.37zM17.5 6.5h.01M7.5 2h9A5.5 5.5 0 0122 7.5v9a5.5 5.5 0 01-5.5 5.5h-9A5.5 5.5 0 012 16.5v-9A5.5 5.5 0 017.5 2z" },
                { label: "YouTube", href: "https://youtube.com/@dreamera_innova?si=fD5ROsdBr_Ajz7he", path: "M22.54 6.42a2.78 2.78 0 00-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 00-1.94 2A29 29 0 001 12a29 29 0 00.46 5.58 2.78 2.78 0 001.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 001.94-2A29 29 0 0023 12a29 29 0 00-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z" },
                { label: "X (Twitter)", href: "https://x.com/Dreamera_innova", path: "M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" }
              ].map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-neutral-500 transition-all hover:bg-brand-600 hover:text-white"
                  aria-label={social.label}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d={social.path} />
                  </svg>
                </a>
              ))}
            </div>

            <h4 className="mt-5 text-sm font-bold text-neutral-900">Contact</h4>
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Phone className="h-3.5 w-3.5" />
                9047382788
              </div>
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <Mail className="h-3.5 w-3.5" />
                dreaminnovationsz@gmail.com
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-neutral-200 pt-6 text-center">
          <p className="text-xs text-neutral-600">
            © {new Date().getFullYear()} TakeaBite. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
