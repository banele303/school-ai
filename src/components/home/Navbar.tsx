import { useState, useEffect } from "react";
import vhembeLogo from "@/assets/vhembe_logo.png";
import { Menu, X, GraduationCap } from "lucide-react";
import { Link } from "react-router";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed w-full z-50 transition-all duration-300 bg-background ${scrolled ? " backdrop-blur-md py-3 shadow-lg" : "bg-transparent py-5"}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
              <img src={vhembeLogo} alt="Vhembe Logo" className="h-8 w-8" />
            <span className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              EDU<span className="text-[#3ecf8e]">NEXUS</span>
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            <Link
              to="/about"
              className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
            >
              About
            </Link>
            <Link
              to="/pricing"
              className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
            >
              Pricing
            </Link>
            <a
              href="#programs"
              className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
            >
              Subjects
            </a>
            <a
              href="#stats"
              className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
            >
              Features
            </a>
            <Link
              to="/faq"
              className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
            >
              FAQ
            </Link>
            <Link
              to="/contact"
              className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
            >
              Contact
            </Link>
            <Link
              to="/login"
              className="text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link
              to="/login"
              className="bg-[#3ecf8e] text-black px-5 py-2 rounded-md font-bold hover:bg-[#34b27b] transition-all transform hover:scale-105"
            >
              Enrol Now
            </Link>
          </div>

          {/* Mobile button */}
          <div className="md:hidden flex items-center space-x-4">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-600 dark:text-gray-300"
            >
              {isOpen ? (
                <X className="w-8 h-8" />
              ) : (
                <Menu className="w-8 h-8" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white dark:bg-[#1c1c1c] border-b border-gray-200 dark:border-gray-800 px-4 pt-2 pb-6 space-y-4">
          <Link to="/about" className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium">About</Link>
          <Link to="/pricing" className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium">Pricing</Link>
          <a href="#programs" className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium">Subjects</a>
          <a href="#stats" className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium">Features</a>
          <Link to="/faq" className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium">FAQ</Link>
          <Link to="/contact" className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium">Contact</Link>
          <Link to="/login" className="block text-gray-600 dark:text-gray-300 hover:text-[#3ecf8e] text-lg font-medium">Sign In</Link>
          <Link to="/login" className="block w-full bg-[#3ecf8e] text-black px-5 py-3 rounded-md font-bold text-center">Enrol Now</Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
