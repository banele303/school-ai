import { CheckCircle2, ArrowRight } from "lucide-react";
import { Link } from "react-router";

const plans = [
  {
    name: "Single Subject",
    price: "R 250",
    period: "/ subject",
    tagline: "Choose any single subject and start learning today.",
    color: "border-gray-200 dark:border-gray-800",
    badge: null,
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
    ctaStyle:
      "border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white hover:border-[#dc2626] hover:text-[#dc2626]",
    popular: false,
  },
  {
    name: "Multi-Subject",
    price: "R 200",
    period: "/ subject",
    tagline: "When you take 2 or more subjects.",
    color: "border-[#dc2626]",
    badge: "Quality Education Made Affordable",
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
    ctaStyle:
      "bg-[#dc2626] text-black hover:bg-[#b91c1c] shadow-lg shadow-[#dc2626]/25",
    popular: true,
  },
];

const PricingPreview = () => {
  return (
    <section id="pricing-preview" className="py-28 relative overflow-hidden">
      {/* Subtle background blobs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#dc2626]/[0.03] blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#dc2626]/10 border border-[#dc2626]/20 text-[#dc2626] text-xs font-bold uppercase tracking-widest">
            Pricing
          </span>
          <h2 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">
            Simple, Transparent{" "}
            <span className="text-[#dc2626]">Pricing</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto text-lg">
            No hidden fees. No lock-in contracts. Cancel anytime. All plans
            include free onboarding support.
          </p>


        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 max-w-4xl mx-auto gap-8 items-stretch">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative flex flex-col bg-white dark:bg-[#1a1a1a] border-2 ${plan.color} rounded-3xl p-8 transition-all duration-300 ${
                plan.popular
                  ? "shadow-2xl shadow-[#dc2626]/10 scale-[1.02]"
                  : "hover:border-[#dc2626]/40 hover:shadow-xl"
              }`}
            >
              {/* Popular badge */}
              {plan.badge && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="bg-[#dc2626] text-black text-xs font-black px-5 py-1.5 rounded-full shadow-lg shadow-[#dc2626]/30 uppercase tracking-wider">
                    {plan.badge}
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                  {plan.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  {plan.tagline}
                </p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-gray-900 dark:text-white">
                    {plan.price}
                  </span>
                  {plan.period && (
                    <span className="text-gray-500 text-sm">{plan.period}</span>
                  )}
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-100 dark:bg-gray-800 mb-6" />

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-600 dark:text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#dc2626] shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                to={plan.name === "District" ? "/contact" : "/login"}
                className={`w-full py-3.5 rounded-xl font-bold text-center text-sm transition-all duration-200 flex items-center justify-center gap-2 group ${plan.ctaStyle}`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-sm text-gray-400 dark:text-gray-600 mt-10">
          All plans include a{" "}
          <span className="text-[#dc2626] font-semibold">30-day free trial</span>{" "}
          — no credit card required.{" "}
          <Link to="/pricing" className="text-[#dc2626] hover:underline font-semibold">
            See full feature comparison →
          </Link>
        </p>
      </div>
    </section>
  );
};

export default PricingPreview;
