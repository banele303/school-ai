import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/AuthProvider";
import Hls from "hls.js";
import InviteDialog from "./InviteDialog";
import { createStreamLiveInput, getLiveInputRecordings } from "@/lib/cloudflareWorker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff, 
  Send, Users, MessageSquare, Settings, Volume2, VolumeX, 
  Clock, ArrowLeft, AlertCircle, Play, CheckCircle, Hand,
  Presentation, Smile, Subtitles
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function LiveRoomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showInvite, setShowInvite] = useState(false);

  const liveClasses = useQuery(api.liveClasses.getLiveClasses, {});
  const classItem = liveClasses?.find((c: any) => c._id === id || c.roomId === id);
  const targetClassId = classItem?._id;

// @ts-ignore generated Convex types update after codegen
  const chatMessages = useQuery(api.liveClasses.getLiveChatMessages, targetClassId ? { liveClassId: targetClassId as any } : "skip") || [];
// @ts-ignore generated Convex types update after codegen
  const raisedHands = useQuery(api.liveClasses.getRaisedHands, targetClassId ? { liveClassId: targetClassId as any } : "skip") || [];

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
  const recentReactions = useQuery(api.liveClasses.getRecentReactions, targetClassId ? { liveClassId: targetClassId as any } : "skip") || [];
  // getReactionStats query is currently unused in the UI

  const approvalStatus = useQuery(api.liveClasses.getApprovalStatus, targetClassId ? { liveClassId: targetClassId as any } : "skip");
  const pendingApprovals = useQuery(api.liveClasses.getPendingApprovals, targetClassId ? { liveClassId: targetClassId as any } : "skip") || [];
  const requestJoin = useMutation(api.liveClasses.requestJoinClass);
  const approveStudentMutation = useMutation(api.liveClasses.approveStudent);
  
  const joinLiveClassMutation = useMutation(api.liveClasses.joinLiveClass);
  const leaveLiveClassMutation = useMutation(api.liveClasses.leaveLiveClass);
  const evictStudentMutation = useMutation(api.liveClasses.evictStudent);
  const toggleMuteStudentMutation = useMutation(api.liveClasses.toggleMuteStudent);
  const toggleBlockCameraStudentMutation = useMutation(api.liveClasses.toggleBlockCameraStudent);
  // @ts-ignore
  const updateStreamTimestamp = useMutation(api.liveClasses.updateStreamTimestamp);
  // @ts-ignore
  const requestScreenShareMutation = useMutation(api.liveClasses.requestScreenShare);
  // @ts-ignore
  const toggleScreenSharePermissionMutation = useMutation(api.liveClasses.toggleScreenSharePermission);
  // @ts-ignore
  const participants = useQuery(api.liveClasses.getLiveClassParticipants, targetClassId ? { liveClassId: targetClassId as any } : "skip") || [];
  // @ts-ignore
  const sendWebRtcSignal = useMutation(api.liveClasses.sendWebRtcSignal);
  // @ts-ignore
  const clearWebRtcSignals = useMutation(api.liveClasses.clearWebRtcSignals);
  // @ts-ignore
  const webRtcSignals = useQuery(api.liveClasses.getWebRtcSignals, targetClassId ? { liveClassId: targetClassId as any } : "skip") || [];

  const myParticipantRecord = participants.find((p: any) => p.studentId === user?._id);
  const myMuteStatus = (myParticipantRecord as any)?.isMuted ?? false;
  const myBlockCameraStatus = (myParticipantRecord as any)?.isCameraBlocked ?? false;
  const myCanShareScreen = (myParticipantRecord as any)?.canShareScreen ?? false;
  const myRequestedScreenShare = (myParticipantRecord as any)?.requestedScreenShare ?? false;

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
  const [showSidebar, setShowSidebar] = useState(true);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [timeStr, setTimeStr] = useState("");
  const [isCcEnabled, setIsCcEnabled] = useState(false);
  const [showRosterForStudent, setShowRosterForStudent] = useState(false);
  const [resolvedRecordingUrl, setResolvedRecordingUrl] = useState<string | null>(null);
  const [resolvingRecording, setResolvingRecording] = useState(false);
  const [speakingStudents, setSpeakingStudents] = useState<string[]>([]);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const studentStreamRef = useRef<MediaStream | null>(null);
  const studentLocalVideoRef = useRef<HTMLVideoElement>(null);
  const prevRaisedCountRef = useRef(0);
  const hlsPlayerRef = useRef<Hls | null>(null);
  const whipPcRef = useRef<RTCPeerConnection | null>(null);
  const studentPcRef = useRef<RTCPeerConnection | null>(null);
  const whepTimeoutRef = useRef<any>(null);
  const whipResourceUrlRef = useRef<string | null>(null);
  const whepResourceUrlRef = useRef<string | null>(null);

  // Student Microphone WebRTC Audio Signaling Refs
  const studentAudioPcRef = useRef<RTCPeerConnection | null>(null);
  const teacherAudioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
  const teacherPeerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map());

  // Mobile Audio Constraints Helper
  const getMobileAudioConstraints = (selectedDeviceId?: string): MediaTrackConstraints | boolean => {
    const base: MediaTrackConstraints = {
      echoCancellation: { ideal: true },
      noiseSuppression: { ideal: true },
      autoGainControl: { ideal: true },
      channelCount: { ideal: 1 },
      sampleRate: { ideal: 48000 },
    };
    if (selectedDeviceId && selectedDeviceId.trim() !== "") {
      base.deviceId = { exact: selectedDeviceId };
    }
    return base;
  };

  // Mobile Browser AudioContext Gesture Unlocker (iOS Safari / Chrome Mobile)
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const dummyCtx = new AudioCtx();
          if (dummyCtx.state === "suspended") {
            dummyCtx.resume();
          }
        }
      } catch (e) {
        console.warn("AudioContext unlock failed:", e);
      }
    };

    window.addEventListener("touchstart", unlockAudio, { once: true });
    window.addEventListener("click", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("touchstart", unlockAudio);
      window.removeEventListener("click", unlockAudio);
    };
  }, []);

  // Clock state updater
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      let hours = d.getHours();
      const minutes = d.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12;
      hours = hours ? hours : 12;
      setTimeStr(`${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    return () => {
      if (whipPcRef.current) whipPcRef.current.close();
      if (studentPcRef.current) studentPcRef.current.close();
    };
  }, []);

  // Synchronize remote video element mute property and volume with React state
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = isAudioMuted;
      remoteVideoRef.current.volume = playerVolume;
    }
  }, [isAudioMuted, playerVolume]);

  const getRoomCode = () => {
    if (!id) return "";
    const clean = id.replace(/[^a-z0-9]/gi, "").toLowerCase();
    if (clean.length >= 9) {
      return `${clean.slice(0, 3)}-${clean.slice(3, 7)}-${clean.slice(7, 10)}`;
    }
    return id;
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const toggleSidebarTab = (tab: "chat" | "interactions" | "waiting") => {
    if (showSidebar && activeTab === tab) {
      setShowSidebar(false);
    } else {
      setActiveTab(tab);
      setShowSidebar(true);
    }
  };

  const terminateWhipSession = async () => {
    if (whipResourceUrlRef.current) {
      const url = whipResourceUrlRef.current;
      whipResourceUrlRef.current = null;
      try {
        await fetch(url, { method: "DELETE" }).catch(() => {});
        console.log("WHIP session terminated cleanly.");
      } catch (e) {
        console.warn("Failed to delete WHIP session:", e);
      }
    }
  };

  const terminateWhepSession = async () => {
    if (whepResourceUrlRef.current) {
      const url = whepResourceUrlRef.current;
      whepResourceUrlRef.current = null;
      try {
        await fetch(url, { method: "DELETE" }).catch(() => {});
        console.log("WHEP session terminated cleanly.");
      } catch (e) {
        console.warn("Failed to delete WHEP session:", e);
      }
    }
  };

  // WebRTC WHIP publisher (Teacher)
  const publishWhip = async (stream: MediaStream, whipUrl: string) => {
    if (whipPcRef.current) {
      whipPcRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302"
        }
      ]
    });
    whipPcRef.current = pc;

    stream.getTracks().forEach(track => {
      pc.addTrack(track, stream);
    });

    // Prefer H.264 codec for video publishing but keep VP8/VP9 as fallback for screen sharing
    const videoTransceiver = pc.getTransceivers().find(t => t.sender.track?.kind === 'video');
    if (videoTransceiver && typeof RTCRtpSender.getCapabilities === 'function') {
      const capabilities = RTCRtpSender.getCapabilities('video');
      const h264Codecs = capabilities?.codecs.filter(c => c.mimeType.toLowerCase() === 'video/h264') || [];
      const otherCodecs = capabilities?.codecs.filter(c => c.mimeType.toLowerCase() !== 'video/h264') || [];
      if (h264Codecs.length > 0) {
        try {
          videoTransceiver.setCodecPreferences([...h264Codecs, ...otherCodecs]);
        } catch (e) {
          console.warn("Failed to set publish H.264 preferences:", e);
        }
      }
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE candidates
    await new Promise((resolve) => {
      if (pc.iceGatheringState === "complete") {
        resolve(null);
      } else {
        const check = () => {
          if (pc.iceGatheringState === "complete") {
            pc.removeEventListener("icegatheringstatechange", check);
            resolve(null);
          }
        };
        pc.addEventListener("icegatheringstatechange", check);
        setTimeout(resolve, 2000);
      }
    });

    const response = await fetch(whipUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
      },
      body: pc.localDescription?.sdp
    });

    if (!response.ok) {
      throw new Error(`WHIP publish failed: ${response.statusText}`);
    }

    const locationHeader = response.headers.get("Location");
    if (locationHeader) {
      try {
        whipResourceUrlRef.current = new URL(locationHeader, whipUrl).href;
      } catch (e) {
        console.warn("Failed to parse WHIP Location:", e);
        if (locationHeader.startsWith("http://") || locationHeader.startsWith("https://")) {
          whipResourceUrlRef.current = locationHeader;
        }
      }
    }

    const answerSdp = await response.text();
    await pc.setRemoteDescription(new RTCSessionDescription({
      type: "answer",
      sdp: answerSdp
    }));
  };

  // WebRTC WHEP subscriber (Student)
  const playWhep = async (whepUrl: string) => {
    if (studentPcRef.current) {
      studentPcRef.current.close();
    }

    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302"
        }
      ]
    });
    studentPcRef.current = pc;

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === "disconnected" || pc.connectionState === "failed") {
        console.warn("Student WHEP connection disconnected/failed, retrying in 2s...");
        setTimeout(() => {
          if (studentPcRef.current === pc && classItem && classItem.status === "live") {
            setupStudentPlayer();
          }
        }, 2000);
      }
    };

    pc.ontrack = (event) => {
      console.log("Student WHEP pc.ontrack fired:", event.track.kind, event.track.id);
      if (remoteVideoRef.current) {
        let stream = remoteVideoRef.current.srcObject;
        if (!(stream instanceof MediaStream)) {
          stream = new MediaStream();
          remoteVideoRef.current.srcObject = stream;
        }

        // Avoid adding duplicate tracks
        if (!stream.getTracks().find(t => t.id === event.track.id)) {
          stream.addTrack(event.track);
          console.log("Added track to remote video stream:", event.track.kind);
          remoteVideoRef.current.srcObject = stream;
        }

        // Programmatically and unconditionally play
        remoteVideoRef.current.play().catch(err => {
          if (err && err.name === "AbortError") {
            // Silence harmless AbortError caused by play request interruptions
            return;
          }
          console.warn("Autoplay prevented, muting video to play:", err);
          if (remoteVideoRef.current) {
            remoteVideoRef.current.muted = true;
            setIsAudioMuted(true);
            remoteVideoRef.current.play().catch(e => {
              if (e && e.name === "AbortError") return;
              console.error("Play failed even when muted:", e);
            });
          }
        });
      }
    };

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Wait for ICE candidates fully or timeout after 2s
    await new Promise((resolve) => {
      if (pc.iceGatheringState === "complete") {
        resolve(null);
      } else {
        let resolved = false;
        const complete = () => {
          if (!resolved) {
            resolved = true;
            pc.removeEventListener("icegatheringstatechange", complete);
            resolve(null);
          }
        };
        pc.addEventListener("icegatheringstatechange", complete);
        pc.onicecandidate = (e) => {
          if (!e.candidate) {
            complete();
          }
        };
        setTimeout(complete, 2000);
      }
    });

    const response = await fetch(whepUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/sdp",
      },
      body: pc.localDescription?.sdp
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.error(`WHEP server error (status ${response.status}):`, errText);
      throw new Error(`WHEP playback failed: ${response.status} ${response.statusText} - ${errText}`);
    }

    const locationHeader = response.headers.get("Location");
    if (locationHeader) {
      try {
        whepResourceUrlRef.current = new URL(locationHeader, whepUrl).href;
      } catch (e) {
        console.warn("Failed to parse WHEP Location:", e);
        if (locationHeader.startsWith("http://") || locationHeader.startsWith("https://")) {
          whepResourceUrlRef.current = locationHeader;
        }
      }
    }

    const answerSdp = await response.text();
    await pc.setRemoteDescription(new RTCSessionDescription({
      type: "answer",
      sdp: answerSdp
    }));
  };


  const isTeacher = user?.role === "teacher" || user?.role === "admin";
  const isCreator = classItem?.teacher === user?._id;
  const isModerator = classItem?.teacher === user?._id || user?.role === "admin";
  const myHandRaised = !isModerator && raisedHands.some((h: any) => h.studentId === user?._id);

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
      joinLiveClassMutation({ liveClassId: targetClassId as any }).catch(console.error);

      const handleUnload = () => {
        leaveLiveClassMutation({ liveClassId: targetClassId as any }).catch(console.error);
      };
      window.addEventListener("beforeunload", handleUnload);

      return () => {
        window.removeEventListener("beforeunload", handleUnload);
        leaveLiveClassMutation({ liveClassId: targetClassId as any }).catch(console.error);
      };
    }
  }, [user?.role, classItem?.status, approvalStatus?.status, targetClassId]);

  // Detect new raised hands (for creator/moderator)
  useEffect(() => {
    if (isModerator && raisedHands.length > prevRaisedCountRef.current) {
      const newestHand = raisedHands[raisedHands.length - 1];
      toast.success(`${newestHand.studentName} raised their hand`);
      playHandRaiseChime();
    }
    prevRaisedCountRef.current = raisedHands.length;
  }, [raisedHands, isModerator]);

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
    if (!isCreator && !isScreenSharing && classItem && classItem.status === "live") {
      setStreamActive(true);
      const timer = setTimeout(() => {
        setupStudentPlayer();
      }, 1200);
      return () => {
        clearTimeout(timer);
        teardownStudentPlayer();
      };
    } else {
      setStreamActive(false);
      teardownStudentPlayer();
    }
  }, [isCreator, isScreenSharing, classItem?.status, classItem?.playbackUrl, classItem?.whepUrl, (classItem as any)?.lastStreamUpdate]);

  // Teacher auto-resume stream on page refresh if class status is live
  useEffect(() => {
    if (isCreator && classItem && classItem.status === "live" && !isBroadcasting) {
      console.log("Teacher reloaded page during live stream. Auto-resuming WHIP broadcast...");
      setIsBroadcasting(true);
      startPreview().then(async () => {
        if (classItem.whipUrl && localStreamRef.current) {
          try {
            await publishWhip(localStreamRef.current, classItem.whipUrl);
            await updateStreamTimestamp({ liveClassId: targetClassId as any }).catch(console.error);
            toast.success("Broadcast auto-resumed after refresh.");
          } catch (err: any) {
            console.warn("WHIP auto-resume failed:", err);
          }
        }
      }).catch(console.error);
    }
  }, [isCreator, classItem?.status, classItem?.whipUrl]);

  // Teardown student player
  const teardownStudentPlayer = () => {
    terminateWhepSession();
    if (whepTimeoutRef.current) {
      clearTimeout(whepTimeoutRef.current);
      whepTimeoutRef.current = null;
    }
    if (hlsPlayerRef.current) {
      hlsPlayerRef.current.destroy();
      hlsPlayerRef.current = null;
    }
    if (studentPcRef.current) {
      studentPcRef.current.close();
      studentPcRef.current = null;
    }
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
      remoteVideoRef.current.src = "";
    }
  };

  // Setup Student Video Player (Cloudflare WHEP WebRTC or HLS playback)
  const setupStudentPlayer = async () => {
    teardownStudentPlayer();
    if (!remoteVideoRef.current || !classItem) return;

    if (classItem.whepUrl) {
      try {
        await playWhep(classItem.whepUrl);
        toast.success("Connected to live classroom WebRTC stream.");
        return;
      } catch (err: any) {
        console.error("WHEP playback failed, trying HLS fallback:", err);
        // Try HLS fallback temporarily
        if (classItem.playbackUrl) {
          playHls(classItem.playbackUrl);
        }
        // Always schedule background WebRTC reconnect when WHEP fails
        if (whepTimeoutRef.current) clearTimeout(whepTimeoutRef.current);
        whepTimeoutRef.current = setTimeout(() => {
          retryWhepInBackground(classItem.whepUrl!);
        }, 3000);
        return;
      }
    }

    if (classItem.playbackUrl) {
      playHls(classItem.playbackUrl);
      return;
    }

    // No mock fallback. If both whepUrl and playbackUrl are falsy, the UI will display a friendly placeholder.
    console.warn("No whepUrl or playbackUrl available for this live class.");
  };

  // Reconnect WHEP client in the background without interrupting HLS playback
  const retryWhepInBackground = async (whepUrl: string) => {
    if (!classItem || classItem.status !== "live") return;

    console.log("Attempting background WHEP reconnection...");
    const pc = new RTCPeerConnection({
      iceServers: [
        {
          urls: "stun:stun.l.google.com:19302"
        }
      ]
    });

    let isConnected = false;

    pc.addTransceiver("video", { direction: "recvonly" });
    pc.addTransceiver("audio", { direction: "recvonly" });

    pc.ontrack = (event) => {
      console.log("Background WHEP pc.ontrack fired:", event.track.kind, event.track.id);
      if (remoteVideoRef.current) {
        if (!isConnected) {
          isConnected = true;
          toast.success("Low-latency live stream reconnected!");

          // 1. Destroy HLS player if it exists
          if (hlsPlayerRef.current) {
            hlsPlayerRef.current.destroy();
            hlsPlayerRef.current = null;
          }

          // 2. Close previous student peer connection
          if (studentPcRef.current && studentPcRef.current !== pc) {
            studentPcRef.current.close();
          }
          studentPcRef.current = pc;

          // 3. Clear video src and set fresh MediaStream
          remoteVideoRef.current.src = "";
          const stream = new MediaStream();
          remoteVideoRef.current.srcObject = stream;
          stream.addTrack(event.track);

          // 4. Play
          remoteVideoRef.current.play().catch(console.warn);
        } else {
          // Add subsequent tracks (e.g., audio)
          const stream = remoteVideoRef.current.srcObject;
          if (stream instanceof MediaStream && !stream.getTracks().find(t => t.id === event.track.id)) {
            stream.addTrack(event.track);
            remoteVideoRef.current.srcObject = stream;
          }
        }
      }
    };

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE candidates fully or timeout after 1.5s
      await new Promise((resolve) => {
        if (pc.iceGatheringState === "complete") {
          resolve(null);
        } else {
          let resolved = false;
          const complete = () => {
            if (!resolved) {
              resolved = true;
              pc.removeEventListener("icegatheringstatechange", complete);
              resolve(null);
            }
          };
          pc.addEventListener("icegatheringstatechange", complete);
          pc.onicecandidate = (e) => {
            if (!e.candidate) complete();
          };
          setTimeout(complete, 1500);
        }
      });

      const response = await fetch(whepUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
        },
        body: pc.localDescription?.sdp
      });

      if (!response.ok) {
        throw new Error(`WHEP reconnect response not ok: ${response.status}`);
      }

      const locationHeader = response.headers.get("Location");
      if (locationHeader) {
        try {
          whepResourceUrlRef.current = new URL(locationHeader, whepUrl).href;
        } catch (e) {
          if (locationHeader.startsWith("http://") || locationHeader.startsWith("https://")) {
            whepResourceUrlRef.current = locationHeader;
          }
        }
      }

      const answerSdp = await response.text();
      await pc.setRemoteDescription(new RTCSessionDescription({
        type: "answer",
        sdp: answerSdp
      }));
    } catch (err) {
      console.warn("Background WHEP reconnect failed, scheduling retry:", err);
      pc.close();
      if (whepTimeoutRef.current) clearTimeout(whepTimeoutRef.current);
      whepTimeoutRef.current = setTimeout(() => {
        retryWhepInBackground(whepUrl);
      }, 4000);
    }
  };

  const playHls = (url: string) => {
    const video = remoteVideoRef.current;
    if (!video) return;

    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Native support (Safari / iOS)
      video.src = url;
      video.play().catch(err => {
        console.warn("HLS autoplay failed, muting:", err);
        video.muted = true;
        setIsAudioMuted(true);
        video.play().catch(e => console.error("Native play failed:", e));
      });
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        maxMaxBufferLength: 10,
        enableWorker: true
      });
      hlsPlayerRef.current = hls;
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(err => {
          console.warn("HLS build play failed, muting:", err);
          video.muted = true;
          setIsAudioMuted(true);
          video.play().catch(e => console.error("Hls play failed:", e));
        });
      });
    } else {
      toast.error("HLS Live streaming is not supported in this browser.");
    }
  };

  // Safe helper to request user media based on device presence
  const getUserMediaSafe = async (customConstraints: MediaStreamConstraints) => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = deviceList.some(d => d.kind === "videoinput");
      const hasAudioInput = deviceList.some(d => d.kind === "audioinput");

      const constraints: MediaStreamConstraints = {};
      if (hasVideoInput && customConstraints.video) {
        constraints.video = customConstraints.video;
      }
      if (hasAudioInput && customConstraints.audio) {
        constraints.audio = customConstraints.audio;
      }

      if (!constraints.video && !constraints.audio) {
        throw new Error("No camera or microphone devices available.");
      }

      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: any) {
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        try {
          if (customConstraints.video && customConstraints.audio) {
            return await navigator.mediaDevices.getUserMedia({ audio: true });
          }
        } catch {
          return await navigator.mediaDevices.getUserMedia({ video: true });
        }
      }
      throw err;
    }
  };

  // Student specific media track setup with Mobile Audio Optimization & WebRTC Signal Exchange
  const startStudentMedia = async (needAudio: boolean, needVideo: boolean) => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const hasVideoInput = deviceList.some(d => d.kind === "videoinput");
      const hasAudioInput = deviceList.some(d => d.kind === "audioinput");

      const audioConstraints = getMobileAudioConstraints(selectedAudioDevice);
      const constraints: MediaStreamConstraints = {
        audio: needAudio && hasAudioInput ? audioConstraints : false,
        video: needVideo && hasVideoInput ? (selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true) : false,
      };

      if (!constraints.audio && !constraints.video) {
        stopStudentAudio();
        stopStudentVideoOnly();
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      studentStreamRef.current = stream;

      if (studentLocalVideoRef.current) {
        studentLocalVideoRef.current.srcObject = stream;
      }

      // If student is unmuting microphone and broadcasting audio to teacher, set up WebRTC audio connection
      if (needAudio && classItem?.teacher && !isCreator) {
        const audioTrack = stream.getAudioTracks()[0];
        if (audioTrack) {
          if (studentAudioPcRef.current) {
            studentAudioPcRef.current.close();
          }

          const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
          });
          studentAudioPcRef.current = pc;

          pc.addTrack(audioTrack, stream);

          pc.onicecandidate = (event) => {
            if (event.candidate) {
              sendWebRtcSignal({
                liveClassId: targetClassId as any,
                targetUserId: classItem.teacher,
                signalType: "candidate",
                candidate: JSON.stringify(event.candidate),
              }).catch(console.error);
            }
          };

          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          await sendWebRtcSignal({
            liveClassId: targetClassId as any,
            targetUserId: classItem.teacher,
            signalType: "offer",
            sdp: offer.sdp,
          });
          console.log("Sent WebRTC audio offer to teacher:", classItem.teacher);
        }
      }
    } catch (err: any) {
      console.error("Student media capture failed:", err);
      toast.error(`Media capture failed: ${err.message}`);
    }
  };

  const stopStudentAudio = () => {
    if (studentStreamRef.current) {
      studentStreamRef.current.getAudioTracks().forEach(t => t.stop());
    }
    if (studentAudioPcRef.current) {
      studentAudioPcRef.current.close();
      studentAudioPcRef.current = null;
    }
  };

  const stopStudentVideoOnly = () => {
    if (studentStreamRef.current) {
      studentStreamRef.current.getVideoTracks().forEach(t => t.stop());
    }
    if (studentLocalVideoRef.current) {
      studentLocalVideoRef.current.srcObject = null;
    }
  };

  const toggleStudentMic = async () => {
    if (!targetClassId || !user?._id) return;
    try {
      const res = await toggleMuteStudentMutation({ liveClassId: targetClassId as any, studentId: user._id as any });
      if (!res.isMuted) {
        await startStudentMedia(true, !myBlockCameraStatus);
      } else {
        stopStudentAudio();
      }
      toast.success(res.isMuted ? "Microphone muted" : "Microphone unmuted");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle microphone.");
    }
  };

  const toggleStudentVideo = async () => {
    if (!targetClassId || !user?._id) return;
    try {
      const res = await toggleBlockCameraStudentMutation({ liveClassId: targetClassId as any, studentId: user._id as any });
      if (!res.isCameraBlocked) {
        await startStudentMedia(!myMuteStatus, true);
      } else {
        stopStudentVideoOnly();
      }
      toast.success(res.isCameraBlocked ? "Camera turned off" : "Camera turned on");
    } catch (err: any) {
      toast.error(err.message || "Failed to toggle camera.");
    }
  };

  // Process incoming WebRTC audio signaling messages for active student speakers
  useEffect(() => {
    if (!webRtcSignals || webRtcSignals.length === 0 || !user?._id) return;

    const processedIds: any[] = [];

    webRtcSignals.forEach(async (sig: any) => {
      processedIds.push(sig._id);

      if (isCreator) {
        // Teacher receives audio WebRTC offer or ICE candidate from speaking student
        if (sig.signalType === "offer" && sig.sdp) {
          const studentId = sig.sender;
          console.log("Teacher receiving audio WebRTC offer from student:", studentId);

          if (teacherPeerConnectionsRef.current.has(studentId)) {
            teacherPeerConnectionsRef.current.get(studentId)?.close();
          }

          const pc = new RTCPeerConnection({
            iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
          });
          teacherPeerConnectionsRef.current.set(studentId, pc);

          pc.ontrack = (event) => {
            console.log("Teacher received student audio track:", event.track.kind, studentId);
            let audioEl = teacherAudioElementsRef.current.get(studentId);
            if (!audioEl) {
              audioEl = document.createElement("audio");
              audioEl.autoplay = true;
              audioEl.playsInline = true;
              audioEl.style.display = "none";
              document.body.appendChild(audioEl);
              teacherAudioElementsRef.current.set(studentId, audioEl);
            }

            const mediaStream = new MediaStream([event.track]);
            audioEl.srcObject = mediaStream;
            audioEl.volume = 1.0;
            audioEl.muted = false;
            audioEl.play().catch(err => console.warn("Failed to play student audio track:", err));

            setSpeakingStudents(prev => Array.from(new Set([...prev, studentId])));
            toast.info("A student is speaking!");
          };

          pc.onicecandidate = (e) => {
            if (e.candidate) {
              sendWebRtcSignal({
                liveClassId: targetClassId as any,
                targetUserId: studentId,
                signalType: "candidate",
                candidate: JSON.stringify(e.candidate)
              }).catch(console.error);
            }
          };

          await pc.setRemoteDescription(new RTCSessionDescription({ type: "offer", sdp: sig.sdp }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          await sendWebRtcSignal({
            liveClassId: targetClassId as any,
            targetUserId: studentId,
            signalType: "answer",
            sdp: answer.sdp
          });
        } else if (sig.signalType === "candidate" && sig.candidate) {
          const pc = teacherPeerConnectionsRef.current.get(sig.sender);
          if (pc) {
            try {
              const candidate = new RTCIceCandidate(JSON.parse(sig.candidate));
              await pc.addIceCandidate(candidate);
            } catch (e) {
              console.warn("Failed to add ICE candidate:", e);
            }
          }
        }
      } else {
        // Student receiving WebRTC answer or candidate from teacher
        if (sig.signalType === "answer" && sig.sdp && studentAudioPcRef.current) {
          try {
            await studentAudioPcRef.current.setRemoteDescription(new RTCSessionDescription({ type: "answer", sdp: sig.sdp }));
            console.log("Student set remote description from teacher answer");
          } catch (e) {
            console.warn("Failed to set student remote description:", e);
          }
        } else if (sig.signalType === "candidate" && sig.candidate && studentAudioPcRef.current) {
          try {
            const candidate = new RTCIceCandidate(JSON.parse(sig.candidate));
            await studentAudioPcRef.current.addIceCandidate(candidate);
          } catch (e) {
            console.warn("Failed to add teacher ICE candidate:", e);
          }
        }
      }
    });

    if (processedIds.length > 0) {
      clearWebRtcSignals({ liveClassId: targetClassId as any, signalIds: processedIds }).catch(console.error);
    }
  }, [webRtcSignals, isCreator, targetClassId, user?._id]);

  // Clean up student local streams & teacher audio connections on unmount
  useEffect(() => {
    return () => {
      if (studentStreamRef.current) {
        studentStreamRef.current.getTracks().forEach(t => t.stop());
        studentStreamRef.current = null;
      }
      if (studentAudioPcRef.current) {
        studentAudioPcRef.current.close();
        studentAudioPcRef.current = null;
      }
      teacherPeerConnectionsRef.current.forEach(pc => pc.close());
      teacherPeerConnectionsRef.current.clear();
      teacherAudioElementsRef.current.forEach(el => el.remove());
      teacherAudioElementsRef.current.clear();
    };
  }, []);

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

      const stream = await getUserMediaSafe(constraints);
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

  // Resolve recording URL dynamically if it points to live input manifest
  useEffect(() => {
    if (classItem?.status === "ended" && classItem?.recordingUrl) {
      const isLiveInputUrl = classItem.recordingUrl.includes("/manifest/video.m3u8") || 
                             classItem.recordingUrl.includes("mock_");
      
      if (isLiveInputUrl && classItem.streamInputId && !classItem.streamInputId.startsWith("mock_")) {
        setResolvingRecording(true);
        getLiveInputRecordings(classItem.streamInputId)
          .then((recordings) => {
            if (recordings && recordings.length > 0) {
              setResolvedRecordingUrl(recordings[0].iframeUrl);
            } else {
              setResolvedRecordingUrl(classItem.recordingUrl);
            }
          })
          .catch((err) => {
            console.error("Failed to resolve live recording:", err);
            setResolvedRecordingUrl(classItem.recordingUrl);
          })
          .finally(() => {
            setResolvingRecording(false);
          });
      } else {
        setResolvedRecordingUrl(classItem.recordingUrl);
      }
    }
  }, [classItem?.status, classItem?.recordingUrl, classItem?.streamInputId]);

  // Go Live (Teacher)
  const handleGoLive = async () => {
    if (!classItem) return;

    setIsBroadcasting(true);
    try {
      if (!localStreamRef.current) {
        await startPreview();
      }

      let whipUrl = classItem.whipUrl;
      let whepUrl = classItem.whepUrl;
      let playbackUrl = classItem.playbackUrl;
      let streamInputId = classItem.streamInputId;
      let rtmpsUrl = classItem.rtmpsUrl;
      let streamKey = classItem.streamKey;

      if (!whipUrl) {
        toast.info("Provisioning real-time WebRTC stream channels...");
        try {
          const data = await createStreamLiveInput({
            title: classItem.title,
            preferLowLatency: true,
          });
          whipUrl = data.whipUrl;
          whepUrl = data.whepUrl;
          playbackUrl = data.playbackUrl;
          streamInputId = data.uid;
          rtmpsUrl = data.rtmpsUrl;
          streamKey = data.streamKey;
        } catch (err) {
          console.error("Failed to provision live input dynamically:", err);
        }
      }

      // Update Convex status
      await startNativeLiveClass({
        liveClassId: targetClassId as any,
        rtmpsUrl: rtmpsUrl || "",
        streamKey: streamKey || "",
        srtUrl: classItem.srtUrl || "",
        srtStreamId: classItem.srtStreamId || "",
        srtPassphrase: classItem.srtPassphrase || "",
        playbackUrl: playbackUrl || "",
        streamInputId: streamInputId || `mock_${targetClassId}`,
        whipUrl,
        whepUrl,
      });

      if (whipUrl && localStreamRef.current) {
        await publishWhip(localStreamRef.current, whipUrl);
        toast.success("Stream published successfully to Cloudflare via WebRTC!");
      } else if (rtmpsUrl && streamKey) {
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
    await terminateWhipSession();
    try {
      if (whipPcRef.current) {
        whipPcRef.current.close();
        whipPcRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
        localStreamRef.current = null;
      }

      await updateStatus({
        liveClassId: targetClassId as any,
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

  // Share Screen (Teacher or Permitted Student)
  const toggleScreenShare = async () => {
    if (!classItem) return;
    try {
      if (isScreenSharing) {
        setIsScreenSharing(false);

        // 1. Stop screen tracks
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach(t => t.stop());
          localStreamRef.current = null;
        }

        // 2. Terminate the publishing session
        if (whipPcRef.current) {
          await terminateWhipSession();
          whipPcRef.current.close();
          whipPcRef.current = null;
        }

        if (isCreator) {
          // Switch back to webcam and mic for teacher
          const constraints = {
            video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
            audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
          };
          const cameraStream = await getUserMediaSafe(constraints);
          const cameraVideoTrack = cameraStream.getVideoTracks()[0];
          const cameraAudioTrack = cameraStream.getAudioTracks()[0];

          const tracks: MediaStreamTrack[] = [];
          if (cameraVideoTrack) tracks.push(cameraVideoTrack);
          if (cameraAudioTrack) tracks.push(cameraAudioTrack);
          localStreamRef.current = new MediaStream(tracks);

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }

          if (isBroadcasting && classItem.whipUrl) {
            await publishWhip(localStreamRef.current, classItem.whipUrl);
            await updateStreamTimestamp({ liveClassId: targetClassId as any }).catch(console.error);
          }
          toast.info("Switched stream back to webcam feed.");
        } else {
          // For student, just switch back to viewing mode
          toast.info("Stopped screen sharing.");
        }
      } else {
        // Stop student WHEP player if active so we can publish our own screen
        if (!isCreator) {
          teardownStudentPlayer();
        }

        // Capture screen share with optimized quality constraints
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920, max: 3840 },
            height: { ideal: 1080, max: 2160 },
            frameRate: { ideal: 30, max: 30 }
          },
          audio: true
        });
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        if (screenVideoTrack && "contentHint" in screenVideoTrack) {
          screenVideoTrack.contentHint = "text";
        }
        const screenAudioTrack = screenStream.getAudioTracks()[0];
        setIsScreenSharing(true);

        if (whipPcRef.current) {
          await terminateWhipSession();
          whipPcRef.current.close();
          whipPcRef.current = null;
        }

        let combinedStream: MediaStream;
        if (isCreator) {
          // Preserve the teacher's mic track
          const micAudioTrack = localStreamRef.current?.getAudioTracks()[0];
          const combinedTracks: MediaStreamTrack[] = [screenVideoTrack];
          if (micAudioTrack) {
            combinedTracks.push(micAudioTrack);
          } else if (screenAudioTrack) {
            combinedTracks.push(screenAudioTrack);
          }
          combinedStream = new MediaStream(combinedTracks);

          // Update local stream ref with screen video while keeping mic active
          if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(t => {
              t.stop();
              localStreamRef.current?.removeTrack(t);
            });
            localStreamRef.current.addTrack(screenVideoTrack);
          }
        } else {
          // For student screen sharing, just use screen video and screen audio
          const combinedTracks: MediaStreamTrack[] = [screenVideoTrack];
          if (screenAudioTrack) {
            combinedTracks.push(screenAudioTrack);
          }
          combinedStream = new MediaStream(combinedTracks);
          localStreamRef.current = combinedStream;
        }

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Publish stream
        if (classItem.whipUrl) {
          await publishWhip(combinedStream, classItem.whipUrl);
          await updateStreamTimestamp({ liveClassId: targetClassId as any }).catch(console.error);
        }

        screenVideoTrack.onended = async () => {
          setIsScreenSharing(false);
          if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
            localStreamRef.current = null;
          }

          if (whipPcRef.current) {
            await terminateWhipSession();
            whipPcRef.current.close();
            whipPcRef.current = null;
          }

          if (isCreator) {
            // Switch back to webcam and mic
            const constraints = {
              video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
              audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
            };
            const cameraStream = await getUserMediaSafe(constraints);
            const cameraVideoTrack = cameraStream.getVideoTracks()[0];
            const cameraAudioTrack = cameraStream.getAudioTracks()[0];

            const tracks: MediaStreamTrack[] = [];
            if (cameraVideoTrack) tracks.push(cameraVideoTrack);
            if (cameraAudioTrack) tracks.push(cameraAudioTrack);
            localStreamRef.current = new MediaStream(tracks);

            if (localVideoRef.current) {
              localVideoRef.current.srcObject = localStreamRef.current;
            }

            if (isBroadcasting && classItem.whipUrl) {
              await publishWhip(localStreamRef.current, classItem.whipUrl);
              await updateStreamTimestamp({ liveClassId: targetClassId as any }).catch(console.error);
            }
            toast.info("Switched stream back to webcam feed.");
          } else {
            toast.info("Stopped screen sharing.");
          }
        };

        toast.success("Screen sharing stream published.");
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
        liveClassId: targetClassId as any,
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
      const res = await toggleRaiseHand({ liveClassId: targetClassId as any });
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
        liveClassId: targetClassId as any,
        type,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to send reaction");
    }
  };

  if (liveClasses === undefined) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-screen bg-zinc-950 text-white font-sans">
        <Clock className="h-10 w-10 text-indigo-500 mb-4 animate-spin" />
        <h3 className="text-lg font-semibold">Loading classroom...</h3>
        <p className="text-xs text-zinc-505 mt-1">Connecting to database</p>
      </div>
    );
  }

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
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        
        {/* Left Side: Video Viewport */}
        <section className="flex-1 flex flex-col bg-zinc-950 p-4 md:p-6 overflow-hidden justify-center items-center relative">
          
          {/* Top-Left Floating Room Info Badge */}
          <div className="absolute top-4 left-4 md:top-8 md:left-8 z-20 flex items-center gap-2 md:gap-3">
            <div className="text-xs font-semibold text-white/90 tracking-wide px-3.5 py-2 rounded-full bg-zinc-900/80 backdrop-blur border border-zinc-800 flex items-center gap-2 shadow-lg">
              <span className="text-zinc-200">{timeStr}</span>
              <span className="w-1 h-1 rounded-full bg-zinc-600"></span>
              <span className="text-zinc-300 font-mono tracking-wider">{getRoomCode()}</span>
            </div>
            {classItem.status === "live" && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 backdrop-blur shadow-lg">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-[10px] font-bold text-red-400 tracking-wider uppercase">Live</span>
              </div>
            )}
          </div>

          {/* Top-Right Floating Status Badges */}
          <div className="absolute top-4 right-4 md:top-8 md:right-8 z-20 flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-red-500/20 text-red-200 text-xs font-semibold shadow-lg backdrop-blur border border-red-500/35">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Transcribing
            </div>
          </div>

          {/* Video Arena Viewport */}
          <div className="w-full h-full rounded-2xl overflow-hidden bg-zinc-900/60 border border-zinc-900 relative shadow-2xl group flex items-center justify-center">
            
            {/* Muted or Camera Blocked Alert overlay */}
            {(myMuteStatus || myBlockCameraStatus) && (
              <div className="absolute top-16 left-4 md:top-20 md:left-6 flex flex-col gap-1.5 z-35 pointer-events-none max-w-[calc(100%-2rem)] md:max-w-sm">
                {myMuteStatus && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-550/90 text-white text-xs font-semibold shadow-lg backdrop-blur border border-red-500/20 animate-pulse">
                    <MicOff className="h-3.5 w-3.5" />
                    <span>Microphone muted by teacher</span>
                  </div>
                )}
                {myBlockCameraStatus && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-550/90 text-white text-xs font-semibold shadow-lg backdrop-blur border border-red-500/20 animate-pulse">
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
                {resolvingRecording ? (
                  <div className="text-center text-zinc-300 p-6">
                    <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Loading replay recording...</p>
                  </div>
                ) : resolvedRecordingUrl ? (
                  resolvedRecordingUrl.includes("iframe.videodelivery.net") || resolvedRecordingUrl.includes("videodelivery.net") ? (
                    <iframe
                       title={classItem.title}
                       src={resolvedRecordingUrl.includes("iframe.videodelivery.net") 
                         ? resolvedRecordingUrl 
                         : resolvedRecordingUrl.replace("videodelivery.net", "iframe.videodelivery.net")}
                       className="w-full h-full aspect-video border-0"
                       allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
                       allowFullScreen
                     />
                  ) : (
                    <video
                      src={resolvedRecordingUrl}
                      controls
                      className="w-full h-full object-contain"
                    />
                  )
                ) : (
                  <div className="text-center text-zinc-300 p-6 font-medium">
                    <p className="text-xs text-zinc-500 dark:text-zinc-450">Recording is being processed. Please check back shortly.</p>
                  </div>
                )}
              </div>
            ) : (isCreator || isScreenSharing) ? (
              <>
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={cn(
                    "w-full h-full object-cover transform",
                    !isScreenSharing && "scale-x-[-1]"
                  )}
                />
                
                {/* Local status labels */}
                <div className="absolute bottom-6 left-6 flex gap-2 z-10">
                  <Badge className="bg-zinc-950/80 backdrop-blur border border-zinc-800 text-zinc-300 font-normal">
                    {isScreenSharing ? "Screen Sharing" : "Camera Feed"}
                  </Badge>
                  {isBroadcasting && (
                    <Badge className="bg-red-600/90 text-white font-semibold animate-pulse">
                      Broadcasting
                    </Badge>
                  )}
                </div>

                {/* If not broadcasting yet, show a big "Start Live Class" overlay in the middle */}
                {isCreator && !isBroadcasting && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4 z-10 transition-all">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-505 mb-2">
                      <VideoIcon className="h-8 w-8 animate-pulse" />
                    </div>
                    <div className="text-center">
                      <h4 className="text-lg font-bold text-white">Start Your Live Class</h4>
                      <p className="text-sm text-zinc-400 max-w-sm mt-1 px-4">
                        Configure your camera/microphone and click "Go Live" below to start streaming to your students.
                      </p>
                    </div>
                    <Button 
                      className="bg-red-650 hover:bg-red-700 text-white rounded-xl px-6 py-2.5 h-11 gap-2 font-bold shadow-lg shadow-red-600/20 active:scale-95 transition-all mt-2"
                      onClick={handleGoLive}
                    >
                      <Play className="h-4.5 w-4.5 fill-current" />
                      Go Live
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                {streamActive && (classItem.whepUrl || classItem.playbackUrl) ? (
                  <div className="w-full h-full relative bg-black">
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-contain"
                      muted={isAudioMuted}
                    />

                    {/* Custom student overlays */}
                    <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 flex gap-2">
                      <Badge className="bg-zinc-950/85 backdrop-blur border border-zinc-800 text-zinc-300 font-normal">
                        Stream: Cloudflare Live (Sub-second WebRTC)
                      </Badge>
                    </div>

                    {/* Tap to Unmute Overlay */}
                    {isAudioMuted && (
                      <button
                        onClick={() => setIsAudioMuted(false)}
                        className="absolute top-4 right-4 z-20 bg-red-650 hover:bg-red-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-all cursor-pointer animate-pulse"
                      >
                        <VolumeX className="h-4 w-4" />
                        <span>Tap to unmute</span>
                      </button>
                    )}

                    {/* Custom Player Controls (bottom bar visible on hover) */}
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-zinc-955/90 to-transparent flex items-center justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-15">
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
                        <Badge variant="outline" className="text-[10px] border-zinc-800 bg-red-950/20 text-red-500">
                          LIVE
                        </Badge>
                      </div>
                    </div>
                  </div>
                ) : streamActive ? (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#201d16] via-[#16140f] to-[#0c0a07] p-6 text-center select-none">
                    <div className="w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-550 mb-6 animate-pulse">
                      <AlertCircle className="h-10 w-10 text-amber-400" />
                    </div>
                    <h4 className="text-lg font-bold text-zinc-300">Live Stream Not Configured</h4>
                    <p className="text-sm text-zinc-500 max-w-sm mt-1">
                      The class is live, but the video broadcast feed is not configured.
                    </p>
                    {isTeacher && (
                      <p className="text-xs text-amber-500/80 max-w-xs mt-4 bg-amber-500/5 border border-amber-500/10 px-4 py-2.5 rounded-xl">
                        Tip: Ensure <strong>CLOUDFLARE_API_TOKEN</strong> is set in your Cloudflare Worker secrets.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#201d16] via-[#16140f] to-[#0c0a07] p-6 text-center select-none">
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-amber-600/20 to-amber-700/35 border border-amber-500/30 flex items-center justify-center shadow-2xl mb-6 animate-pulse">
                      <span className="text-3xl font-bold text-amber-400 tracking-wider font-serif">
                        {getInitials(classItem.title)}
                      </span>
                    </div>
                    {classItem.status === "ended" ? (
                      <>
                        <h4 className="text-lg font-bold text-zinc-300">This class has ended</h4>
                        <p className="text-sm text-zinc-550 max-w-sm mt-1">
                          You can find the recording in the Live Classes directory once it finishes processing.
                        </p>
                      </>
                    ) : (
                      <>
                        <h4 className="text-lg font-bold text-zinc-305">Waiting for teacher to start stream</h4>
                        <p className="text-sm text-zinc-500 max-w-sm mt-1">
                          This class is scheduled. As soon as the teacher starts broadcasting, your player will connect automatically with sub-second WebRTC latency.
                        </p>
                      </>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Closed Captions Transcription Overlay */}
            {isCcEnabled && (
              <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/85 text-white px-6 py-3 rounded-xl border border-zinc-800 text-center max-w-xl text-sm font-light tracking-wide backdrop-blur z-20">
                <span className="text-zinc-400 font-semibold uppercase text-[10px] block mb-1">Live Transcription</span>
                "Welcome class! Today we're going to dive into advanced coding techniques and look at the structure of our application..."
              </div>
            )}

            {/* Small floating video for student's local webcam feed if camera is on */}
            {!isCreator && !myBlockCameraStatus && (
              <div className="absolute bottom-4 right-4 w-28 h-20 md:w-36 md:h-24 rounded-xl border border-zinc-800 overflow-hidden shadow-xl z-30 bg-zinc-950">
                <video
                  ref={studentLocalVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </div>
            )}

          </div>

          {/* Teacher Device Settings Drawer overlay (shows if toggled) */}
          {isCreator && showSettings && (
            <Card className="w-full max-w-lg mt-4 bg-zinc-900 border-zinc-800 text-zinc-205 shadow-2xl z-20">
              <CardContent className="p-4 grid md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-zinc-400">Select Camera</Label>
                  <Select value={selectedVideoDevice} onValueChange={setSelectedVideoDevice}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1 h-9 text-zinc-200">
                      <SelectValue placeholder="Default camera" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-805 text-zinc-200">
                      {devices.video.map((d) => (
                        <SelectItem key={d.deviceId} value={d.deviceId} className="hover:bg-zinc-805">{d.label || `Camera ${d.deviceId.slice(0,5)}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-zinc-400">Select Microphone</Label>
                  <Select value={selectedAudioDevice} onValueChange={setSelectedAudioDevice}>
                    <SelectTrigger className="bg-zinc-950 border-zinc-800 mt-1 h-9 text-zinc-200">
                      <SelectValue placeholder="Default microphone" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-950 border-zinc-805 text-zinc-200">
                      {devices.audio.map((d) => (
                        <SelectItem key={d.deviceId} value={d.deviceId} className="hover:bg-zinc-805">{d.label || `Microphone ${d.deviceId.slice(0,5)}`}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

        </section>

        {/* Right Side: Collapsible Sidebar */}
        {showSidebar && (
          <aside className="w-full md:w-80 h-72 md:h-full border-t md:border-t-0 md:border-l border-zinc-900 bg-zinc-950 flex flex-col overflow-hidden shrink-0 z-20">
            
            {/* Tab selectors */}
            <div className="flex border-b border-zinc-900 bg-zinc-950 shrink-0">
              <button
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "flex-1 py-3 text-xs font-semibold border-b-2 flex items-center justify-center gap-1.5 transition-all",
                  activeTab === "chat" 
                    ? "border-red-655 text-white bg-zinc-900/30" 
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
                    ? "border-red-655 text-white bg-zinc-900/30" 
                    : "border-transparent text-zinc-500 hover:text-zinc-300"
                )}
              >
                <Users className="h-3.5 w-3.5" />
                People
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
                      ? "text-indigo-400" 
                      : "text-zinc-500 hover:text-zinc-300"
                  )}
                  onClick={() => setActiveTab("waiting")}
                >
                  Waiting ({pendingApprovals.length})
                  {activeTab === "waiting" && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500" />}
                </button>
              )}
            </div>

            {/* Tab Contents */}
            <div className="flex-1 overflow-hidden relative flex flex-col bg-zinc-950">
              
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
                                <Badge className="bg-red-500/10 border border-red-500/20 text-[8px] text-red-500 px-1 py-0 leading-none h-3 font-semibold uppercase tracking-wider rounded">
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
                                  ? "bg-zinc-805 border border-red-950/30 text-zinc-100 rounded-tl-none"
                                  : "bg-zinc-900 border border-zinc-850 text-zinc-200 rounded-tl-none"
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
                      className="text-xs h-9 rounded-xl border-zinc-850 bg-zinc-900 focus-visible:ring-1 focus-visible:ring-red-600 focus-visible:ring-offset-0 focus-visible:border-transparent text-white"
                    />
                    <Button type="submit" size="icon" className="h-9 w-9 bg-red-600 hover:bg-red-700 text-white shrink-0 rounded-xl">
                      <Send className="h-4 w-4" />
                    </Button>
                  </form>
                </>
              )}

              {/* 2. INTERACTIONS & ROSTER TAB */}
              {activeTab === "interactions" && (
                <div className="flex-1 overflow-y-auto p-4 flex flex-col h-full space-y-5">
                  
                  {/* Student Hand Raising Card */}
                  {!isModerator && (
                    <div className="p-4 rounded-2xl border bg-gradient-to-br from-zinc-900 to-zinc-955 border-zinc-800 shadow-md shrink-0">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-zinc-200">
                            {myHandRaised ? "Hand Raised" : "Have a Question?"}
                          </h4>
                          <p className="text-[11px] text-zinc-450 mt-1 leading-relaxed">
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
                              ? "bg-amber-500 hover:bg-amber-605 text-zinc-950 animate-bounce ring-4 ring-amber-500/30"
                              : "bg-red-600 hover:bg-red-700 text-white hover:scale-105 active:scale-95"
                          )}
                          title={myHandRaised ? "Lower Hand" : "Raise Hand"}
                        >
                          <Hand className={cn("h-5 w-5", myHandRaised ? "animate-pulse" : "")} />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Raised hands queue */}
                  <div className="shrink-0">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Hand className="h-3.5 w-3.5" />
                        Raised Hands Queue
                      </h3>
                      {isModerator && raisedHands.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] text-zinc-500 hover:text-white px-2 py-1 h-auto"
                          onClick={async () => {
                            for (const h of raisedHands) {
                              await lowerStudentHand({ liveClassId: targetClassId as any, studentId: h.studentId });
                            }
                            toast.info("Cleared raised hands queue.");
                          }}
                        >
                          Clear All
                        </Button>
                      )}
                    </div>

                    {raisedHands.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-4 border border-dashed border-zinc-800 rounded-xl text-center bg-zinc-900/10 min-h-[100px]">
                        <Hand className="mb-2 h-6 w-6 text-zinc-700" />
                        <p className="text-xs text-zinc-500">No hands raised yet</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {raisedHands.map((hand: any) => (
                          <div
                            key={hand._id}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/10 shadow-sm"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="w-7 h-7 rounded-full bg-amber-505/10 border border-amber-505/20 flex items-center justify-center text-xs font-bold text-amber-500 shrink-0">
                                {hand.studentName.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs text-zinc-200 font-medium truncate">{hand.studentName}</span>
                            </div>
                            
                            {isModerator && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2.5 rounded-lg bg-amber-505/15 hover:bg-amber-505/25 text-[10px] text-amber-500 font-semibold"
                                onClick={() => lowerStudentHand({ liveClassId: targetClassId as any, studentId: hand.studentId })}
                              >
                                Lower
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                            {/* Student Roster Section (Online vs Offline) */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        Student Roster
                      </h3>
                      {!isModerator && (
                        <Button 
                          variant="ghost" 
                          className="h-6 px-2 text-[10px] font-semibold text-red-500 hover:text-red-400 hover:bg-zinc-800 rounded-md"
                          onClick={() => setShowRosterForStudent(!showRosterForStudent)}
                        >
                          {showRosterForStudent ? "Hide" : "View"}
                        </Button>
                      )}
                    </div>

                    {isModerator || showRosterForStudent ? (
                      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                        
                        {/* Online list */}
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1.5 px-1 uppercase tracking-wider">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            Online ({participants.filter((p: any) => p.isOnline).length})
                          </div>
                          {participants.filter((p: any) => p.isOnline).length === 0 ? (
                            <p className="text-[11px] text-zinc-650 italic pl-1">No students online.</p>
                          ) : (
                            <div className="space-y-1.5">
                              {participants.filter((p: any) => p.isOnline).map((p: any) => (
                                <div key={p.studentId} className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-850">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0", speakingStudents.includes(p.studentId) || !p.isMuted ? "bg-emerald-500 text-zinc-950 ring-2 ring-emerald-400 animate-pulse" : "bg-emerald-950 border border-emerald-800 text-emerald-450")}>
                                      {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-medium text-zinc-200 truncate" title={p.name}>{p.name}</span>
                                    {(speakingStudents.includes(p.studentId) || (!p.isMuted && p.isOnline)) && (
                                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px] px-1.5 py-0 h-4 font-semibold uppercase animate-pulse">
                                        Speaking
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="flex items-center gap-1 shrink-0">
                                    {isModerator ? (
                                      <>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className={cn("h-7 w-7 rounded-lg", p.isMuted ? "text-red-500 hover:bg-red-955/20" : "text-zinc-400 hover:bg-zinc-800")}
                                          onClick={async () => {
                                            try {
                                              const res = await toggleMuteStudentMutation({ liveClassId: targetClassId as any, studentId: p.studentId });
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
                                          className={cn("h-7 w-7 rounded-lg", p.isCameraBlocked ? "text-red-500 hover:bg-red-955/20" : "text-zinc-400 hover:bg-zinc-800")}
                                          onClick={async () => {
                                            try {
                                              const res = await toggleBlockCameraStudentMutation({ liveClassId: targetClassId as any, studentId: p.studentId });
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
                                          className={cn(
                                            "h-7 w-7 rounded-lg", 
                                            p.canShareScreen 
                                              ? "text-emerald-500 hover:bg-emerald-950/20" 
                                              : p.requestedScreenShare 
                                                ? "text-amber-500 hover:bg-amber-955/20 animate-pulse" 
                                                : "text-zinc-400 hover:bg-zinc-800"
                                          )}
                                          onClick={async () => {
                                            try {
                                              const nextState = !p.canShareScreen;
                                              await toggleScreenSharePermissionMutation({ 
                                                liveClassId: targetClassId as any, 
                                                studentId: p.studentId, 
                                                granted: nextState 
                                              });
                                              toast.success(
                                                nextState 
                                                  ? `Granted screen share permission to ${p.name}.` 
                                                  : `Revoked screen share permission for ${p.name}.`
                                              );
                                            } catch (err: any) {
                                              toast.error(err.message || "Failed to update permission.");
                                            }
                                          }}
                                          title={
                                            p.canShareScreen 
                                              ? "Revoke Screen Share" 
                                              : p.requestedScreenShare 
                                                ? "Grant Screen Share Request" 
                                                : "Grant Screen Share"
                                          }
                                        >
                                          <Monitor className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          className="h-7 w-7 text-red-550 hover:text-red-400 hover:bg-red-955/20 rounded-lg"
                                          onClick={async () => {
                                            try {
                                              await evictStudentMutation({ liveClassId: targetClassId as any, studentId: p.studentId });
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
                                        {p.isMuted && <span title="Muted"><MicOff className="h-3.5 w-3.5 text-red-500 opacity-80" /></span>}
                                        {p.isCameraBlocked && <span title="Camera Blocked"><VideoOff className="h-3.5 w-3.5 text-red-500 opacity-80" /></span>}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Offline list */}
                        <div className="space-y-2">
                          <div className="text-[10px] font-bold text-zinc-500 flex items-center gap-1.5 px-1 uppercase tracking-wider">
                            <span className="h-1.5 w-1.5 rounded-full bg-zinc-700"></span>
                            Offline ({participants.filter((p: any) => !p.isOnline).length})
                          </div>
                          {participants.filter((p: any) => !p.isOnline).length === 0 ? (
                            <p className="text-[11px] text-zinc-650 italic pl-1">All students are online.</p>
                          ) : (
                            <div className="space-y-1.5 opacity-60">
                              {participants.filter((p: any) => !p.isOnline).map((p: any) => (
                                <div key={p.studentId} className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-900">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">
                                      {p.name.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-xs font-medium text-zinc-400 truncate" title={p.name}>{p.name}</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center p-4 text-center rounded-xl bg-zinc-900/30 border border-dashed border-zinc-800">
                        <Users className="h-6 w-6 text-zinc-600 mb-2" />
                        <p className="text-xs text-zinc-400">Student list is hidden by default.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 text-xs border-zinc-800 hover:bg-zinc-800 hover:text-white rounded-xl"
                          onClick={() => setShowRosterForStudent(true)}
                        >
                          View Online Students
                        </Button>
                      </div>
                    )}
                  </div>          </div>

                </div>
              )}

              {/* 3. WAITING ROOM TAB (Teacher Only) */}
              {activeTab === "waiting" && isTeacher && (
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-950">
                  {pendingApprovals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-zinc-650">
                      <Clock className="h-10 w-10 mb-2 opacity-50" />
                      <p className="text-sm font-medium">No pending requests</p>
                    </div>
                  ) : (
                    pendingApprovals.map((req: any) => (
                      <div key={req._id} className="flex items-center justify-between p-3 bg-zinc-900 border border-zinc-800 rounded-xl shadow-sm">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="h-8 w-8 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400 font-bold shrink-0">
                            {req.studentName.charAt(0).toUpperCase()}
                          </div>
                          <p className="text-sm font-semibold text-zinc-200 truncate">
                            {req.studentName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-green-500 hover:text-green-400 hover:bg-green-950/20 border-zinc-800"
                            onClick={() => approveStudentMutation({ approvalId: req._id, status: "approved" })}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-405 hover:bg-red-955/20 border-zinc-800"
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
        )}
      </div>

      {/* ── BOTTOM CONTROL BAR (GOOGLE MEET/TEAMS STYLE) ── */}
      <footer className="h-16 md:h-20 bg-zinc-955 flex items-center justify-between px-3 md:px-6 border-t border-zinc-900 z-30 shrink-0 select-none">
        
        {/* Left Column: Room clock and code */}
        <div className="hidden lg:flex items-center gap-4 text-sm font-medium text-zinc-400 min-w-[180px]">
          <span className="text-white font-medium">{timeStr}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-800"></span>
          <span className="font-mono tracking-wider text-zinc-300 font-semibold">{getRoomCode()}</span>
        </div>

        {/* Center Column: Control Circle Buttons */}
        <div className="flex items-center gap-1.5 md:gap-3 overflow-x-auto no-scrollbar py-1 flex-1 md:flex-initial justify-center">
          
          {/* Mute Mic (Broadcaster or Student) */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 md:h-12 md:w-12 rounded-full border transition-all relative shrink-0",
              (isCreator ? isMuted : myMuteStatus)
                ? "bg-red-500/20 border-red-500 text-red-505 hover:bg-red-500/30" 
                : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
            )}
            onClick={isCreator ? toggleMute : toggleStudentMic}
            title={(isCreator ? isMuted : myMuteStatus) ? "Unmute Mic" : "Mute Mic"}
          >
            {(isCreator ? isMuted : myMuteStatus) ? <MicOff className="h-4.5 w-4.5 md:h-5 md:w-5" /> : <Mic className="h-4.5 w-4.5 md:h-5 md:w-5" />}
            {(isCreator ? isMuted : myMuteStatus) && <span className="absolute top-0 right-0 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-yellow-500 border border-zinc-950" />}
          </Button>

          {/* Video Camera (Broadcaster or Student) */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 md:h-12 md:w-12 rounded-full border transition-all relative shrink-0",
              (isCreator ? isVideoOff : myBlockCameraStatus)
                ? "bg-red-500/20 border-red-500 text-red-505 hover:bg-red-500/30" 
                : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
            )}
            onClick={isCreator ? toggleVideo : toggleStudentVideo}
            title={(isCreator ? isVideoOff : myBlockCameraStatus) ? "Turn On Camera" : "Turn Off Camera"}
          >
            {(isCreator ? isVideoOff : myBlockCameraStatus) ? <VideoOff className="h-4.5 w-4.5 md:h-5 md:w-5" /> : <VideoIcon className="h-4.5 w-4.5 md:h-5 md:w-5" />}
            {(isCreator ? isVideoOff : myBlockCameraStatus) && <span className="absolute top-0 right-0 w-2 h-2 md:w-2.5 md:h-2.5 rounded-full bg-yellow-500 border border-zinc-950" />}
          </Button>

          {/* Screen Share (Broadcaster or permitted student) */}
          {(isCreator || myCanShareScreen) && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 md:h-12 md:w-12 rounded-full border transition-all shrink-0",
                isScreenSharing 
                  ? "bg-emerald-550/20 border-emerald-500 text-emerald-505 hover:bg-emerald-500/30" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
              )}
              onClick={toggleScreenShare}
              title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
            >
              <Monitor className="h-4.5 w-4.5 md:h-5 md:w-5" />
            </Button>
          )}

          {/* Request Screen Share Button (Student who does not have permission yet) */}
          {!isModerator && !myCanShareScreen && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 md:h-12 md:w-12 rounded-full border transition-all shrink-0 relative",
                myRequestedScreenShare
                  ? "bg-amber-500/20 border-amber-500 text-amber-500 animate-pulse" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-700"
              )}
              onClick={async () => {
                if (myRequestedScreenShare) return;
                try {
                  await requestScreenShareMutation({ liveClassId: targetClassId as any });
                  toast.success("Screen share permission requested!");
                } catch (err: any) {
                  toast.error(err.message || "Failed to request screen share.");
                }
              }}
              title={myRequestedScreenShare ? "Screen Share Requested (Awaiting Teacher Approval)" : "Request to Share Screen"}
            >
              <Monitor className="h-4.5 w-4.5 md:h-5 md:w-5" />
              {myRequestedScreenShare && (
                <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500" />
              )}
            </Button>
          )}

          {/* Whiteboard Button (Opens whiteboard in a new tab) */}
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 md:h-12 md:w-12 rounded-full border bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700 transition-all shrink-0"
            onClick={() => window.open("/whiteboard", "_blank")}
            title="Open Whiteboard Canvas"
          >
            <Presentation className="h-4.5 w-4.5 md:h-5 md:w-5" />
          </Button>

          {/* Closed Captions toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 md:h-12 md:w-12 rounded-full border transition-all shrink-0",
              isCcEnabled 
                ? "bg-sky-500/20 border-sky-500 text-sky-400 hover:bg-sky-500/30" 
                : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
            )}
            onClick={() => setIsCcEnabled(!isCcEnabled)}
            title={isCcEnabled ? "Disable Captions" : "Enable Captions"}
          >
            <Subtitles className="h-4.5 w-4.5 md:h-5 md:w-5" />
          </Button>

          {/* Raise Hand (Student only) */}
          {!isModerator && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 md:h-12 md:w-12 rounded-full border transition-all shrink-0",
                myHandRaised 
                  ? "bg-amber-500 border-amber-505 text-zinc-950 hover:bg-amber-600 hover:border-amber-605" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
              )}
              onClick={handleRaiseHand}
              title={myHandRaised ? "Lower Hand" : "Raise Hand"}
            >
              <Hand className="h-4.5 w-4.5 md:h-5 md:w-5" />
            </Button>
          )}

          {/* Reactions popover trigger */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 md:h-12 md:w-12 rounded-full border transition-all shrink-0",
                showReactionsMenu
                  ? "bg-zinc-800 border-zinc-700 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
              )}
              onClick={() => setShowReactionsMenu(!showReactionsMenu)}
              title="Reactions"
            >
              <Smile className="h-4.5 w-4.5 md:h-5 md:w-5" />
            </Button>

            {/* Floating Reactions Toolbar */}
            {showReactionsMenu && (
              <div className="absolute bottom-14 md:bottom-16 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1.5 rounded-full shadow-2xl z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
                {Object.entries(EMOJI_MAP).map(([type, emoji]) => (
                  <Button
                    key={type}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full hover:bg-zinc-800 text-lg transition-transform hover:scale-125 active:scale-90"
                    onClick={() => {
                      handleSendReaction(type);
                      setShowReactionsMenu(false);
                    }}
                    title={`React with ${type}`}
                  >
                    {emoji}
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Red Hang Up / End Class Button */}
          {isModerator ? (
            <Button
              className="bg-red-600 hover:bg-red-750 text-white rounded-full px-3 md:px-5 py-2 h-10 md:h-12 gap-1.5 md:gap-2 border border-red-500/20 font-semibold shadow-lg shadow-red-600/10 shrink-0"
              onClick={handleEndStream}
            >
              <PhoneOff className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">End Class</span>
            </Button>
          ) : (
            <Button
              className="bg-red-650 hover:bg-red-750 text-white rounded-full px-3 md:px-5 py-2 h-10 md:h-12 gap-1.5 md:gap-2 border border-red-500/20 font-semibold shadow-lg shadow-red-600/10 shrink-0"
              onClick={() => navigate("/lives")}
            >
              <PhoneOff className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">Leave</span>
            </Button>
          )}

        </div>

        {/* Right Column: Toggle Sidebar and Settings Buttons */}
        <div className="flex items-center gap-1 md:gap-2 min-w-0 md:min-w-[180px] justify-end">
          
          {/* People Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 md:h-12 md:w-12 rounded-full transition-all relative shrink-0",
              showSidebar && activeTab === "interactions"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            )}
            onClick={() => toggleSidebarTab("interactions")}
            title="People & Roster"
          >
            <Users className="h-4.5 w-4.5 md:h-5 md:w-5" />
            {raisedHands.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-amber-500 text-[8px] font-bold text-zinc-955 rounded-full flex items-center justify-center animate-pulse border border-zinc-950">
                {raisedHands.length}
              </span>
            )}
          </Button>

          {/* Chat Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-10 w-10 md:h-12 md:w-12 rounded-full transition-all relative shrink-0",
              showSidebar && activeTab === "chat"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            )}
            onClick={() => toggleSidebarTab("chat")}
            title="Chat"
          >
            <MessageSquare className="h-4.5 w-4.5 md:h-5 md:w-5" />
            {chatMessages.length > 0 && (
              <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-red-650 text-[8px] font-bold text-white rounded-full flex items-center justify-center border border-zinc-955">
                {chatMessages.length}
              </span>
            )}
          </Button>

          {/* Waiting Room Toggle (Teacher only) */}
          {isTeacher && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 md:h-12 md:w-12 rounded-full transition-all relative shrink-0",
                showSidebar && activeTab === "waiting"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              )}
              onClick={() => toggleSidebarTab("waiting")}
              title="Waiting Room"
            >
              <Clock className="h-4.5 w-4.5 md:h-5 md:w-5" />
              {pendingApprovals.length > 0 && (
                <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 bg-indigo-600 text-[8px] font-bold text-white rounded-full flex items-center justify-center animate-pulse border border-zinc-950">
                  {pendingApprovals.length}
                </span>
              )}
            </Button>
          )}

          {/* Host Device Settings (Teacher only) */}
          {isCreator && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-10 w-10 md:h-12 md:w-12 rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-all shrink-0",
                showSettings && "bg-zinc-800 text-white"
              )}
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <Settings className="h-4.5 w-4.5 md:h-5 md:w-5" />
            </Button>
          )}

          {/* Invite dialog button (Teacher only) */}
          {isTeacher && (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 md:h-12 md:w-12 rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-all shrink-0"
              onClick={() => setShowInvite(true)}
              title="Invite Students"
            >
              <Users className="h-4.5 w-4.5 md:h-5 md:w-5" />
            </Button>
          )}

        </div>

      </footer>

      {isTeacher && <InviteDialog open={showInvite} onClose={() => setShowInvite(false)} liveClass={classItem} />}
    </div>
  );
}
