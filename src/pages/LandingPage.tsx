import React from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { QrCode, Utensils, Smartphone, ShieldCheck, ArrowRight } from "lucide-react";

const LandingPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      {/* Nav */}
      <nav className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-600 p-2 rounded-lg">
            <QrCode className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">Menubox</span>
        </div>
        <div className="flex gap-4">
          <Link to="/admin/login" className="px-4 py-2 text-stone-600 hover:text-stone-900 font-medium">
            Login
          </Link>
          <Link to="/admin/login" className="px-6 py-2 bg-emerald-600 text-white rounded-full font-semibold hover:bg-emerald-700 transition-colors">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <header className="max-w-7xl mx-auto px-4 pt-20 pb-32 text-center">
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-6xl md:text-8xl font-black tracking-tighter mb-6 leading-none"
        >
          YOUR MENU, <br />
          <span className="text-emerald-600">DIGITIZED.</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-xl text-stone-600 max-w-2xl mx-auto mb-10"
        >
          The ultimate QR menu platform for modern restaurants. 
          Fast, beautiful, and fully customizable.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link to="/admin/login" className="inline-flex items-center gap-2 px-8 py-4 bg-stone-900 text-white rounded-full text-lg font-bold hover:bg-stone-800 transition-all group">
            Create Your Menu <ArrowRight className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </motion.div>
      </header>

      {/* Features */}
      <section className="bg-white py-24 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-4 grid md:grid-cols-3 gap-12">
          <div className="space-y-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">Mobile First</h3>
            <p className="text-stone-600 leading-relaxed">
              Optimized for speed and touch. Your customers get a premium experience on any device.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <Utensils className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">Full Branding</h3>
            <p className="text-stone-600 leading-relaxed">
              Upload your logo and choose your colors. Your menu should feel like your restaurant.
            </p>
          </div>
          <div className="space-y-4">
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-bold">Reliable & Fast</h3>
            <p className="text-stone-600 leading-relaxed">
              Built on world-class infrastructure to ensure your menu is always available when customers scan.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-4 py-12 text-center text-stone-500 text-sm">
        <p>© 2026 Menubox. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default LandingPage;
