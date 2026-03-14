"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Dumbbell, Scale, Camera, ClipboardList } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/log", label: "Log", icon: Scale },
  { href: "/timeline", label: "Timeline", icon: Camera },
  { href: "/programs", label: "Programs", icon: ClipboardList },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-950/80 backdrop-blur-xl border-t border-gray-800">
      <div className="flex items-center justify-around max-w-lg mx-auto px-2 pt-2 pb-[env(safe-area-inset-bottom,8px)]">
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`touch-active flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${
                isActive
                  ? "text-violet-500"
                  : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={`transition-transform duration-200 ${
                    isActive ? "scale-110" : "scale-100"
                  }`}
                />
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
              {/* Active indicator dot */}
              <div
                className={`h-0.5 w-4 rounded-full transition-all duration-200 ${
                  isActive
                    ? "bg-violet-500 opacity-100"
                    : "bg-transparent opacity-0"
                }`}
              />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
