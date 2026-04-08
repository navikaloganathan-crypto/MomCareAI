import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { MessageCircle, LayoutDashboard, FileText, Pill, Menu, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { path: "/", label: "Chat", icon: MessageCircle, description: "Talk to MomCareAI" },
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Health insights" },
  { path: "/report", label: "Report", icon: FileText, description: "Doctor report" },
  { path: "/prescription", label: "Prescription", icon: Pill, description: "Analyze prescriptions" },
];

export default function Layout({ children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="flex h-screen overflow-hidden bg-[#FCFAF8]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 border-r border-[#F4AAB9]/20 bg-white/80 backdrop-blur-md">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5">
          <div className="flex items-center justify-center w-10 h-10 rounded-2xl bg-[#F4AAB9]/20">
            <Heart className="w-5 h-5 text-[#F4AAB9]" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-[#2C2A29]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              MomCareAI
            </h1>
            <p className="text-xs text-[#8A8887]">Your health companion</p>
          </div>
        </div>

        <Separator className="bg-[#F4AAB9]/10" />

        {/* Nav Links */}
        <nav className="flex-1 px-3 py-4 space-y-1" data-testid="sidebar-nav">
          <TooltipProvider>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Tooltip key={item.path}>
                  <TooltipTrigger asChild>
                    <NavLink to={item.path} data-testid={`nav-${item.label.toLowerCase()}`}>
                      <div
                        className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 ${
                          isActive
                            ? "bg-[#F4AAB9]/15 text-[#2C2A29]"
                            : "text-[#5C5A59] hover:bg-[#F4AAB9]/8 hover:text-[#2C2A29]"
                        }`}
                      >
                        <item.icon className={`w-5 h-5 ${isActive ? "text-[#F4AAB9]" : ""}`} strokeWidth={1.5} />
                        <span className="text-sm font-medium">{item.label}</span>
                      </div>
                    </NavLink>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.description}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </nav>

        {/* Bottom */}
        <div className="px-4 py-4">
          <div className="p-4 rounded-2xl bg-[#F4AAB9]/8 border border-[#F4AAB9]/15">
            <p className="text-xs text-[#5C5A59] leading-relaxed">
              Not medical advice. Always consult your doctor for health concerns.
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-md border-b border-[#F4AAB9]/20">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-[#F4AAB9]" strokeWidth={2} />
          <span className="text-lg font-semibold text-[#2C2A29]" style={{ fontFamily: 'Outfit, sans-serif' }}>MomCareAI</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(!mobileOpen)}
          data-testid="mobile-menu-toggle"
          className="hover:bg-[#F4AAB9]/10"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="absolute top-14 right-2 w-56 bg-white rounded-2xl shadow-lg border border-[#F4AAB9]/20 py-2 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileOpen(false)}
                  data-testid={`mobile-nav-${item.label.toLowerCase()}`}
                >
                  <div className={`flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-colors ${
                    isActive ? "bg-[#F4AAB9]/15 text-[#2C2A29]" : "text-[#5C5A59] hover:bg-[#F4AAB9]/8"
                  }`}>
                    <item.icon className={`w-4 h-4 ${isActive ? "text-[#F4AAB9]" : ""}`} strokeWidth={1.5} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-14">
        {children}
      </main>
    </div>
  );
}
