import { Link } from "react-router";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { Check, Star, GraduationCap, Building2, School } from "lucide-react";

const plans = [
  {
    name: "Single Subject",
    icon: School,
    price: "R 250",
    period: "/subject",
    desc: "Choose any single subject and start learning today.",
    features: [
      "Access to 1 Subject",
      "Live Classes",
      "Video Library",
      "Study Groups",
      "Homework Checker",
      "Resources Hub",
      "Smart Timetable",
      "Exams & Assessments",
    ],
    cta: "Start Learning",
    popular: false,
  },
  {
    name: "Multi-Subject",
    icon: GraduationCap,
    price: "R 200",
    period: "/subject",
    desc: "When you take 2 or more subjects.",
    features: [
      "Access to 2 or more Subjects",
      "Live Classes",
      "Video Library",
      "Study Groups",
      "Homework Checker",
      "Resources Hub",
      "Smart Timetable",
      "Exams & Assessments",
    ],
    cta: "Get Started",
    popular: true,
  },
];

const Pricing = () => {
  return (
    <div>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 bg-gradient-to-b from-[#dc2626]/10 to-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-block bg-[#dc2626]/10 text-[#dc2626] text-sm font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wider">
              Pricing
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Quality Education Made Affordable!
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Affordable. Accessible. Impactful. Built for modern schools, designed for success.
            </p>
          </div>
        </section>

        {/* Plans */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-8">
              {plans.map((plan) => (
                <div
                  key={plan.name}
                  className={`relative rounded-2xl p-8 border ${
                    plan.popular
                      ? "border-[#dc2626] bg-[#dc2626]/5 shadow-xl scale-105"
                      : "border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1c1c1c]"
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#dc2626] text-black text-xs font-bold px-4 py-1.5 rounded-full flex items-center gap-1">
                      <Star className="w-3 h-3" /> MOST POPULAR
                    </div>
                  )}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-[#dc2626]/10 p-2.5 rounded-xl">
                      <plan.icon className="w-6 h-6 text-[#dc2626]" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{plan.name}</h3>
                  </div>
                  <div className="mb-2">
                    <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
                    <span className="text-gray-500 ml-1">{plan.period}</span>
                  </div>
                  <p className="text-gray-500 text-sm mb-6">{plan.desc}</p>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                        <Check className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/login"
                    className={`block text-center py-3 rounded-xl font-bold transition-all ${
                      plan.popular
                        ? "bg-[#dc2626] text-black hover:bg-[#b91c1c]"
                        : "border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison note */}
        <section className="py-16 bg-gray-50 dark:bg-[#1c1c1c]">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              All plans include
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                "CAPS-aligned curriculum",
                "POPIA compliant",
                "South African hosting",
                "Mobile responsive",
                "Offline mode",
                "DBE report exports",
                "WhatsApp notifications",
                "Free onboarding",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Check className="w-4 h-4 text-[#dc2626] shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Not sure which plan is right?
            </h2>
            <p className="text-gray-500 mb-8">
              Book a free demo and we'll help you choose the best option for your school.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/contact"
                className="bg-[#dc2626] text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#b91c1c] transition-all"
              >
                Book a Demo
              </Link>
              <Link
                to="/faq"
                className="border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                View FAQ
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
