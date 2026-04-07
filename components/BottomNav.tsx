"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Home, Dumbbell, Calendar, Utensils, Ruler } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: Home },
  { href: "/workouts", label: "Workouts", icon: Dumbbell },
  { href: "/nutrition", label: "Nutrition", icon: Utensils },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/measurements", label: "Measure", icon: Ruler },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-800 bg-gray-950/90 backdrop-blur-xl">
      <div className="mx-auto grid max-w-lg grid-cols-5 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((tab) => {
          const isActive = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`touch-active flex flex-col items-center gap-1 rounded-xl px-2 py-2 text-[10px] font-medium transition-all ${
                isActive ? "bg-violet-500/15 text-violet-400" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
