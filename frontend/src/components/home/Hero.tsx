import { ArrowRight, Play, Video, Sparkles, BookOpen, Users, Star, ChevronRight, Zap } from "lucide-react";
import { Link } from "react-router";

const Hero = () => {
  return (
    <section className="relative pt-28 pb-16 overflow-hidden min-h-[90vh] flex items-center">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-white to-red-50 dark:from-[#0a0a0a] dark:via-[#121212] dark:to-[#1a0a0a]">
        <div className="absolute top-20 right-10 w-[500px] h-[500px] bg-red-500/5 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-20 left-10 w-[400px] h-[400px] bg-amber-500/5 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-500/3 rounded-full blur-[150px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-full text-red-600 dark:text-red-400 text-sm font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
              </span>
              Now Serving Limpopo Schools & Students
            </div>

            <div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400">
                  Vhembe Rising Star
                </span>
                <br />
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-amber-500">
                  Academy
                </span>
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 max-w-xl mt-4 leading-relaxed">
                South Africa's most modern e-learning platform. Live classes, video lessons, AI tutor, and everything your school needs — built for <strong className="text-gray-900 dark:text-white">Limpopo</strong>, trusted by <strong className="text-gray-900 dark:text-white">schools nationwide</strong>.
              </p>
            </div>

            {/* Feature pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { icon: Video, label: "Live Classes", color: "text-red-500" },
                { icon: Sparkles, label: "AI Study Buddy", color: "text-amber-500" },
                { icon: BookOpen, label: "CAPS Aligned", color: "text-green-500" },
                { icon: Zap, label: "Exam Ready", color: "text-purple-500" },
              ].map(({ icon: Icon, label, color }) => (
                <div key={label} className="flex items-center gap-2 bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-gray-800 px-3 py-2 rounded-full text-sm shadow-sm">
                  <Icon className={`h-4 w-4 ${color}`} />
                  <span className="font-medium">{label}</span>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                to="/login"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-red-500/25 transition-all transform hover:scale-[1.02]"
              >
                Start Learning Free
                <ArrowRight className="w-5 h-5" />
              </Link>
              <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white dark:bg-[#1a1a1a] text-gray-900 dark:text-white border-2 border-gray-200 dark:border-gray-700 hover:border-red-500 px-8 py-4 rounded-xl font-bold text-lg transition-all">
                <Play className="w-5 h-5 text-red-500 fill-red-500" />
                Watch Demo
              </button>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-800">
              <div className="flex -space-x-2">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-red-400 to-amber-400 border-2 border-white dark:border-[#121212] flex items-center justify-center text-white text-[10px] font-bold">
                    {String.fromCharCode(64 + i)}
                  </div>
                ))}
                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-[#121212] flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-300">
                  +5k
                </div>
              </div>
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map(i => <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />)}
                <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">4.9/5 from schools</span>
              </div>
            </div>
          </div>

          {/* Right side - Visual */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden border border-gray-200 dark:border-gray-800 shadow-2xl bg-gradient-to-br from-gray-900 to-gray-800 p-8 aspect-[4/3]">
              {/* Mock UI */}
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-amber-500/10" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="flex-1 h-6 bg-white/10 rounded-lg ml-4" />
                </div>

                {/* Live class card mock */}
                <div className="bg-white/10 backdrop-blur rounded-2xl p-6 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Live Now</span>
                  </div>
                  <h3 className="text-white text-xl font-bold">Grade 12 Mathematics</h3>
                  <p className="text-white/60 text-sm">Calculus & Differentiation — Mr. Mabesa</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-white/60 text-xs">
                      <Users className="h-3 w-3" /> 47 students
                    </div>
                    <div className="flex items-center gap-1 text-white/60 text-xs">
                      <Video className="h-3 w-3" /> 45 min
                    </div>
                  </div>
                  <button className="w-full bg-red-500 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
                    <Play className="h-4 w-4 fill-white" /> Join Class Now
                  </button>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Videos", value: "2,400+", color: "from-purple-500/20 to-purple-600/20" },
                    { label: "Live Classes", value: "180+", color: "from-red-500/20 to-red-600/20" },
                    { label: "Past Papers", value: "5,000+", color: "from-green-500/20 to-green-600/20" },
                  ].map(s => (
                    <div key={s.label} className={`bg-gradient-to-br ${s.color} rounded-xl p-3 text-center`}>
                      <p className="text-white font-bold text-lg">{s.value}</p>
                      <p className="text-white/60 text-[10px]">{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating badge */}
            <div className="absolute -bottom-4 -left-4 bg-white dark:bg-[#1a1a1a] p-4 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">AI-Powered</p>
                  <p className="text-sm font-bold">Study Buddy</p>
                </div>
              </div>
            </div>

            <div className="absolute -top-4 -right-4 bg-white dark:bg-[#1a1a1a] p-3 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-xl hidden md:block">
              <div className="flex items-center gap-2">
                <ChevronRight className="h-5 w-5 text-green-500" />
                <span className="text-xs font-bold">CAPS Aligned</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
