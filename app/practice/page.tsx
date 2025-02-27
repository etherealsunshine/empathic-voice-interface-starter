// app/practice/page.tsx
import { getHumeAccessToken } from "@/utils/getHumeAccessToken";
import dynamic from "next/dynamic";

// Using dynamic imports to handle browser-only components
const Chat = dynamic(() => import("@/components/Chat"), {
  ssr: false,
});

const FaceTracking = dynamic(() => import("@/components/ui/Facetracking"), {
  ssr: false,
});



export default async function PracticePage() {
  try {
    const accessToken = await getHumeAccessToken();

    if (!accessToken) {
      throw new Error("Failed to get Hume access token");
    }

    return (
      <div className="grow flex flex-col">
        <div className="py-4 px-4 border-b border-border">
          <h1 className="text-2xl font-bold">Behavioral Interview Practice</h1>
          <p className="text-muted-foreground">AI-powered interview prep with real-time expression analysis</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 grow">
          <div className="flex flex-col gap-6">
            <FaceTracking />
            
          </div>
          <div className="h-full flex flex-col">
            <Chat accessToken={accessToken} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in practice page:", error);
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
        <h1 className="text-2xl font-bold mb-4">Unable to load interview practice</h1>
        <p className="text-muted-foreground mb-6">
          There was a problem connecting to the interview service. Please try again later.
        </p>
      </div>
    );
  }
}