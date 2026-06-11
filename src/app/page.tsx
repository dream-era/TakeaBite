import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import HowItWorks from "@/components/how-it-works";
import FeaturesGrid from "@/components/features-grid";
import Footer from "@/components/footer";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "Welcome to TakeaBite. The smartest digital experience for modern restaurants.",
};

export default function Home() {
  return (
    <main id="main-content">
      <Navbar />
      <HeroSection />
      <HowItWorks />
      <FeaturesGrid />
      <Footer />
    </main>
  );
}
