import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/AuthProvider";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff, 
  Send, Users, MessageSquare, Settings, Volume2, VolumeX, 
  Sparkles, Clock, ArrowLeft, AlertCircle, Wifi, Play, CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// HLS.js for fallback HLS streaming in browsers that don't support native HLS playback
import Hls from "hls.js";

export default function LiveRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Queries
// @ts-ignore
  const classItem = useQuery(api.liveClasses.getLiveClasses, {}).find((c: any) => c._id === id);
// @ts-ignore
  const chatMessages = useQuery(api.liveClasses.getLiveChatMessages, { liveClassId: id as any }) || [];
// @ts-ignore
  const raisedHands = useQuery(api.liveClasses.getRaisedHands, { liveClassId: id as any }) || [];

  // Mutations
// @ts-ignore
  const sendChatMessage = useMutation(api.liveClasses.sendLiveChatMessage);
// @ts-ignore
  const toggleRaiseHand = useMutation(api.liveClasses.toggleRaiseHand);
// @ts-ignore
  const lowerStudentHand = useMutation(api.liveClasses.lowerStudentHand);
// @ts-ignore
  const startNativeLiveClass = useMutation(api.liveClasses.startNativeLiveClass);
  const updateStatus = useMutation(api.liveClasses.updateLiveClassStatus);

  // States
  const [activeTab, setActiveTab] = useState<"chat" | "interactions">("chat");
  const [chatInput, setChatInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [playerVolume, setPlayerVolume] = useState(0.8);
  const [streamActive, setStreamActive] = useState(false);
  const [latencyMode, setLatencyMode] = useState<"webrtc" | "hls">("webrtc");
  const [showSettings, setShowSettings] = useState(false);
  const [devices, setDevices] = useState<{ video: MediaDeviceInfo[]; audio: MediaDeviceInfo[] }>({ video: [], audio: [] });
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("");

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const whipSessionUrlRef = useRef<string>("");
  const studentPeerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const whepSessionUrlRef = useRef<string>("");
  const prevRaisedCountRef = useRef(0);
  const hlsPlayerRef = useRef<Hls | null>(null);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const myHandRaised = !isTeacher && raisedHands.some((h: any) => h.studentId === user?._id);

  // Web Audio Hand Raise Chime
  const playHandRaiseChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } catch (e) {
      console.warn("AudioContext failed to load", e);
    }
  };

  // Detect new raised hands (for teacher)
  useEffect(() => {
    if (isTeacher && raisedHands.length > prevRaisedCountRef.current) {
      const newestHand = raisedHands[raisedHands.length - 1];
      toast.success(`${newestHand.studentName} raised their hand ✋`, {
        icon: "✋",
      });
      playHandRaiseChime();
    }
    prevRaisedCountRef.current = raisedHands.length;
  }, [raisedHands, isTeacher]);

  // Load AV Devices
  useEffect(() => {
    if (isTeacher) {
      navigator.mediaDevices.enumerateDevices().then((deviceList) => {
        const video = deviceList.filter((d) => d.kind === "videoinput");
        const audio = deviceList.filter((d) => d.kind === "audioinput");
        setDevices({ video, audio });
        if (video.length && !selectedVideoDevice) setSelectedVideoDevice(video[0].deviceId);
        if (audio.length && !selectedAudioDevice) setSelectedAudioDevice(audio[0].deviceId);
      });
    }
  }, [isTeacher, selectedVideoDevice, selectedAudioDevice]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle student playback connection
  useEffect(() => {
    if (!isTeacher && classItem && classItem.status === "live") {
      setStreamActive(true);
      const timer = setTimeout(() => {
        setupStudentPlayer();
      }, 500);
      return () => {
        clearTimeout(timer);
        teardownStudentPlayer();
      };
    } else {
      setStreamActive(false);
      teardownStudentPlayer();
    }
  }, [isTeacher, classItem?.status, latencyMode, classItem?.whepUrl, classItem?.playbackUrl]);

  // Teardown student player
  const teardownStudentPlayer = () => {
    if (whepSessionUrlRef.current) {
      fetch(whepSessionUrlRef.current, { method: "DELETE" }).catch(() => {});
      whepSessionUrlRef.current = "";
    }
    if (studentPeerConnectionRef.current) {
      studentPeerConnectionRef.current.close();
      studentPeerConnectionRef.current = null;
    }
    if (hlsPlayerRef.current) {
      hlsPlayerRef.current.destroy();
      hlsPlayerRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.src = "";
    }
  };

  // Setup Student Video Player (WebRTC WHEP or fallback HLS)
  const setupStudentPlayer = async () => {
    teardownStudentPlayer();
    if (!remoteVideoRef.current || !classItem) return;

    // Direct Simulated/Mock playback handling
    const isMock = classItem.streamInputId?.startsWith("mock_") || !classItem.whipUrl;

    if (isMock) {
      // Use demo loop stream for mocking
      const mockHlsUrl = "https://customer-f3ipa7caxtjh5421.cloudflarestream.com/6b56be0b0a668d6a0a09f3e3e07080f5/manifest/video.m3u8";
      playHls(mockHlsUrl);
      return;
    }

    if (latencyMode === "webrtc" && classItem.whepUrl) {
      try {
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });
        studentPeerConnectionRef.current = pc;

        // In WHEP, we request video & audio tracks
        pc.addTransceiver("video", { direction: "recvonly" });
        pc.addTransceiver("audio", { direction: "recvonly" });

        pc.ontrack = (event) => {
          if (remoteVideoRef.current && event.streams[0]) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Gather ICE
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === "complete") resolve();
          else {
            const checkState = () => {
              if (pc.iceGatheringState === "complete") {
                pc.removeEventListener("icegatheringstatechange", checkState);
                resolve();
              }
            };
            pc.addEventListener("icegatheringstatechange", checkState);
          }
        });

        const finalOffer = pc.localDescription;
        if (!finalOffer) throw new Error("Offer failed");

        const res = await fetch(classItem.whepUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: finalOffer.sdp,
        });

        if (!res.ok) throw new Error("WHEP remote offer failed");

        whepSessionUrlRef.current = res.headers.get("Location") || "";
        const answer = await res.text();
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answer }));
      } catch (err) {
        console.warn("WHEP connection failed, falling back to HLS", err);
        setLatencyMode("hls");
      }
    } else if (classItem.playbackUrl) {
      playHls(classItem.playbackUrl);
    }
  };

  const playHls = (url: string) => {
    const video = remoteVideoRef.current;
    if (!video) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native support (Safari / iOS)
      video.src = url;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 10,
        enableWorker: true
      });
      hlsPlayerRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
    } else {
      toast.error("HLS Live streaming is not supported in this browser.");
    }
  };

  // Start preview (Teacher only)
  const startPreview = async () => {
    try {
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(t => t.stop());
      }

      const constraints = {
        video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      toast.error(`Camera preview error: ${err.message}`);
    }
  };

  // Start Camera preview when device changes
  useEffect(() => {
    if (isTeacher && !isBroadcasting && (selectedVideoDevice || selectedAudioDevice)) {
      startPreview();
    }
    return () => {
      if (isTeacher && !isBroadcasting && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isTeacher, selectedVideoDevice, selectedAudioDevice, isBroadcasting]);

  // Go Live (Teacher)
  const handleGoLive = async () => {
    if (!classItem) return;

    setIsBroadcasting(true);
    try {
      // Check if we have local media tracks
      if (!localStreamRef.current) {
        await startPreview();
      }

      const mediaStream = localStreamRef.current;
      if (!mediaStream) throw new Error("No media stream available");

      // Verify Cloudflare WHIP URL
      const isMock = classItem.streamInputId?.startsWith("mock_") || !classItem.whipUrl;

      if (!isMock && classItem.whipUrl) {
        // Establish WebRTC connection to Cloudflare WHIP
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
        });
        peerConnectionRef.current = pc;

        mediaStream.getTracks().forEach((track) => {
          pc.addTrack(track, mediaStream);
        });

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        // Gather ICE
        await new Promise<void>((resolve) => {
          if (pc.iceGatheringState === "complete") resolve();
          else {
            const checkState = () => {
              if (pc.iceGatheringState === "complete") {
                pc.removeEventListener("icegatheringstatechange", checkState);
                resolve();
              }
            };
            pc.addEventListener("icegatheringstatechange", checkState);
          }
        });

        const finalOffer = pc.localDescription;
        if (!finalOffer) throw new Error("Offer failed");

        const res = await fetch(classItem.whipUrl, {
          method: "POST",
          headers: { "Content-Type": "application/sdp" },
          body: finalOffer.sdp,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Ingest server rejected: ${text}`);
        }

        whipSessionUrlRef.current = res.headers.get("Location") || "";
        const answer = await res.text();
        await pc.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: answer }));
      } else {
        toast.info("Mock Streaming Mode: Direct loopback active.");
      }

      // Update Convex status
      await startNativeLiveClass({
        liveClassId: id as any,
        whipUrl: classItem.whipUrl || "",
        whepUrl: classItem.whepUrl || "",
        playbackUrl: classItem.playbackUrl || "",
        streamInputId: classItem.streamInputId || `mock_${id}`,
      });

      toast.success("You are live! Students are being notified.");
    } catch (err: any) {
      setIsBroadcasting(false);
      toast.error(`Failed to publish stream: ${err.message}`);
    }
  };

  // End Stream (Teacher)
  const handleEndStream = async () => {
    setIsBroadcasting(false);
    try {
      if (whipSessionUrlRef.current) {
        await fetch(whipSessionUrlRef.current, { method: "DELETE" }).catch(() => {});
        whipSessionUrlRef.current = "";
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      await updateStatus({
        liveClassId: id as any,
        status: "ended",
        recordingUrl: classItem?.playbackUrl, // default to live link which Cloudflare automatically transcodes to recording
      });

      toast.success("Stream ended. Class recorded successfully.");
      navigate("/lives");
    } catch (err: any) {
      toast.error(`Error ending stream: ${err.message}`);
    }
  };

  // Toggle local Audio/Video trackers (Teacher)
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  // Share Screen (Teacher)
  const toggleScreenShare = async () => {
    try {
      if (isScreenSharing) {
        // Switch back to webcam
        setIsScreenSharing(false);
        await startPreview();
        if (isBroadcasting) {
          toast.info("Streaming switched to webcam feed. Restart broadcasting.");
          handleEndStream();
        }
      } else {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
        setIsScreenSharing(true);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Handle stop sharing clicked inside browser
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          startPreview();
        };

        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        localStreamRef.current = stream;
        
        if (isBroadcasting) {
          toast.success("Screen sharing stream ready.");
        }
      }
    } catch (err: any) {
      toast.error(`Screen share failed: ${err.message}`);
    }
  };

  // Send message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    try {
      await sendChatMessage({
        liveClassId: id as any,
        content: chatInput.trim(),
      });
      setChatInput("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  // Raise hand (Student)
  const handleRaiseHand = async () => {
    try {
      const res = await toggleRaiseHand({ liveClassId: id as any });
      if (res.raised) {
        toast.success("Hand raised! The teacher has been notified.");
      } else {
        toast.info("Hand lowered.");
      }
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (!classItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-screen bg-zinc-950 text-white">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4 animate-bounce" />
        <h3 className="text-xl font-bold">Classroom Not Found</h3>
        <p className="text-sm text-zinc-400 mt-1">This class may have been deleted or the link is invalid.</p>
        <Button className="mt-6 bg-zinc-800 text-white hover:bg-zinc-700" onClick={() => navigate("/lives")}>
          Back to Live Classes
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      
      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white" onClick={() => navigate("/lives")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">{classItem.title}</h2>
              <Badge variant="outline" className="text-[10px] py-0 border-zinc-800 text-zinc-400 bg-zinc-900/40">
                {classItem.platform === "native" ? "Native Classroom" : classItem.platform}
              </Badge>
            </div>
            <p className="text-[11px] text-zinc-400">Scheduled by Teacher (Real-time Broadcast)</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {classItem.status === "live" ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/50 border border-red-900/30">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              <span className="text-[11px] font-semibold text-red-400 tracking-wider uppercase">Live Now</span>
            </div>
          ) : classItem.status === "ended" ? (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
              <CheckCircle className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-[11px] font-semibold text-zinc-400 tracking-wider uppercase">Class Ended</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/50 border border-blue-900/30">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[11px] font-semibold text-blue-400 tracking-wider uppercase">Scheduled</span>
            </div>
          )}
          
          {isTeacher && (
            <Button
              variant="outline"
              size="icon"
              className={cn("border-zinc-800 text-zinc-400 hover:text-white bg-zinc-900/40", showSettings && "bg-zinc-800 text-white")}
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      {/* ── MAIN WORKSPACE ── */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left Side: Video Stream Arena */}
        <section className="flex-1 flex flex-col bg-zinc-950 p-4 md:p-6 overflow-y-auto min-w-0 justify-center items-center">
          
          <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-900 relative shadow-2xl group">
            
            {/* 1. TEACHER VIEW */}
            {isTeacher && (
              <>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover transform scale-x-[-1]"
                />
                
                {/* Local status labels */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge className="bg-zinc-900/80 backdrop-blur border border-zinc-800 text-zinc-300 font-normal">
                    {isScreenSharing ? "Screen Sharing" : "Camera Feed"}
                  </Badge>
                  {isBroadcasting && (
                    <Badge className="bg-red-600/90 text-white animate-pulse">
                      Broadcasting
                    </Badge>
                  )}
                </div>

                {/* Device controls overlay */}
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-full bg-zinc-900/90 backdrop-blur-md border border-zinc-800 shadow-xl opacity-90 hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-10 w-10 rounded-full", isMuted ? "bg-red-950 text-red-400 hover:bg-red-900" : "text-zinc-300 hover:bg-zinc-800")}
                    onClick={toggleMute}
                  >
                    {isMuted ? <MicOff className="h-4.5 w-4.5" /> : <Mic className="h-4.5 w-4.5" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-10 w-10 rounded-full", isVideoOff ? "bg-red-950 text-red-400 hover:bg-red-900" : "text-zinc-300 hover:bg-zinc-800")}
                    onClick={toggleVideo}
                  >
                    {isVideoOff ? <VideoOff className="h-4.5 w-4.5" /> : <VideoIcon className="h-4.5 w-4.5" />}
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn("h-10 w-10 rounded-full", isScreenSharing ? "bg-red-600 text-white hover:bg-red-700" : "text-zinc-300 hover:bg-zinc-800")}
                    onClick={toggleScreenShare}
                  >
                    <Monitor className="h-4.5 w-4.5" />
                  </Button>

                  <div className="h-6 w-px bg-zinc-800 mx-1" />

                  {isBroadcasting ? (
                    <Button 
                      className="bg-red-600 hover:bg-red-700 text-white rounded-full px-5 py-1.5 h-10 gap-1.5"
                      onClick={handleEndStream}
                    >
                      <PhoneOff className="h-4 w-4" />
                      End Stream
                    </Button>
                  ) : (
                    <Button 
                      className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-5 py-1.5 h-10 gap-1.5 animate-pulse"
                      onClick={handleGoLive}
                    >
                      <Play className="h-4 w-4 fill-current" />
                      Go Live
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* 2. STUDENT VIEW */}
            {!isTeacher && (
              <>
                {streamActive ? (
                  <div className="w-full h-full relative bg-black">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                      muted={isAudioMuted}
                    />

                    {/* Custom student overlays */}
                    <div className="absolute top-4 left-4 flex gap-2">
                      <Badge className="bg-zinc-900/80 backdrop-blur border border-zinc-800 text-zinc-300 font-normal">
                        Stream: {latencyMode === "webrtc" ? "Ultra-Low Latency (WebRTC)" : "Standard Live (HLS)"}
                      </Badge>
                    </div>

                    {/* Custom Player Controls (bottom bar visible on hover) */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950/90 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white hover:bg-white/10"
                          onClick={() => setIsAudioMuted(!isAudioMuted)}
                        >
                          {isAudioMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={isAudioMuted ? 0 : playerVolume}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setPlayerVolume(val);
                            if (remoteVideoRef.current) remoteVideoRef.current.volume = val;
                            if (val > 0 && isAudioMuted) setIsAudioMuted(false);
                          }}
                          className="w-20 h-1 rounded bg-zinc-700 accent-red-600 outline-none cursor-pointer"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {classItem.playbackUrl && (
                          <Button
                            variant="ghost"
                            className="text-xs text-zinc-300 h-8 px-2 hover:bg-white/10 hover:text-white"
                            onClick={() => {
                              setLatencyMode(latencyMode === "webrtc" ? "hls" : "webrtc");
                            }}
                          >
                            Switch to {latencyMode === "webrtc" ? "HLS" : "Low Latency"}
                          </Button>
                        )}
                        <Badge variant="outline" className="text-[10px] border-zinc-800 bg-red-950/20 text-red-500">
                          LIVE
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
                    <div className="w-16 h-16 rounded-full bg-zinc-850 flex items-center justify-center text-zinc-500 mb-4 border border-zinc-800">
                      <Wifi className="h-8 w-8" />
                    </div>
                    {classItem.status === "ended" ? (
                      <>
                        <h4 className="text-lg font-bold text-zinc-300">This class has ended</h4>
                        <p className="text-sm text-zinc-500 max-w-sm text-center mt-1">
                          You can find the recording in the Live Classes directory once it finishes processing.
                        </p>
                      </>
                    ) : (
                      <>
                        <h4 className="text-lg font-bold text-zinc-300">Waiting for teacher to start stream</h4>
                        <p className="text-sm text-zinc-500 max-w-sm text-center mt-1">
                          This class is scheduled. As soon as the teacher starts broadcasting, your player will connect automatically.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Teacher Device Settings Drawer (shows if toggled) */}
          {isTeacher && showSettings && (
            <Card className="w-full max-w-4xl mt-4 bg-zinc-900 border border-zinc-800 text-zinc-200">
              <CardContent className="p-4 grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-zinc-400">Select Camera</Label>
                  <Select value={selectedVideoDevice} onValueChange={setSelectedVideoDevice}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1 h-9">
                      <SelectValue placeholder="Default camera" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                      {devices.video.map((d) => (
                        <SelectItem key={d.deviceId} value={d.deviceId}>{d.label || `Camera ${d.deviceId.slice(0,5)}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Select Microphone</Label>
                  <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1 h-9">
                      <SelectValue placeholder="Default microphone" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                      {devices.audio.map((d) => (
                        <SelectItem key={d.deviceId} value={d.deviceId}>{d.label || `Microphone ${d.deviceId.slice(0,5)}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Student Interact Controls */}
          {!isTeacher && classItem.status === "live" && (
            <div className="w-full max-w-4xl flex items-center justify-between mt-4 px-2">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {raisedHands.length} raised hands
                </span>
              </div>
              <Button
                onClick={handleRaiseHand}
                className={cn(
                  "gap-2 font-medium transition-all duration-300 shadow-lg px-6 rounded-full hover:scale-105 active:scale-95",
                  myHandRaised
                    ? "bg-amber-500 hover:bg-amber-600 text-zinc-950 animate-pulse ring-4 ring-amber-500/20"
                    : "bg-zinc-800 hover:bg-zinc-700 text-white"
                )}
              >
                <span>✋</span>
                {myHandRaised ? "Lower Hand" : "Raise Hand"}
              </Button>
            </div>
          )}
        </section>

        {/* Right Side: Interactive Side Panel (Chat / Hands List) */}
        <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-zinc-900 bg-zinc-950/80 backdrop-blur-md flex flex-col overflow-hidden shrink-0">
          
          {/* Tab selectors */}
          <div className="flex border-b border-zinc-900">
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 py-3 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-all",
                activeTab === "chat" 
                  ? "border-red-600 text-white bg-zinc-900/10" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              )}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Chat
              {chatMessages.length > 0 && (
                <span className="bg-zinc-800 text-[10px] text-zinc-300 px-1.5 py-0.5 rounded-full ml-1 font-normal">
                  {chatMessages.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("interactions")}
              className={cn(
                "flex-1 py-3 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-all",
                activeTab === "interactions" 
                  ? "border-red-600 text-white bg-zinc-900/10" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Interactions
              {raisedHands.length > 0 && (
                <span className="bg-amber-500/15 text-[10px] text-amber-500 px-1.5 py-0.5 rounded-full ml-1 font-semibold animate-pulse border border-amber-500/10">
                  {raisedHands.length}
                </span>
              )}
            </button>
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            
            {/* 1. CHAT TAB */}
            {activeTab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 mt-10">
                      <MessageSquare className="h-10 w-10 text-zinc-800 mb-2" />
                      <p className="text-xs text-zinc-500">No messages yet.</p>
                      <p className="text-[10px] text-zinc-650 mt-0.5">Start the conversation by typing below.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg: any) => {
                      const isMe = msg.senderId === user?._id;
                      const isTeacherRole = msg.senderRole === "teacher" || msg.senderRole === "admin";
                      
                      return (
                        <div key={msg._id} className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "items-start")}>
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[10px] text-zinc-400 font-medium">{msg.senderName}</span>
                            {isTeacherRole && (
                              <Badge className="bg-red-600/10 border border-red-500/20 text-[8px] text-red-500 px-1 py-0 leading-none h-3 font-semibold uppercase tracking-wider rounded">
                                Teacher
                              </Badge>
                            )}
                          </div>
                          <div
                            className={cn(
                              "px-3.5 py-2 rounded-2xl text-xs leading-relaxed break-words shadow-sm transition-transform duration-200 scale-95 origin-bottom",
                              isMe
                                ? "bg-red-600 text-white rounded-tr-none hover:bg-red-700"
                                : isTeacherRole
                                ? "bg-zinc-850 border border-red-950/30 text-zinc-100 rounded-tl-none"
                                : "bg-zinc-900 border border-zinc-850 text-zinc-300 rounded-tl-none"
                            )}
                          >
                            {msg.content}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-900 bg-zinc-950 shrink-0 flex gap-2">
                  <Input
                    placeholder="Ask a question..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="bg-zinc-900 border-zinc-800 text-xs text-zinc-200 h-9 rounded-xl focus-visible:ring-1 focus-visible:ring-red-600 focus-visible:ring-offset-0 focus-visible:border-transparent placeholder:text-zinc-600"
                  />
                  <Button type="submit" size="icon" className="h-9 w-9 bg-red-600 hover:bg-red-700 text-white shrink-0 rounded-xl">
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            )}

            {/* 2. INTERACTIONS TAB */}
            {activeTab === "interactions" && (
              <div className="flex-1 overflow-y-auto p-4 flex flex-col h-full">
                
                {/* Raised hands queue */}
                <div className="mb-6 flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <span>✋</span>
                      Raised Hands Queue
                    </h3>
                    {isTeacher && raisedHands.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] text-zinc-500 hover:text-white px-2 py-1 h-auto"
                        onClick={async () => {
                          for (const h of raisedHands) {
                            await lowerStudentHand({ liveClassId: id as any, studentId: h.studentId });
                          }
                          toast.info("Cleared raised hands queue.");
                        }}
                      >
                        Clear All
                      </Button>
                    )}
                  </div>

                  {raisedHands.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-6 border border-dashed border-zinc-900 rounded-xl text-center bg-zinc-900/10 min-h-[140px]">
                      <span className="text-2xl mb-1 text-zinc-650 opacity-60">✋</span>
                      <p className="text-xs text-zinc-500">No hands raised yet</p>
                      <p className="text-[10px] text-zinc-650 mt-0.5">Students can raise hands to ask questions.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {raisedHands.map((hand: any) => (
                        <div
                          key={hand._id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 shadow-sm animate-pulse"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">
                              {hand.studentName.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-xs text-zinc-200 font-medium truncate">{hand.studentName}</span>
                          </div>
                          
                          {isTeacher && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-[10px] text-amber-500"
                              onClick={() => lowerStudentHand({ liveClassId: id as any, studentId: hand.studentId })}
                            >
                              Lower
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional classroom metrics */}
                <div className="mt-auto border-t border-zinc-900 pt-4 shrink-0">
                  <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-900 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Live Status</span>
                      <Badge className={cn("text-[9px] py-0 font-semibold uppercase leading-none h-4", classItem.status === "live" ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-400")}>
                        {classItem.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-zinc-400">
                      <span>Active Interactions</span>
                      <span className="font-semibold text-zinc-200">{raisedHands.length} hands</span>
                    </div>
                    {classItem.maxParticipants && (
                      <div className="flex items-center justify-between text-xs text-zinc-400">
                        <span>Max Capacity</span>
                        <span className="font-semibold text-zinc-200">{classItem.maxParticipants} students</span>
                      </div>
                    )}
                  </div>
                </div>
                
              </div>
            )}

          </div>
        </aside>
      </main>

    </div>
  );
}
