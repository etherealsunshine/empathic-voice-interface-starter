// app/page.tsx
import dynamic from "next/dynamic";

const LandingPage = dynamic(() => import("@/app/landing"), {
  ssr: true,
});

export default function Page() {
  return <LandingPage />;
}