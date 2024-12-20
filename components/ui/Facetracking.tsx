"use client";
import { useEffect, useRef, useState } from "react";
import { VideoRecorder } from "@/utils/VideoRecorder";
import { blobToBase64 } from "@/utils/blobutilities";
import { cn } from "@/utils";
import Expressions from "../Expressions";

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

  function handleStartCall() {
    setIsCallStarted(true);
  }

  function handleEndCall() {
    setIsCallStarted(false);
    stopEverything();
  }

  return (
    <div className="flex flex-col w-[500px]">
      <div className="relative h-[375px] overflow-hidden rounded-lg border border-border bg-black">
        <video
          className="absolute -scale-x-[1]"
          ref={videoRef}
          autoPlay
          playsInline
        />
        <canvas className="absolute" ref={canvasRef} />
        <canvas className="hidden" ref={photoRef} />
        {status && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            {status}
          </div>
        )}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center">
          {!isCallStarted ? (
            <button
              onClick={handleStartCall}
              className="rounded-full bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
            >
              Start Call
            </button>
          ) : (
            <button
              onClick={handleEndCall}
              className="rounded-full bg-red-500 px-4 py-2 text-white hover:bg-red-600"
            >
              End Call
            </button>
          )}
        </div>
      </div>
      <Expressions values={emotions} />
    </div>
  );
}