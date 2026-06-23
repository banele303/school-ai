import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/AuthProvider";
import Hls from "hls.js";
import InviteDialog from "./InviteDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff, 
  Send, Users, MessageSquare, Settings, Volume2, VolumeX, 
  Clock, ArrowLeft, AlertCircle, Wifi, Play, CheckCircle, Hand, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LiveRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);

  const liveClasses = useQuery(api.liveClasses.getLiveClasses, {}) || [];
// @ts-ignore generated Convex types update after codegen
  const chatMessages = useQuery(api.liveClasses.getLiveChatMessages, id ? { liveClassId: id as any } : "skip") || [];
// @ts-ignore generated Convex types update after codegen
  const raisedHands = useQuery(api.liveClasses.getRaisedHands, id ? { liveClassId: id as any } : "skip") || [];
  const classItem = liveClasses.find((c: any) => c._id === id);

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
  const sendReaction = useMutation(api.liveClasses.sendReaction);
  const recentReactions = useQuery(api.liveClasses.getRecentReactions, id ? { liveClassId: id as any } : "skip") || [];
  const reactionStats = useQuery(api.liveClasses.getReactionStats, id ? { liveClassId: id as any } : "skip") || { like: 0, love: 0, applause: 0, laugh: 0, surprised: 0 };

  const approvalStatus = useQuery(api.liveClasses.getApprovalStatus, id ? { liveClassId: id as any } : "skip");
  const pendingApprovals = useQuery(api.liveClasses.getPendingApprovals, id ? { liveClassId: id as any } : "skip") || [];
  const requestJoin = useMutation(api.liveClasses.requestJoinClass);
  const approveStudentMutation = useMutation(api.liveClasses.approveStudent);
  
  const joinLiveClassMutation = useMutation(api.liveClasses.joinLiveClass);
  const leaveLiveClassMutation = useMutation(api.liveClasses.leaveLiveClass);
  const evictStudentMutation = useMutation(api.liveClasses.evictStudent);
  const toggleMuteStudentMutation = useMutation(api.liveClasses.toggleMuteStudent);
  const toggleBlockCameraStudentMutation = useMutation(api.liveClasses.toggleBlockCameraStudent);
  // @ts-ignore
  const participants = useQuery(api.liveClasses.getLiveClassParticipants, id ? { liveClassId: id as any } : "skip") || [];

  const myParticipantRecord = participants.find((p: any) => p.studentId === user?._id);
  const myMuteStatus = myParticipantRecord?.isMuted ?? false;
  const myBlockCameraStatus = myParticipantRecord?.isCameraBlocked ?? false;

  // States
  const [activeTab, setActiveTab] = useState<"chat" | "interactions" | "waiting">("chat");
  const [chatInput, setChatInput] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [playerVolume, setPlayerVolume] = useState(0.8);
  const [streamActive, setStreamActive] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [devices, setDevices] = useState<{ video: MediaDeviceInfo[]; audio: MediaDeviceInfo[] }>({ video: [], audio: [] });
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("");
  const [selectedAudioDevice, setSelectedAudioDevice] = useState("");

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const prevRaisedCountRef = useRef(0);
  const hlsPlayerRef = useRef<Hls | null>(null);

  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const isCreator = classItem?.teacher === user?._id || user?.role === "admin";
  const myHandRaised = !isCreator && raisedHands.some((h: any) => h.studentId === user?._id);

  const EMOJI_MAP: Record<string, string> = { like: "👍", love: "❤️", applause: "👏", laugh: "😂", surprised: "😮" };
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: string; type: string; x: number }[]>([]);
  const renderedReactionsRef = useRef<Set<string>>(new Set());

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

  // Mark student attendance when in live room and clean up on exit/unload
  useEffect(() => {
    if (user?.role === "student" && classItem?.status && classItem?.status !== "ended" && classItem?.status !== "cancelled" && approvalStatus?.status === "approved") {
      joinLiveClassMutation({ liveClassId: id as any }).catch(console.error);

      const handleUnload = () => {
        leaveLiveClassMutation({ liveClassId: id as any }).catch(console.error);
      };
      window.addEventListener("beforeunload", handleUnload);

      return () => {
        window.removeEventListener("beforeunload", handleUnload);
        leaveLiveClassMutation({ liveClassId: id as any }).catch(console.error);
      };
    }
  }, [user?.role, classItem?.status, approvalStatus?.status, id]);

  // Detect new raised hands (for creator teacher)
  useEffect(() => {
    if (isCreator && raisedHands.length > prevRaisedCountRef.current) {
      const newestHand = raisedHands[raisedHands.length - 1];
      toast.success(`${newestHand.studentName} raised their hand`);
      playHandRaiseChime();
    }
    prevRaisedCountRef.current = raisedHands.length;
  }, [raisedHands, isCreator]);

  // Listen for recent reactions and trigger floating animation
  useEffect(() => {
    if (recentReactions.length > 0) {
      const newEmojis: any[] = [];
      recentReactions.forEach((reaction: any) => {
        if (!renderedReactionsRef.current.has(reaction._id)) {
          renderedReactionsRef.current.add(reaction._id);
          const x = 15 + Math.random() * 70;
          newEmojis.push({
            id: reaction._id,
            type: reaction.type,
            x,
          });
        }
      });

      if (newEmojis.length > 0) {
        setFloatingEmojis((prev) => [...prev, ...newEmojis]);

        newEmojis.forEach((emoji) => {
          setTimeout(() => {
            setFloatingEmojis((prev) => prev.filter((e) => e.id !== emoji.id));
          }, 2200);
        });
      }
    }
  }, [recentReactions]);

  // Load AV Devices
  useEffect(() => {
    if (isCreator) {
      navigator.mediaDevices.enumerateDevices().then((deviceList) => {
        const video = deviceList.filter((d) => d.kind === "videoinput");
        const audio = deviceList.filter((d) => d.kind === "audioinput");
        setDevices({ video, audio });
        if (video.length && !selectedVideoDevice) setSelectedVideoDevice(video[0].deviceId);
        if (audio.length && !selectedAudioDevice) setSelectedAudioDevice(audio[0].deviceId);
      });
    }
  }, [isCreator, selectedVideoDevice, selectedAudioDevice]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Handle student playback connection
  useEffect(() => {
    if (!isCreator && classItem && classItem.status === "live") {
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
  }, [isCreator, classItem?.status, classItem?.playbackUrl]);

  // Teardown student player
  const teardownStudentPlayer = () => {
    if (hlsPlayerRef.current) {
      hlsPlayerRef.current.destroy();
      hlsPlayerRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.src = "";
    }
  };

  // Setup Student Video Player (Cloudflare HLS playback)
  const setupStudentPlayer = async () => {
    teardownStudentPlayer();
    if (!remoteVideoRef.current || !classItem) return;

    if (classItem.playbackUrl) {
      playHls(classItem.playbackUrl);
      return;
    }

    const fallbackHlsUrl = "https://videodelivery.net/6b56be0b0a668d6a0a09f3e3e07080f5/manifest/video.m3u8";
    playHls(fallbackHlsUrl);
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
    if (isCreator && !isBroadcasting && (selectedVideoDevice || selectedAudioDevice)) {
      startPreview();
    }
    return () => {
      if (isCreator && !isBroadcasting && localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isCreator, selectedVideoDevice, selectedAudioDevice, isBroadcasting]);

  // Go Live (Teacher)
  const handleGoLive = async () => {
    if (!classItem) return;

    setIsBroadcasting(true);
    try {
      if (!localStreamRef.current) {
        await startPreview();
      }

      // Update Convex status
      await startNativeLiveClass({
        liveClassId: id as any,
        rtmpsUrl: classItem.rtmpsUrl || "",
        streamKey: classItem.streamKey || "",
        srtUrl: classItem.srtUrl || "",
        srtStreamId: classItem.srtStreamId || "",
        srtPassphrase: classItem.srtPassphrase || "",
        playbackUrl: classItem.playbackUrl || "",
        streamInputId: classItem.streamInputId || `mock_${id}`,
      });

      if (classItem.rtmpsUrl && classItem.streamKey) {
        toast.success("Class is live. Start sending video from OBS to Cloudflare.");
      } else {
        toast.success("Class is live in classroom fallback mode.");
      }
    } catch (err: any) {
      setIsBroadcasting(false);
      toast.error(`Failed to start class: ${err.message}`);
    }
  };

  // End Stream (Teacher)
  const handleEndStream = async () => {
    setIsBroadcasting(false);
    try {
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

  const handleSendReaction = async (type: string) => {
    try {
      await sendReaction({
        liveClassId: id as any,
        type,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to send reaction");
    }
  };

  if (!classItem) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-950 dark:bg-zinc-950 dark:text-white">
        <AlertCircle className="h-10 w-10 text-red-500 mb-4 animate-bounce" />
        <h3 className="text-xl font-bold">Classroom Not Found</h3>
        <p className="text-sm text-slate-500 mt-1 dark:text-zinc-400">This class may have been deleted or the link is invalid.</p>
        <Button className="mt-6 dark:bg-zinc-100 dark:text-zinc-900" onClick={() => navigate("/lives")}>
          Back to Live Classes
        </Button>
      </div>
    );
  }

  // Waiting Room Logic
  const needsApproval = !isTeacher && approvalStatus?.status !== "approved";

  if (needsApproval) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen bg-slate-50 text-slate-950 dark:bg-zinc-950 dark:text-zinc-100 font-sans overflow-hidden">
        <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white/90 backdrop-blur-md z-10 shrink-0 dark:border-zinc-900 dark:bg-zinc-950/80">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white" onClick={() => navigate("/lives")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h2 className="text-base font-bold tracking-tight">{classItem.title}</h2>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">Live Class Waiting Room</p>
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center p-6">
          <Card className="w-full max-w-md bg-white border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800 shadow-xl rounded-2xl text-center p-8">
            <Clock className="h-16 w-16 mx-auto text-indigo-500 mb-6 animate-pulse" />
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Waiting for Host</h3>
            <p className="text-sm text-slate-500 dark:text-zinc-400 mb-8">
              {approvalStatus?.status === "pending" 
                ? "Your request has been sent. Please wait for the teacher to let you in."
                : approvalStatus?.status === "denied"
                ? "Your request to join this class was denied."
                : "You need permission to join this live class."}
            </p>
            
            {!approvalStatus && (
              <Button 
                className="w-full h-12 text-base font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all active:scale-95"
                onClick={async () => {
                  try {
                    await requestJoin({ liveClassId: classItem._id });
                    toast.success("Join request sent!");
                  } catch (e: any) {
                    toast.error(e.message || "Failed to send request");
                  }
                }}
              >
                Request to Join
              </Button>
            )}
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen bg-slate-50 text-slate-950 dark:bg-zinc-950 dark:text-zinc-100 font-sans overflow-hidden">
      
      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-slate-200 bg-white/90 backdrop-blur-md z-10 shrink-0 dark:border-zinc-900 dark:bg-zinc-950/80">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-slate-500 hover:text-slate-950 dark:text-zinc-400 dark:hover:text-white" onClick={() => navigate("/lives")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight">{classItem.title}</h2>
              <Badge variant="outline" className="text-[10px] py-0 border-slate-200 text-slate-500 bg-slate-100 dark:border-zinc-800 dark:text-zinc-400 dark:bg-zinc-900/40">
                {classItem.platform === "native" ? "Native Classroom" : classItem.platform}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">Scheduled by Teacher (Real-time Broadcast)</p>
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
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 dark:bg-zinc-900 dark:border-zinc-800">
              <CheckCircle className="h-3.5 w-3.5 text-slate-500 dark:text-zinc-400" />
              <span className="text-[11px] font-semibold text-slate-500 tracking-wider uppercase dark:text-zinc-400">Class Ended</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-blue-950/50 border border-blue-900/30">
              <Clock className="h-3.5 w-3.5 text-blue-400" />
              <span className="text-[11px] font-semibold text-blue-400 tracking-wider uppercase">Scheduled</span>
            </div>
          )}
          
          {(user?.role === "teacher" || user?.role === "admin") && (
            <Button
              variant="outline"
              size="icon"
              className="border-slate-200 bg-white text-slate-600 hover:text-slate-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white dark:bg-zinc-900/40"
              onClick={() => setShowInvite(true)}
              title="Invite Students"
            >
              <Users className="h-4 w-4" />
            </Button>
          )}
          
          {isCreator && (
            <Button
              variant="outline"
              size="icon"
              className={cn("border-slate-200 bg-white text-slate-600 hover:text-slate-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-white dark:bg-zinc-900/40", showSettings && "bg-slate-100 text-slate-950 dark:bg-zinc-800 dark:text-white")}
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
        <section className="flex-1 flex flex-col bg-slate-50 p-4 md:p-6 overflow-y-auto min-w-0 justify-center items-center dark:bg-zinc-950">
          
          <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-900 relative shadow-2xl group">
            
            {/* Muted or Camera Blocked Alert overlay */}
            {(myMuteStatus || myBlockCameraStatus) && (
              <div className="absolute top-4 left-4 flex flex-col gap-2 z-35 pointer-events-none max-w-xs md:max-w-sm">
                {myMuteStatus && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-650/90 text-white text-xs font-semibold shadow-lg backdrop-blur border border-red-500/20 animate-pulse">
                    <MicOff className="h-3.5 w-3.5" />
                    <span>Microphone muted by teacher</span>
                  </div>
                )}
                {myBlockCameraStatus && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-650/90 text-white text-xs font-semibold shadow-lg backdrop-blur border border-red-500/20 animate-pulse">
                    <VideoOff className="h-3.5 w-3.5" />
                    <span>Camera blocked by teacher</span>
                  </div>
                )}
              </div>
            )}

            {/* Emojis Floating Overlay */}
            <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
              {floatingEmojis.map((emoji) => (
                <span
                  key={emoji.id}
                  className="absolute bottom-6 text-3xl animate-float-reaction"
                  style={{ left: `${emoji.x}%` }}
                >
                  {EMOJI_MAP[emoji.type] || emoji.type}
                </span>
              ))}
            </div>

            {/* 1. REPLAY OR LIVE/PREVIEW VIEW */}
            {classItem.status === "ended" && classItem.recordingUrl ? (
              <div className="w-full h-full relative bg-black flex items-center justify-center">
                {classItem.recordingUrl.includes("videodelivery.net") || classItem.recordingUrl.includes("iframe.videodelivery.net") ? (
                  <iframe
                    title={classItem.title}
                    src={classItem.recordingUrl.includes("iframe.videodelivery.net") 
                      ? classItem.recordingUrl 
                      : classItem.recordingUrl.replace("videodelivery.net", "iframe.videodelivery.net")}
                    className="w-full h-full aspect-video border-0"
                    allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={classItem.recordingUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            ) : isCreator ? (
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
            ) : (
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
                        Stream: Cloudflare HLS
                      </Badge>
                    </div>

                    {/* Custom Player Controls (bottom bar visible on hover) */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-950/90 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="flex items-center gap-3">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-white hover:bg-white/10 dark:hover:bg-zinc-800"
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



          {/* Creator Device Settings Drawer (shows if toggled) */}
          {isCreator && showSettings && (
            <Card className="w-full max-w-4xl mt-4 bg-white border border-slate-200 text-slate-800 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-200">
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

          {/* Unified Reaction and Student Controls Bar */}
          {classItem.status === "live" && (
            <div className="w-full max-w-4xl flex flex-wrap items-center justify-between mt-4 px-2 gap-4">
              <div className="flex items-center gap-1 bg-white/85 dark:bg-zinc-900/85 backdrop-blur border border-slate-200/50 dark:border-zinc-800/50 p-1.5 rounded-full shadow-sm">
                {Object.entries(EMOJI_MAP).map(([type, emoji]) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-zinc-800 text-lg transition-transform hover:scale-125 active:scale-90"
                    onClick={() => handleSendReaction(type)}
                    title={`React with ${type}`}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 dark:text-zinc-400 flex items-center gap-1 font-medium">
                  <Users className="h-3.5 w-3.5" />
                  {raisedHands.length} raised hands
                </span>
              </div>
            </div>
          )}
        </section>

        {/* Right Side: Interactive Side Panel (Chat / Hands List) */}
        <aside className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-200 bg-white/90 backdrop-blur-md flex flex-col overflow-hidden shrink-0 dark:border-zinc-900 dark:bg-zinc-950/80">
          
          {/* Tab selectors */}
          <div className="flex border-b border-slate-200 dark:border-zinc-900">
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex-1 py-3 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-all",
                activeTab === "chat" 
                  ? "border-red-600 text-slate-950 bg-slate-100 dark:text-white dark:bg-zinc-900/10" 
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-300"
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
                  ? "border-red-600 text-slate-950 bg-slate-100 dark:text-white dark:bg-zinc-900/10" 
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:text-zinc-500 dark:hover:text-zinc-300"
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
            {isTeacher && (
              <button
                className={cn(
                  "flex-1 py-3 text-xs font-semibold tracking-wide transition-colors relative",
                  activeTab === "waiting" 
                    ? "text-indigo-600 dark:text-indigo-400" 
                    : "text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-zinc-200"
                )}
                onClick={() => setActiveTab("waiting")}
              >
                Waiting ({pendingApprovals.length})
                {activeTab === "waiting" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />}
              </button>
            )}
          </div>

          {/* Tab Contents */}
          <div className="flex-1 overflow-hidden relative flex flex-col">
            
            {/* 1. CHAT TAB */}
            {activeTab === "chat" && (
              <>
                <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
                  {chatMessages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 mt-10">
                      <MessageSquare className="h-10 w-10 text-slate-300 mb-2 dark:text-zinc-800" />
                      <p className="text-xs text-slate-500 dark:text-zinc-500">No messages yet.</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 dark:text-zinc-650">Start the conversation by typing below.</p>
                    </div>
                  ) : (
                    chatMessages.map((msg: any) => {
                      const isMe = msg.senderId === user?._id;
                      const isTeacherRole = msg.senderRole === "teacher" || msg.senderRole === "admin";
                      
                      return (
                        <div key={msg._id} className={cn("flex flex-col max-w-[85%]", isMe ? "ml-auto items-end" : "items-start")}>
                          <div className="flex items-center gap-1.5 mb-1 px-1">
                            <span className="text-[10px] text-slate-500 font-medium dark:text-zinc-400">{msg.senderName}</span>
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
                                ? "bg-red-50 border border-red-100 text-slate-800 rounded-tl-none dark:bg-zinc-850 dark:border-red-950/30 dark:text-zinc-100"
                                : "bg-slate-100 border border-slate-200 text-slate-800 rounded-tl-none dark:bg-zinc-900 dark:border-zinc-850 dark:text-zinc-300"
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

                <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-200 bg-white shrink-0 flex gap-2 dark:border-zinc-900 dark:bg-zinc-950">
                  <Input
                    placeholder="Ask a question..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="text-xs h-9 rounded-xl focus-visible:ring-1 focus-visible:ring-red-600 focus-visible:ring-offset-0 focus-visible:border-transparent"
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
                
                {/* Modern Student Hand Raising Card */}
                {!isCreator && (
                  <div className="mb-5 p-4 rounded-2xl border bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900/60 dark:to-zinc-950 border-zinc-200 dark:border-zinc-800/80 shadow-md">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                          {myHandRaised ? "Hand Raised" : "Have a Question?"}
                        </h4>
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                          {myHandRaised 
                            ? "The teacher has been notified. You are in the queue." 
                            : "Raise your hand to let the teacher know you'd like to ask a question."}
                        </p>
                      </div>
                      <Button
                        onClick={handleRaiseHand}
                        className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-lg shrink-0",
                          myHandRaised
                            ? "bg-amber-500 hover:bg-amber-600 text-zinc-950 animate-bounce ring-4 ring-amber-500/30"
                            : "bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 active:scale-95"
                        )}
                        title={myHandRaised ? "Lower Hand" : "Raise Hand"}
                      >
                        <Hand className={cn("h-5 w-5", myHandRaised ? "animate-pulse" : "")} />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Raised hands queue */}
                <div className="mb-6 flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 dark:text-zinc-400">
                      <Hand className="h-3.5 w-3.5" />
                      Raised Hands Queue
                    </h3>
                    {isCreator && raisedHands.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] text-slate-500 hover:text-slate-950 px-2 py-1 h-auto dark:text-zinc-500 dark:hover:text-white"
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
                    <div className="flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50 min-h-[140px] dark:border-zinc-900 dark:bg-zinc-900/10">
                      <Hand className="mb-2 h-7 w-7 text-slate-300 dark:text-zinc-700" />
                      <p className="text-xs text-slate-500 dark:text-zinc-500">No hands raised yet</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 dark:text-zinc-650">Students can raise hands to ask questions.</p>
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
                            <span className="text-xs text-slate-800 font-medium truncate dark:text-zinc-200">{hand.studentName}</span>
                          </div>
                          
                          {isCreator && (
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

                {/* Live Reactions Section */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3 dark:text-zinc-400">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                    Live Class Reactions
                  </h3>
                  
                  {/* Click to React Grid */}
                  <div className="grid grid-cols-5 gap-2 mb-4 bg-slate-50 dark:bg-zinc-900/20 border border-slate-100 dark:border-zinc-900/50 p-2 rounded-xl">
                    {Object.entries(EMOJI_MAP).map(([type, emoji]) => (
                      <Button
                        key={type}
                        variant="ghost"
                        className="h-12 flex flex-col items-center justify-center p-0 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95"
                        onClick={() => handleSendReaction(type)}
                        title={`Send ${type}`}
                      >
                        <span className="text-xl mb-0.5">{emoji}</span>
                        <span className="text-[10px] font-bold text-slate-600 dark:text-zinc-400">
                          {reactionStats[type] || 0}
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Class Participants Section */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-3 dark:text-zinc-400">
                    <Users className="h-3.5 w-3.5" />
                    Students in Class ({participants.length})
                  </h3>
                  {participants.length === 0 ? (
                    <p className="text-xs text-slate-400 dark:text-zinc-550 italic">No students in class yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {participants.map((p: any) => (
                        <div key={p.studentId} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800/80">
                          <span className="text-xs font-medium text-slate-700 dark:text-zinc-300 truncate max-w-[110px]" title={p.name}>{p.name}</span>
                          
                          <div className="flex items-center gap-1 shrink-0">
                            {isCreator ? (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={cn("h-7 w-7 rounded-lg", p.isMuted ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800")}
                                  onClick={async () => {
                                    try {
                                      const res = await toggleMuteStudentMutation({ liveClassId: id as any, studentId: p.studentId });
                                      toast.success(res.isMuted ? `${p.name} muted.` : `${p.name} unmuted.`);
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to toggle mute.");
                                    }
                                  }}
                                  title={p.isMuted ? "Unmute Student" : "Mute Student"}
                                >
                                  {p.isMuted ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className={cn("h-7 w-7 rounded-lg", p.isCameraBlocked ? "text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800")}
                                  onClick={async () => {
                                    try {
                                      const res = await toggleBlockCameraStudentMutation({ liveClassId: id as any, studentId: p.studentId });
                                      toast.success(res.isCameraBlocked ? `${p.name} camera blocked.` : `${p.name} camera unblocked.`);
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to toggle camera block.");
                                    }
                                  }}
                                  title={p.isCameraBlocked ? "Unblock Camera" : "Block Camera"}
                                >
                                  {p.isCameraBlocked ? <VideoOff className="h-3.5 w-3.5" /> : <VideoIcon className="h-3.5 w-3.5" />}
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg"
                                  onClick={async () => {
                                    try {
                                      await evictStudentMutation({ liveClassId: id as any, studentId: p.studentId });
                                      toast.success(`${p.name} evicted from class.`);
                                    } catch (err: any) {
                                      toast.error(err.message || "Failed to evict student.");
                                    }
                                  }}
                                  title="Evict Student"
                                >
                                  <PhoneOff className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            ) : (
                              <div className="flex items-center gap-1.5 px-1">
                                {p.isMuted && <MicOff className="h-3.5 w-3.5 text-red-500 opacity-80" title="Muted" />}
                                {p.isCameraBlocked && <VideoOff className="h-3.5 w-3.5 text-red-500 opacity-80" title="Camera Blocked" />}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional classroom metrics */}
                <div className="mt-auto border-t border-slate-200 pt-4 shrink-0 dark:border-zinc-900">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5 dark:bg-zinc-900/40 dark:border-zinc-900">
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <span>Live Status</span>
                      <Badge className={cn("text-[9px] py-0 font-semibold uppercase leading-none h-4", classItem.status === "live" ? "bg-red-500 text-white" : "bg-zinc-800 text-zinc-400")}>
                        {classItem.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <span>Students in Class</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{participants.length} students</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <span>Active Interactions</span>
                      <span className="font-semibold text-slate-800 dark:text-zinc-200">{raisedHands.length} hands</span>
                    </div>
                    {classItem.maxParticipants && (
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                        <span>Max Capacity</span>
                        <span className="font-semibold text-slate-800 dark:text-zinc-200">{classItem.maxParticipants} students</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* WAITING ROOM TAB (Teacher Only) */}
            {activeTab === "waiting" && isTeacher && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 dark:bg-zinc-950">
                {pendingApprovals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-zinc-600">
                    <Clock className="h-10 w-10 mb-2 opacity-50" />
                    <p className="text-sm font-medium">No pending requests</p>
                  </div>
                ) : (
                  pendingApprovals.map((req: any) => (
                    <div key={req._id} className="flex items-center justify-between p-3 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shadow-sm">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                          {req.studentName.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-zinc-200 truncate">
                          {req.studentName}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200 dark:border-green-900/30 dark:hover:bg-green-900/20"
                          onClick={() => approveStudentMutation({ approvalId: req._id, status: "approved" })}
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 dark:border-red-900/30 dark:hover:bg-red-900/20"
                          onClick={() => approveStudentMutation({ approvalId: req._id, status: "denied" })}
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      {isTeacher && <InviteDialog open={showInvite} onClose={() => setShowInvite(false)} liveClass={classItem} />}
    </div>
  );
}
