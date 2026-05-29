import { useState, useEffect } from "react";
import { Menu, X, GraduationCap } from "lucide-react";
import { Link } from "react-router";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? "bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-xl py-3 shadow-lg shadow-black/5" : "bg-transparent py-5"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-500 flex items-center justify-center shadow-lg shadow-red-500/20 group-hover:shadow-red-500/40 transition-shadow">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                Edu<span className="text-red-500">Nexus</span>
              </span>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 -mt-0.5 hidden sm:block">Learning Without Limits</p>
            </div>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-1">
            <NavLink to="/about">About</NavLink>
            <NavLink to="/pricing">Pricing</NavLink>
            <NavLink to="/faq">FAQ</NavLink>
            <NavLink to="/contact">Contact</NavLink>
            <div className="w-px h-6 bg-gray-200 dark:bg-gray-700 mx-2" />
            <Link to="/login" className="text-gray-600 dark:text-gray-300 hover:text-red-500 transition-colors font-medium text-sm">
              Sign In
            </Link>
            <Link to="/login" className="bg-gradient-to-r from-red-600 to-red-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:shadow-lg hover:shadow-red-500/25 transition-all transform hover:scale-[1.02] ml-2">
              Start Free
            </Link>
          </div>

          {/* Mobile button */}
          <button onClick={() => setIsOpen(!isOpen)} className="lg:hidden text-gray-600 dark:text-gray-300">
            {isOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="lg:hidden bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800 px-4 pt-2 pb-6 space-y-3 animate-in slide-in-from-top">
          <MobileNavLink to="/about" onClick={() => setIsOpen(false)}>About</MobileNavLink>
          <MobileNavLink to="/pricing" onClick={() => setIsOpen(false)}>Pricing</MobileNavLink>
          <MobileNavLink to="/faq" onClick={() => setIsOpen(false)}>FAQ</MobileNavLink>
          <MobileNavLink to="/contact" onClick={() => setIsOpen(false)}>Contact</MobileNavLink>
          <div className="pt-3 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-2">
            <Link to="/login" className="text-center text-gray-600 dark:text-gray-300 font-medium py-2">Sign In</Link>
            <Link to="/login" className="text-center bg-gradient-to-r from-red-600 to-red-500 text-white px-5 py-3 rounded-xl font-bold">Start Free</Link>
          </div>
        </div>
      )}
    </nav>
  );
};

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-gray-600 dark:text-gray-300 hover:text-red-500 dark:hover:text-red-400 transition-colors font-medium text-sm px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
      {children}
    </Link>
  );
}

function MobileNavLink({ to, onClick, children }: { to: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link to={to} onClick={onClick} className="block text-gray-600 dark:text-gray-300 hover:text-red-500 text-lg font-medium py-2">
      {children}
    </Link>
  );
}

export default Navbar;
