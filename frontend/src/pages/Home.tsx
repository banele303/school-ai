import Navbar from "@/components/home/Navbar";
import Hero from "@/components/home/Hero";
import Stats from "@/components/home/Stats";
import Programs from "@/components/home/Programs";
import Features from "@/components/home/Features";
import HowItWorks from "@/components/home/HowItWorks";
import Testimonials from "@/components/home/Testimonials";
import Blog from "@/components/home/Blog";
import PricingPreview from "@/components/home/PricingPreview";
import Newsletter from "@/components/home/Newsletter";
import FAQPreview from "@/components/home/FAQPreview";
import Footer from "@/components/home/Footer";
import { Link } from "react-router";

const Home = () => {
  return (
    <div className="bg-white dark:bg-[#121212]">
      <Navbar />
      <main className="flex flex-col min-h-screen">
        <Hero />

        {/* Partners / DoE Logos */}
        <section className="py-12 border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0f0f0f]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500 text-sm font-bold uppercase tracking-widest mb-8">
              Trusted by Schools Across South Africa
            </p>
            <div className="flex flex-wrap justify-center items-center gap-12 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                DBE
              </span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                UMALUSI
              </span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                SACE
              </span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                SADTU
              </span>
              <span className="text-2xl font-black text-gray-900 dark:text-white">
                NSC
              </span>
            </div>
          </div>
        </section>

        <HowItWorks />
        <Features />
        <Programs />
        <Stats />
        <Testimonials />
        <PricingPreview />
        <FAQPreview />
        <Blog />
        <Newsletter />

        {/* Call to Action */}
        <section className="py-28 relative overflow-hidden bg-white dark:bg-[#121212]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-3xl">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-600 via-red-500 to-orange-500" />
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-black/10 rounded-full blur-[100px] translate-x-1/2 translate-y-1/2" />
        
        <div className="relative z-10 p-12 md:p-20 text-center">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white mb-6">
            Ready to Transform Learning?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Join thousands of students and hundreds of schools using Vhembe Rising Star Academy to simplify
            administration, improve results, and empower every learner across South Africa.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/login"
              className="bg-white text-red-600 px-10 py-5 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-[1.02] shadow-xl flex items-center justify-center gap-2"
            >
              Start Learning Free
            </Link>
            <Link 
              to="/contact" 
              className="bg-transparent border-2 border-white/30 text-white px-10 py-5 rounded-xl font-bold text-lg hover:bg-white/10 transition-all flex items-center justify-center"
            >
              Book a Demo
            </Link>
          </div>
          <p className="text-sm text-white/60 mt-6 font-medium">No credit card required • Free for students • Schools get 30-day trial</p>
        </div>
      </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Home;
