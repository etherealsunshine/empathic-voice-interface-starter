"use client";

import { useLayoutEffect, useState } from "react";
import HumeLogo from "./logos/Hume";
import { Button } from "./ui/button";
import { Moon, Sun } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils";

export const Nav = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const pathname = usePathname();

  useLayoutEffect(() => {
    const el = document.documentElement;

    if (el.classList.contains("dark")) {
      setIsDarkMode(true);
    } else {
      setIsDarkMode(false);
    }
  }, []);

  const toggleDark = () => {
    const el = document.documentElement;
    el.classList.toggle("dark");
    setIsDarkMode((prev) => !prev);
  };

  return (
    <div
      className={
        "px-4 py-2 flex items-center h-14 z-50 bg-card border-b border-border"
      }
    >
      <div className="flex items-center">
        <Link href="/">
          <div className="flex items-center gap-2">
            <HumeLogo className={"h-5 w-auto"} />
            <span className="font-bold ml-2">InterviewPrep AI</span>
          </div>
        </Link>
      </div>
      
      <div className="mx-auto flex items-center space-x-6 ml-10">
        <Link href="/" className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/" ? "text-primary" : "text-muted-foreground"
        )}>
          Home
        </Link>
        <Link href="/practice" className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname === "/practice" ? "text-primary" : "text-muted-foreground"
        )}>
          Practice
        </Link>
        <Link href="#features" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
          Features
        </Link>
        <Link href="#" className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary">
          Pricing
        </Link>
      </div>
      
      <div className={"ml-auto flex items-center gap-2"}>
        <Button
          onClick={toggleDark}
          variant={"ghost"}
          size="sm"
          className={"flex items-center gap-1.5"}
        >
          <span>
            {isDarkMode ? (
              <Sun className={"size-4"} />
            ) : (
              <Moon className={"size-4"} />
            )}
          </span>
          <span className="hidden sm:inline">{isDarkMode ? "Light" : "Dark"}</span>
        </Button>
        
        <Link href="/practice">
          <Button size="sm" variant="default">
            Start Practice
          </Button>
        </Link>
      </div>
    </div>
  );
};