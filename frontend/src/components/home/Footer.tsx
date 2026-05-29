import { Twitter, Facebook, Linkedin, ArrowUp, Phone, Mail, MapPin, GraduationCap } from "lucide-react";

const Footer = () => {
  return (
    <footer className="pt-20 pb-10 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Brand */}
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                  Vhembe Rising Star Academy
                </span>
                <p className="text-[10px] text-gray-500 -mt-0.5">Learning Without Limits</p>
              </div>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed text-sm">
              South Africa's most modern e-learning platform. Live classes, video lessons, AI tutor, and everything your school needs — built for Limpopo, trusted nationwide.
            </p>
            <div className="flex space-x-3">
              {[Twitter, Facebook, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-9 h-9 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 flex items-center justify-center hover:bg-red-500 hover:text-white hover:border-red-500 transition-all text-gray-500 dark:text-gray-400 shadow-sm">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* For Students */}
          <div>
            <h4 className="text-gray-900 dark:text-white font-bold mb-5 text-sm uppercase tracking-wider">For Students</h4>
            <ul className="space-y-3">
              {["Live Classes", "Video Library", "AI Study Buddy", "Homework Checker", "Study Groups", "Past Papers"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors text-sm">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* For Schools */}
          <div>
            <h4 className="text-gray-900 dark:text-white font-bold mb-5 text-sm uppercase tracking-wider">For Schools</h4>
            <ul className="space-y-3">
              {["School Management", "Teacher Tools", "CAPS Curriculum", "Exam Generator", "Analytics", "Pricing"].map((item) => (
                <li key={item}>
                  <a href="#" className="text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors text-sm">{item}</a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-gray-900 dark:text-white font-bold mb-5 text-sm uppercase tracking-wider">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-600 dark:text-gray-400 text-sm">
                <MapPin className="w-4 h-4 mt-0.5 text-red-500 shrink-0" />
                <span>Limpopo, South Africa</span>
              </li>
              <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
                <Phone className="w-4 h-4 text-red-500 shrink-0" />
                <span>+27 15 123 4567</span>
              </li>
              <li className="flex items-center gap-3 text-gray-600 dark:text-gray-400 text-sm">
                <Mail className="w-4 h-4 text-red-500 shrink-0" />
                <span>hello@edunexus.africa</span>
              </li>
            </ul>
            <div className="mt-5 flex">
              <input type="email" placeholder="Your email" className="bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 rounded-l-lg px-4 py-2.5 text-sm w-full focus:outline-none focus:border-red-500" />
              <button className="bg-red-500 text-white px-4 py-2.5 rounded-r-lg font-bold hover:bg-red-600 transition-colors text-sm shrink-0">
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 pt-8 flex flex-col md:flex-row items-center justify-between text-sm text-gray-500 gap-4">
          <p>&copy; {new Date().getFullYear()} Vhembe Rising Star Academy. Proudly South African. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">POPIA</a>
            <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms</a>
          </div>
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="p-2.5 rounded-lg bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 hover:border-red-500 transition-all group shadow-sm">
            <ArrowUp className="w-4 h-4 group-hover:text-red-500 text-gray-400" />
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
