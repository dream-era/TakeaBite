"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/shared/Logo";

const navLinks = [
  {
    label: "Features",
    hasDropdown: true,
    items: [
      { label: "QR Ordering", href: "#features" },
      { label: "Real-time Workflow", href: "#features" },
      { label: "Staff Coordination", href: "#features" },
      { label: "Instant Payments", href: "#features" },
    ],
  },
  { label: "Pricing", href: "/login" },
  {
    label: "Resources",
    hasDropdown: true,
    items: [
      { label: "Documentation", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Help Center", href: "#" },
    ],
  },
  { label: "Company", href: "https://dreamera.vercel.app/" },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  return (
    <nav
      id="navbar"
      className="sticky top-0 z-50 border-b border-neutral-200/80 bg-white/80 backdrop-blur-xl"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link href="/" className="group" id="nav-logo">
          <Logo className="h-8 md:h-10 w-auto transition-transform duration-300 group-hover:scale-105" />
        </Link>

        {/* Desktop Nav */}
        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) =>
            link.hasDropdown ? (
              <div
                key={link.label}
                className="relative"
                onMouseEnter={() => setOpenDropdown(link.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                <button
                  className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                  id={`nav-${link.label.toLowerCase()}`}
                >
                  {link.label}
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      openDropdown === link.label ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {openDropdown === link.label && (
                  <div className="absolute left-0 top-full mt-1 w-52 rounded-xl border border-neutral-200 bg-white p-2 shadow-lg animate-slide-up">
                    {link.items?.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="block rounded-lg px-3 py-2 text-sm text-neutral-600 transition-colors hover:bg-brand-50 hover:text-brand-600"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Link
                key={link.label}
                href={link.href || "#"}
                target={link.label === "Company" ? "_blank" : undefined}
                rel={link.label === "Company" ? "noopener noreferrer" : undefined}
                className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 hover:text-neutral-900"
                id={`nav-${link.label.toLowerCase()}`}
              >
                {link.label}
              </Link>
            )
          )}
        </div>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" asChild id="nav-login">
            <Link href="/login">Login</Link>
          </Button>
          <Button size="sm" asChild id="nav-cta" className="bg-brand-600 hover:bg-brand-700 text-white">
            <Link href="/signup">Start Free Trial</Link>
          </Button>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          className="inline-flex items-center justify-center rounded-lg p-2 text-neutral-600 transition-colors hover:bg-neutral-100 md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          id="nav-mobile-toggle"
          aria-label="Toggle mobile menu"
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-neutral-200 bg-white px-4 pb-4 pt-2 md:hidden animate-slide-up">
          {navLinks.map((link) => (
            <div key={link.label}>
              {link.hasDropdown ? (
                <div>
                  <button
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700"
                    onClick={() =>
                      setOpenDropdown(
                        openDropdown === link.label ? null : link.label
                      )
                    }
                  >
                    {link.label}
                    <ChevronDown
                      className={`h-4 w-4 transition-transform duration-200 ${
                        openDropdown === link.label ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {openDropdown === link.label && (
                    <div className="ml-4 space-y-1">
                      {link.items?.map((item) => (
                        <Link
                          key={item.label}
                          href={item.href}
                          className="block rounded-lg px-3 py-2 text-sm text-neutral-500 hover:text-brand-600"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href={link.href || "#"}
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              )}
            </div>
          ))}
          <div className="mt-3 flex flex-col gap-2 border-t border-neutral-200 pt-3">
            <Button variant="outline" className="w-full" asChild>
              <Link href="/login">Login</Link>
            </Button>
            <Button className="w-full bg-brand-600 hover:bg-brand-700 text-white" asChild>
              <Link href="/signup">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
