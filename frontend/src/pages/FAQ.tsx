import { useState } from "react";
import { Link } from "react-router";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { ChevronDown, ChevronUp, Search, MessageCircle } from "lucide-react";

const faqs = [
  {
    category: "Getting Started",
    questions: [
      {
        q: "How do I register my school on Vhembe Rising Star Academy?",
        a: "Simply click 'Enrol Now' on our homepage, fill in your school's details, and our onboarding team will set up your account within 2 business days. You'll receive login credentials for your admin account.",
      },
      {
        q: "Is there a free trial?",
        a: "Yes! Our Starter plan is completely free forever for up to 100 learners. For Professional features, we offer a 14-day free trial with full access to all features.",
      },
      {
        q: "What information do I need to get started?",
        a: "You'll need your school's name, EMIS number, contact details, and an admin email address. Our onboarding wizard will guide you through importing learner and teacher data.",
      },
    ],
  },
  {
    category: "Features",
    questions: [
      {
        q: "Does Vhembe Rising Star Academy support the CAPS curriculum?",
        a: "Absolutely. Every feature — from timetabling to assessments to report cards — is designed around the CAPS framework. We cover Grades R through 12 across all subjects.",
      },
      {
        q: "Can parents access the system?",
        a: "Yes. Every plan includes a parent portal where parents can view their child's attendance, grades, assignments, fee balance, and communicate with teachers.",
      },
      {
        q: "What is the AI Study Buddy?",
        a: "The AI Study Chat is our AI-powered study assistant. It uses your school's own curriculum materials to help learners with homework, exam preparation, and concept understanding. It's available in English, isiZulu, Sesotho, and Afrikaans.",
      },
      {
        q: "Can I generate report cards automatically?",
        a: "Yes. Once you've entered assessment marks, Vhembe Rising Star Academy auto-generates CAPS-compliant report cards that can be printed or shared digitally with parents.",
      },
    ],
  },
  {
    category: "Technical",
    questions: [
      {
        q: "Is my data safe? Are you POPIA compliant?",
        a: "Data security is our top priority. All data is stored on servers within South Africa. We are fully POPIA compliant, encrypt all data at rest and in transit, and undergo regular security audits.",
      },
      {
        q: "Does it work on mobile devices?",
        a: "Yes. Vhembe Rising Star Academy is fully responsive and works on smartphones, tablets, and desktops. We also have an offline mode for areas with limited connectivity.",
      },
      {
        q: "Can I import data from my existing system?",
        a: "Yes. We support CSV imports for learner data, teacher data, and historical marks. Our onboarding team can also assist with bulk migrations from other systems.",
      },
      {
        q: "What languages does Vhembe Rising Star Academy support?",
        a: "The platform interface is in English. The AI Study Buddy supports English, isiZulu, Sesotho, Afrikaans, and isiXhosa. We're adding more South African languages regularly.",
      },
    ],
  },
  {
    category: "Billing",
    questions: [
      {
        q: "How does billing work?",
        a: "Professional plans are billed monthly or annually (with a 20% discount). Enterprise plans are billed annually. We accept EFT, credit card, and purchase orders for government schools.",
      },
      {
        q: "Can I cancel anytime?",
        a: "Yes. There are no long-term contracts. You can cancel your Professional plan at any time, and you'll retain access until the end of your billing period.",
      },
      {
        q: "Do you offer discounts for multiple schools?",
        a: "Yes. Schools in the same district or group receive volume discounts. Contact our sales team for custom pricing.",
      },
    ],
  },
];

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const toggle = (key: string) => {
    setOpenIndex(openIndex === key ? null : key);
  };

  const filteredFaqs = faqs
    .map((cat) => ({
      ...cat,
      questions: cat.questions.filter(
        (q) =>
          q.q.toLowerCase().includes(search.toLowerCase()) ||
          q.a.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.questions.length > 0);

  return (
    <div>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 bg-gradient-to-b from-[#dc2626]/10 to-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-block bg-[#dc2626]/10 text-[#dc2626] text-sm font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wider">
              FAQ
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
              Frequently Asked Questions
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
              Everything you need to know about Vhembe Rising Star Academy. Can't find what you're looking for?
              Contact our team directly.
            </p>
            <div className="max-w-xl mx-auto relative">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search questions..."
                className="w-full bg-white dark:bg-[#1c1c1c] border border-gray-200 dark:border-gray-700 rounded-xl pl-12 pr-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]/50"
              />
            </div>
          </div>
        </section>

        {/* FAQ List */}
        <section className="py-20">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            {filteredFaqs.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 mb-4">No questions match your search.</p>
                <Link to="/contact" className="text-[#dc2626] font-bold hover:underline">
                  Contact us instead →
                </Link>
              </div>
            ) : (
              filteredFaqs.map((cat) => (
                <div key={cat.category} className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    {cat.category}
                    <span className="text-sm font-normal text-gray-400">({cat.questions.length})</span>
                  </h2>
                  <div className="space-y-3">
                    {cat.questions.map((item, idx) => {
                      const key = `${cat.category}-${idx}`;
                      const isOpen = openIndex === key;
                      return (
                        <div
                          key={key}
                          className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden"
                        >
                          <button
                            onClick={() => toggle(key)}
                            className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 dark:hover:bg-[#1c1c1c] transition-colors"
                          >
                            <span className="font-medium text-gray-900 dark:text-white pr-4">
                              {item.q}
                            </span>
                            {isOpen ? (
                              <ChevronUp className="w-5 h-5 text-[#dc2626] shrink-0" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
                            )}
                          </button>
                          {isOpen && (
                            <div className="px-5 pb-5 text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-800 pt-4">
                              {item.a}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Still have questions */}
        <section className="py-16 bg-gray-50 dark:bg-[#1c1c1c]">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <MessageCircle className="w-12 h-12 text-[#dc2626] mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Still have questions?
            </h2>
            <p className="text-gray-500 mb-6">
              Our team is here to help. Reach out and we'll get back to you within 24 hours.
            </p>
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 bg-[#dc2626] text-black px-6 py-3 rounded-xl font-bold hover:bg-[#b91c1c] transition-all"
            >
              Contact Us
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default FAQ;
