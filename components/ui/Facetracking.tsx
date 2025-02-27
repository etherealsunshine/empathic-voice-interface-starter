"use client";
import { useEffect, useRef, useState } from "react";
import { VideoRecorder } from "@/utils/VideoRecorder";
import { blobToBase64 } from "@/utils/blobutilities";
import { cn } from "@/utils";
import Expressions from "../Expressions";
import { Progress } from "./progress";
import { Timer } from "./timer";
import { Badge } from "./badge";
type TrackedFace = {
  boundingBox: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
};

export default function FaceTracking() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const photoRef = useRef<HTMLCanvasElement>(null);
  const recorderRef = useRef<VideoRecorder | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const mountRef = useRef(true);
  const recorderCreated = useRef(false);
  const numReconnects = useRef(0);
  const [trackedFaces, setTrackedFaces] = useState<TrackedFace[]>([]);
  const [emotions, setEmotions] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<string>("");
  const maxReconnects = 3;
  const [isCallStarted, setIsCallStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const totalQuestions = 5;

  useEffect(() => {
    console.log("Mounting component");
    mountRef.current = true;

    return () => {
      console.log("Tearing down component");
      stopEverything();
    };
  }, []);

  useEffect(() => {
    if (isCallStarted) {
      console.log("Connecting to server");
      connect();
    }
  }, [isCallStarted]);

  async function connect() {
    try {
      const existingSocket = socketRef.current;
      if (existingSocket && existingSocket.readyState === WebSocket.OPEN) {
        console.log("Socket already exists, will not create");
        return;
      }

      // Get the API key from your backend
      const response = await fetch('/api/hume/token');
      if (!response.ok) {
        throw new Error('Failed to get API key');
      }
      const { accessToken } = await response.json();

      console.log("Connecting to websocket...");
      setStatus("Connecting to server...");

      // Make sure we're using the correct WebSocket URL
      const wsUrl = `wss://api.hume.ai/v0/stream/models?apikey=${accessToken}`;
      console.log("Connecting to:", wsUrl);
      
      const newSocket = new WebSocket(wsUrl);
      
      // Add a small delay before setting up event handlers
      await new Promise(resolve => setTimeout(resolve, 100));
      
      newSocket.onopen = socketOnOpen;
      newSocket.onmessage = socketOnMessage;
      newSocket.onclose = socketOnClose;
      newSocket.onerror = socketOnError;

      socketRef.current = newSocket;
    } catch (error) {
      console.error("Failed to connect:", error);
      setStatus("Failed to connect to server");
    }
  }

  async function socketOnOpen() {
    console.log("Connected to websocket");
    setStatus("Connecting to webcam...");
    if (recorderRef.current) {
      console.log("Video recorder found, will use open socket");
      await capturePhoto();
    } else {
      console.warn("No video recorder exists yet to use with the open socket");
    }
  }

  async function socketOnMessage(event: MessageEvent) {
    setStatus("");
    const response = JSON.parse(event.data);
    console.log("Got response", response);
    
    if (response.error) {
      setStatus(response.error);
      console.error(response.error);
      stopEverything();
      return;
    }

    const predictions = response.face?.predictions || [];
    const warning = response.face?.warning || "";

    if (predictions.length === 0) {
      setStatus(warning.replace(".", ""));
      setEmotions({});
    }

    if (predictions.length > 0) {
      const newTrackedFaces: TrackedFace[] = predictions.map((pred: any) => ({
        boundingBox: pred.bbox
      }));
      setTrackedFaces(newTrackedFaces);
      
      if (predictions[0].emotions) {
        const emotionScores: Record<string, number> = {};
        predictions[0].emotions.forEach((emotion: { name: string; score: number }) => {
          emotionScores[emotion.name] = emotion.score;
        });
        setEmotions(emotionScores);
      }
    }

    await capturePhoto();
  }

  async function socketOnClose(event: CloseEvent) {
    console.log("Socket closed");

    if (mountRef.current === true) {
      setStatus("Reconnecting");
      console.log("Component still mounted, will reconnect...");
      connect();
    } else {
      console.log("Component unmounted, will not reconnect...");
    }
  }

  async function socketOnError(event: Event) {
    console.error("Socket failed to connect: ", event);
    if (numReconnects.current >= maxReconnects) {
      setStatus("Failed to connect to the Hume API. Please verify that your API key is correct.");
      stopEverything();
    } else {
      numReconnects.current++;
      console.warn(`Connection attempt ${numReconnects.current}`);
    }
  }

  function stopEverything() {
    console.log("Stopping everything...");
    mountRef.current = false;
    
    if (socketRef.current) {
      console.log("Closing socket");
      socketRef.current.close();
      socketRef.current = null;
    }
    
    if (recorderRef.current) {
      console.log("Stopping recorder");
      recorderRef.current.stopRecording();
      recorderRef.current = null;
    }
  }

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !photoRef.current || recorderCreated.current) return;

    console.log("Creating video recorder");
    recorderCreated.current = true;

    VideoRecorder.create(videoElement, photoRef.current)
      .then((recorder) => {
        recorderRef.current = recorder;
        const socket = socketRef.current;
        if (socket?.readyState === WebSocket.OPEN) {
          console.log("Socket open, will use the new recorder");
          capturePhoto();
        }
      })
      .catch((err) => {
        console.error("Error creating video recorder:", err);
        setStatus("Failed to access camera");
      });
  }, []);

  async function capturePhoto() {
    const recorder = recorderRef.current;
    const socket = socketRef.current;

    if (!recorder || !socket) {
      console.error("No recorder or socket found");
      return;
    }

    try {
      const photoBlob = await recorder.takePhoto();
      const base64Data = await blobToBase64(photoBlob);
      
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          data: base64Data,
          models: {
            face: {}
          }
        }));
      } else {
        console.error("Socket connection not open. Will not capture a photo");
        socket.close();
      }
    } catch (error) {
      console.error("Error capturing photo:", error);
    }
  }

  // Automatically connect when component mounts
  useEffect(() => {
    setIsCallStarted(true);
    return () => {
      setIsCallStarted(false);
      stopEverything();
    };
  }, []);

  // Get top 3 emotions
  const topEmotions = Object.entries(emotions)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="flex flex-col w-full">
      {/* Interview Progress */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium">
          Question {currentQuestion + 1} of {totalQuestions}
        </span>
        <div className="w-2/3">
          <Progress value={(currentQuestion / totalQuestions) * 100} />
        </div>
      </div>

      {/* Video Feed */}
      <div className="relative overflow-hidden rounded-lg border border-border bg-black aspect-video mb-4">
        <video
          className="absolute -scale-x-[1] w-full h-full object-cover"
          ref={videoRef}
          autoPlay
          playsInline
        />
        <canvas className="absolute" ref={canvasRef} />
        <canvas className="hidden" ref={photoRef} />
        
        {/* Status Overlay */}
        {status && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            {status}
          </div>
        )}

        {/* Timer & Confidence Score */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          <div className="bg-black/50 text-white px-2 py-1 rounded text-sm">
            {isCallStarted ? formatTime(Date.now()) : "00:00"}
          </div>
        </div>
        
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          <div className="bg-black/50 text-white px-2 py-1 rounded text-sm">
            Confidence: {calculateConfidence(emotions)}%
          </div>
        </div>
      </div>

      {/* Emotions Display - Simple horizontal list of top 3 emotions */}
      <div className="flex gap-8 py-2 text-base">
        {topEmotions.map(([emotion, score], index) => (
          <div key={index} className="flex items-center">
            <span className="font-medium capitalize">{emotion}:</span>
            <span className="ml-2">{score.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper functions
function calculateConfidence(emotions: Record<string, number>): number {
  const positiveEmotions = ['Joy', 'Calmness', 'Confidence'];
  const total = positiveEmotions.reduce((acc, emotion) => {
    return acc + (emotions[emotion] || 0);
  }, 0);
  return Math.round((total / positiveEmotions.length) * 100);
}

function formatTime(time: number): string {
  const minutes = Math.floor(time / 60000);
  const seconds = Math.floor((time % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}