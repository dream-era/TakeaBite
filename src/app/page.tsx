import Navbar from "@/components/navbar";
import HeroSection from "@/components/hero-section";
import HowItWorks from "@/components/how-it-works";
import FeaturesGrid from "@/components/features-grid";
import Footer from "@/components/footer";

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
