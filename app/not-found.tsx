// app/not-found.tsx
"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h1 className="text-6xl font-bold mb-6">404</h1>
      <p className="text-xl mb-8">This page could not be found.</p>
      <Link href="/">
        <Button>
          Return Home
        </Button>
      </Link>
    </div>
  );
}