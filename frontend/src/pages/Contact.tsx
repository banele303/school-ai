import { useState } from "react";
import { Link } from "react-router";
import Navbar from "@/components/home/Navbar";
import Footer from "@/components/home/Footer";
import { Mail, Phone, MapPin, Send, MessageSquare, Clock } from "lucide-react";
import { toast } from "sonner";

const Contact = () => {
  const [form, setForm] = useState({ name: "", email: "", school: "", role: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error("Please fill in all required fields.");
      return;
    }
    setSending(true);
    // Simulate sending — in production this would call an API
    await new Promise((r) => setTimeout(r, 1500));
    setSending(false);
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setForm({ name: "", email: "", school: "", role: "", message: "" });
  };

  return (
    <div>
      <Navbar />
      <main>
        {/* Hero */}
        <section className="relative pt-32 pb-20 bg-gradient-to-b from-[#dc2626]/10 to-background">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <div className="inline-block bg-[#dc2626]/10 text-[#dc2626] text-sm font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-wider">
                Contact Us
              </div>
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
                Let's Start a Conversation
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400">
                Whether you're a school principal, district official, or parent — we'd love to
                hear from you. Our team typically responds within 24 hours.
              </p>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-3 gap-12">
              {/* Contact Info */}
              <div className="space-y-8">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Get in Touch</h3>
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="bg-[#dc2626]/10 p-3 rounded-xl shrink-0">
                        <MapPin className="w-5 h-5 text-[#dc2626]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Head Office</p>
                        <p className="text-gray-500 text-sm">123 Ubuntu Street, Johannesburg, Gauteng, 2000</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="bg-[#dc2626]/10 p-3 rounded-xl shrink-0">
                        <Phone className="w-5 h-5 text-[#dc2626]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Phone & WhatsApp</p>
                        <p className="text-gray-500 text-sm">067 653 0791</p>
                        <p className="text-gray-500 text-sm">Mon–Fri, 8am–5pm SAST</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="bg-[#dc2626]/10 p-3 rounded-xl shrink-0">
                        <Mail className="w-5 h-5 text-[#dc2626]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Email</p>
                        <p className="text-gray-500 text-sm">info@vhembersa.com</p>
                        <p className="text-gray-500 text-sm">vhembersa.com</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="bg-[#dc2626]/10 p-3 rounded-xl shrink-0">
                        <Clock className="w-5 h-5 text-[#dc2626]" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Response Time</p>
                        <p className="text-gray-500 text-sm">Within 24 hours on business days</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-[#1c1c1c] rounded-2xl p-6 border border-gray-200 dark:border-gray-800">
                  <h4 className="font-bold text-gray-900 dark:text-white mb-3">Enterprise & Government</h4>
                  <p className="text-sm text-gray-500 mb-4">
                    For district-wide deployments, SITA procurement, or government partnerships:
                  </p>
                  <p className="text-sm font-medium text-[#dc2626]">enterprise@Vhembe Rising Star Academy.co.za</p>
                </div>
              </div>

              {/* Contact Form */}
              <div className="md:col-span-2">
                <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl p-8 border border-gray-200 dark:border-gray-800 shadow-sm">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-[#dc2626]" />
                    Send Us a Message
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={form.name}
                          onChange={(e) => setForm({ ...form, name: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]/50"
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Email <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm({ ...form, email: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]/50"
                          placeholder="you@school.co.za"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          School / Organisation
                        </label>
                        <input
                          type="text"
                          value={form.school}
                          onChange={(e) => setForm({ ...form, school: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]/50"
                          placeholder="School name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                          Your Role
                        </label>
                        <select
                          value={form.role}
                          onChange={(e) => setForm({ ...form, role: e.target.value })}
                          className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]/50"
                        >
                          <option value="">Select role...</option>
                          <option value="principal">Principal / Headmaster</option>
                          <option value="teacher">Teacher / Educator</option>
                          <option value="admin">School Administrator</option>
                          <option value="district">District Official</option>
                          <option value="parent">Parent</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        Message <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={5}
                        value={form.message}
                        onChange={(e) => setForm({ ...form, message: e.target.value })}
                        className="w-full bg-gray-50 dark:bg-[#121212] border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#dc2626]/50 resize-none"
                        placeholder="Tell us about your school and how we can help..."
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={sending}
                      className="w-full bg-[#dc2626] text-black px-6 py-4 rounded-xl font-bold text-lg hover:bg-[#b91c1c] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {sending ? (
                        <>Sending...</>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          Send Message
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Teaser */}
        <section className="py-16 bg-gray-50 dark:bg-[#1c1c1c]">
          <div className="max-w-4xl mx-auto px-4 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-gray-500 mb-6">
              Have a quick question? Check out our FAQ page for instant answers.
            </p>
            <Link
              to="/faq"
              className="inline-flex items-center gap-2 text-[#dc2626] font-bold hover:underline"
            >
              Visit FAQ Page →
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
};

export default Contact;
