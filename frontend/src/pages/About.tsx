import { Link } from "react-router";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { Shield, Heart, Target, Zap } from "lucide-react";

const About = () => {
  const team = [
    { name: "Thabo Mokoena", role: "CEO & Founder", img: "https://picsum.photos/seed/thabo/200/200" },
    { name: "Sarah van der Merwe", role: "CTO", img: "https://picsum.photos/seed/sarah/200/200" },
    { name: "Sipho Ndlovu", role: "Head of Product", img: "https://picsum.photos/seed/sipho/200/200" },
    { name: "Dr. Nomsa Khumalo", role: "Education Advisor", img: "https://picsum.photos/seed/nomsa/200/200" },
  ];

  const values = [
    { icon: Heart, title: "Learner-First", desc: "Every feature is designed to improve learner outcomes and reduce dropout rates in South African schools." },
    { icon: Shield, title: "Data Sovereignty", desc: "All data is stored within South Africa. We are fully POPIA compliant and align with DBE data governance policies." },
    { icon: Zap, title: "Offline-First", desc: "Built for the South African reality — our platform works in low-bandwidth environments and rural schools." },
    { icon: Target, title: "CAPS Aligned", desc: "Every curriculum feature is mapped to the CAPS framework, supporting Grades R through 12." },
  ];

  return (
    <div>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-24 bg-gradient-to-b from-[#dc2626]/10 to-background overflow-hidden">
          <div className="absolute top-20 left-10 w-72 h-72 bg-[#dc2626]/10 rounded-full blur-[120px]" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="max-w-3xl">
              <div className="inline-block bg-[#dc2626]/10 text-[#dc2626] text-sm font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wider">
                About Vhembe Rising Star Academy
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6 leading-tight">
                Empowering South African Schools Since 2017
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 leading-relaxed">
                Vhembe Rising Star Academy was born from a simple observation: South African educators spend
                60% of their time on administration instead of teaching. We're changing that
                — with a platform built specifically for the South African education landscape.
              </p>
            </div>
          </div>
        </section>

        {/* Mission */}
        <section className="py-20 bg-white dark:bg-[#121212]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">Our Mission</h2>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-6">
                  We believe every learner in South Africa deserves access to quality education,
                  supported by modern tools that make teachers' lives easier and school
                  administration seamless.
                </p>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mb-6">
                  From township schools in Limpopo to private academies in Cape Town, Vhembe Rising Star Academy
                  serves over 200 schools across all nine provinces, managing more than 150,000
                  learner records.
                </p>
                <div className="flex gap-8">
                  <div>
                    <p className="text-4xl font-bold text-[#dc2626]">200+</p>
                    <p className="text-sm text-gray-500">Schools</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-[#dc2626]">150K</p>
                    <p className="text-sm text-gray-500">Learners</p>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-[#dc2626]">9</p>
                    <p className="text-sm text-gray-500">Provinces</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {values.map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="bg-gray-50 dark:bg-[#1c1c1c] rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                    <div className="bg-[#dc2626]/10 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-[#dc2626]" />
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white mb-2">{title}</h3>
                    <p className="text-sm text-gray-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">Our Team</h2>
              <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                A passionate group of educators, engineers, and entrepreneurs building the future
                of South African education.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {team.map((member) => (
                <div key={member.name} className="text-center">
                  <img
                    src={member.img}
                    alt={member.name}
                    className="w-28 h-28 rounded-full mx-auto mb-4 object-cover border-4 border-[#dc2626]/20"
                  />
                  <h3 className="font-bold text-gray-900 dark:text-white">{member.name}</h3>
                  <p className="text-sm text-[#dc2626]">{member.role}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 bg-gray-50 dark:bg-[#1c1c1c]">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              Ready to join the Vhembe Rising Star Academy family?
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
              Schedule a demo and see how we can transform your school's administration.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link
                to="/login"
                className="bg-[#dc2626] text-black px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#b91c1c] transition-all"
              >
                Get Started Free
              </Link>
              <Link
                to="/contact"
                className="border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
              >
                Contact Sales
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default About;
