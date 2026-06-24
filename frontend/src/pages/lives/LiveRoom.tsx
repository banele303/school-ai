import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/hooks/AuthProvider";
import Hls from "hls.js";
import InviteDialog from "./InviteDialog";
import { createStreamLiveInput } from "@/lib/cloudflareWorker";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Mic, MicOff, Video as VideoIcon, VideoOff, Monitor, PhoneOff, 
  Send, Users, MessageSquare, Settings, Volume2, VolumeX, 
  Clock, ArrowLeft, AlertCircle, Wifi, Play, CheckCircle, Hand, Sparkles,
  Presentation, Smile, Subtitles, MoreVertical
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
  const updateStreamTimestamp = useMutation(api.liveClasses.updateStreamTimestamp);
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
  const [isAudioMuted, setIsAudioMuted] = useState(true);
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

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const prevRaisedCountRef = useRef(0);
  const hlsPlayerRef = useRef<Hls | null>(null);
  const whipPcRef = useRef<RTCPeerConnection | null>(null);
  const studentPcRef = useRef<RTCPeerConnection | null>(null);
  const whepTimeoutRef = useRef<any>(null);
  const whipResourceUrlRef = useRef<string | null>(null);
  const whepResourceUrlRef = useRef<string | null>(null);

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

    // Prefer H.264 codec for video publishing
    const videoTransceiver = pc.getTransceivers().find(t => t.sender.track?.kind === 'video');
    if (videoTransceiver && typeof RTCRtpSender.getCapabilities === 'function') {
      const capabilities = RTCRtpSender.getCapabilities('video');
      const h264Codecs = capabilities?.codecs.filter(c => c.mimeType.toLowerCase() === 'video/h264');
      if (h264Codecs && h264Codecs.length > 0) {
        try {
          videoTransceiver.setCodecPreferences(h264Codecs);
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

    // Prefer H.264 codec for video subscribing
    const videoTransceiver = pc.getTransceivers().find(t => t.receiver.track.kind === 'video');
    if (videoTransceiver && typeof RTCRtpReceiver.getCapabilities === 'function') {
      const capabilities = RTCRtpReceiver.getCapabilities('video');
      const h264Codecs = capabilities?.codecs.filter(c => c.mimeType.toLowerCase() === 'video/h264');
      if (h264Codecs && h264Codecs.length > 0) {
        try {
          videoTransceiver.setCodecPreferences(h264Codecs);
        } catch (e) {
          console.warn("Failed to set WHEP H.264 preferences:", e);
        }
      }
    }

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
      if (remoteVideoRef.current) {
        let stream = event.streams[0];
        if (!stream) {
          let inboundStream = remoteVideoRef.current.srcObject;
          if (!(inboundStream instanceof MediaStream)) {
            inboundStream = new MediaStream();
          }
          inboundStream.addTrack(event.track);
          stream = inboundStream;
        }

        // Force browser rendering pipeline refresh to register newly added tracks
        const currentSrcObject = remoteVideoRef.current.srcObject;
        if (currentSrcObject !== stream) {
          remoteVideoRef.current.srcObject = stream;
        } else {
          // Only load if paused/not playing to prevent interrupting active play requests
          if (remoteVideoRef.current.paused) {
            remoteVideoRef.current.load();
          }
        }

        // Programmatically play if not already playing and handle autoplay restrictions
        if (remoteVideoRef.current.paused) {
          remoteVideoRef.current.play().catch(err => {
            console.warn("Autoplay prevented, muting video to play:", err);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.muted = true;
              setIsAudioMuted(true);
              remoteVideoRef.current.play().catch(e => console.error("Play failed even when muted:", e));
            }
          });
        }
      }
    };

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
  }, [isCreator, classItem?.status, classItem?.playbackUrl, classItem?.whepUrl, classItem?.lastStreamUpdate]);

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
        console.error("WHEP playback failed, scheduling retry:", err);
        // Schedule retry if room is still live
        if (whepTimeoutRef.current) clearTimeout(whepTimeoutRef.current);
        whepTimeoutRef.current = setTimeout(() => {
          if (classItem && classItem.status === "live") {
            setupStudentPlayer();
          }
        }, 3000);

        // Try HLS fallback temporarily
        if (classItem.playbackUrl) {
          playHls(classItem.playbackUrl);
        }
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
        liveClassId: id as any,
        rtmpsUrl: rtmpsUrl || "",
        streamKey: streamKey || "",
        srtUrl: classItem.srtUrl || "",
        srtStreamId: classItem.srtStreamId || "",
        srtPassphrase: classItem.srtPassphrase || "",
        playbackUrl: playbackUrl || "",
        streamInputId: streamInputId || `mock_${id}`,
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

  // Share Screen (Teacher only)
  const toggleScreenShare = async () => {
    if (!classItem) return;
    try {
      if (isScreenSharing) {
        // Switch back to webcam
        setIsScreenSharing(false);

        // 1. Get new webcam video stream
        const constraints = {
          video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
          audio: false,
        };
        const cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        const cameraVideoTrack = cameraStream.getVideoTracks()[0];

        // 2. Replace track on existing session if active, otherwise update stream refs
        if (isBroadcasting && whipPcRef.current) {
          const videoSender = whipPcRef.current.getSenders().find(s => s.track?.kind === "video");
          if (videoSender) {
            await videoSender.replaceTrack(cameraVideoTrack);
          } else {
            await terminateWhipSession();
            whipPcRef.current.close();
            whipPcRef.current = null;
            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach(t => {
                t.stop();
                localStreamRef.current?.removeTrack(t);
              });
              localStreamRef.current.addTrack(cameraVideoTrack);
            }
            await publishWhip(localStreamRef.current, classItem.whipUrl);
            await updateStreamTimestamp({ liveClassId: id as any }).catch(console.error);
          }
        } else {
          if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(t => {
              t.stop();
              localStreamRef.current?.removeTrack(t);
            });
            localStreamRef.current.addTrack(cameraVideoTrack);
          }
        }

        // 3. Update local video preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = localStreamRef.current;
        }

        toast.info("Switched stream back to webcam feed.");
      } else {
        // Switch to screen share with compatible resolution and frame rate constraints
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 15, max: 30 }
          },
          audio: true
        });
        const screenVideoTrack = screenStream.getVideoTracks()[0];
        const screenAudioTrack = screenStream.getAudioTracks()[0];
        setIsScreenSharing(true);

        // 1. Get existing mic track
        const micAudioTrack = localStreamRef.current?.getAudioTracks()[0];

        // 2. Create a combined stream for fallback publishing
        const combinedTracks: MediaStreamTrack[] = [screenVideoTrack];
        if (micAudioTrack) combinedTracks.push(micAudioTrack);
        if (screenAudioTrack) combinedTracks.push(screenAudioTrack);
        const combinedStream = new MediaStream(combinedTracks);

        // 3. Replace track on existing session if active
        if (isBroadcasting && whipPcRef.current) {
          const videoSender = whipPcRef.current.getSenders().find(s => s.track?.kind === "video");
          if (videoSender) {
            await videoSender.replaceTrack(screenVideoTrack);
          } else {
            await terminateWhipSession();
            whipPcRef.current.close();
            whipPcRef.current = null;
            await publishWhip(combinedStream, classItem.whipUrl);
            await updateStreamTimestamp({ liveClassId: id as any }).catch(console.error);
          }
        } else {
          if (localStreamRef.current) {
            localStreamRef.current.getVideoTracks().forEach(t => {
              t.stop();
              localStreamRef.current?.removeTrack(t);
            });
            localStreamRef.current.addTrack(screenVideoTrack);
          }
        }

        // 4. Update local video preview
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // 5. Handle stop sharing clicked inside browser window share bar
        screenVideoTrack.onended = async () => {
          setIsScreenSharing(false);

          const constraints = {
            video: selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : true,
            audio: false,
          };
          const cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
          const cameraVideoTrack = cameraStream.getVideoTracks()[0];

          if (isBroadcasting && whipPcRef.current) {
            const videoSender = whipPcRef.current.getSenders().find(s => s.track?.kind === "video");
            if (videoSender) {
              await videoSender.replaceTrack(cameraVideoTrack);
            } else {
              if (whipPcRef.current) {
                await terminateWhipSession();
                whipPcRef.current.close();
                whipPcRef.current = null;
              }
              if (localStreamRef.current) {
                localStreamRef.current.getVideoTracks().forEach(t => {
                  t.stop();
                  localStreamRef.current?.removeTrack(t);
                });
                localStreamRef.current.addTrack(cameraVideoTrack);
              }
              await publishWhip(localStreamRef.current, classItem.whipUrl);
              await updateStreamTimestamp({ liveClassId: id as any }).catch(console.error);
            }
          } else {
            if (localStreamRef.current) {
              localStreamRef.current.getVideoTracks().forEach(t => {
                t.stop();
                localStreamRef.current?.removeTrack(t);
              });
              localStreamRef.current.addTrack(cameraVideoTrack);
            }
          }

          if (localVideoRef.current) {
            localVideoRef.current.srcObject = localStreamRef.current;
          }

          toast.info("Switched stream back to webcam feed.");
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
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Side: Video Viewport */}
        <section className="flex-1 flex flex-col bg-zinc-950 p-4 md:p-6 overflow-hidden justify-center items-center relative">
          
          {/* Top-Left Floating Room Info Badge */}
          <div className="absolute top-8 left-8 z-20 flex items-center gap-3">
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
          <div className="absolute top-8 right-8 z-20 flex items-center gap-2.5">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-red-500/20 text-red-200 text-xs font-semibold shadow-lg backdrop-blur border border-red-500/35">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              Transcribing
            </div>
          </div>

          {/* Video Arena Viewport */}
          <div className="w-full h-full rounded-2xl overflow-hidden bg-zinc-900/60 border border-zinc-900 relative shadow-2xl group flex items-center justify-center">
            
            {/* Muted or Camera Blocked Alert overlay */}
            {(myMuteStatus || myBlockCameraStatus) && (
              <div className="absolute top-20 left-6 flex flex-col gap-2 z-35 pointer-events-none max-w-xs md:max-w-sm">
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
                {!isBroadcasting && (
                  <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-4 z-10 transition-all">
                    <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-2">
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
                    <div className="absolute bottom-6 left-6 flex gap-2">
                      <Badge className="bg-zinc-950/85 backdrop-blur border border-zinc-800 text-zinc-300 font-normal">
                        Stream: Cloudflare Live (Sub-second WebRTC)
                      </Badge>
                    </div>

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

        {/* Right Side: Interactive Side Panel         {/* Right Side: Collapsible Sidebar */}
        {showSidebar && (
          <aside className="w-full md:w-80 border-l border-zinc-900 bg-zinc-950 flex flex-col overflow-hidden shrink-0 z-20">
            
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
                  {!isCreator && (
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
                      {isCreator && raisedHands.length > 0 && (
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
                            
                            {isCreator && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2.5 rounded-lg bg-amber-505/15 hover:bg-amber-505/25 text-[10px] text-amber-500 font-semibold"
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

                  {/* Student Roster Section (Online vs Offline) */}
                  <div className="flex-1 overflow-hidden flex flex-col">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-3 shrink-0">
                      <Users className="h-3.5 w-3.5" />
                      Student Roster
                    </h3>

                    <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                      
                      {/* Online list */}
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold text-emerald-500 flex items-center gap-1.5 px-1 uppercase tracking-wider">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          Online ({participants.filter((p: any) => p.isOnline).length})
                        </div>
                        {participants.filter((p: any) => p.isOnline).length === 0 ? (
                          <p className="text-[11px] text-zinc-600 italic pl-1">No students online.</p>
                        ) : (
                          <div className="space-y-1.5">
                            {participants.filter((p: any) => p.isOnline).map((p: any) => (
                              <div key={p.studentId} className="flex items-center justify-between p-2 rounded-xl bg-zinc-900 border border-zinc-850">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-[10px] font-bold text-emerald-450 shrink-0">
                                    {p.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span className="text-xs font-medium text-zinc-200 truncate" title={p.name}>{p.name}</span>
                                </div>
                                
                                <div className="flex items-center gap-1 shrink-0">
                                  {isCreator ? (
                                    <>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className={cn("h-7 w-7 rounded-lg", p.isMuted ? "text-red-500 hover:bg-red-950/20" : "text-zinc-400 hover:bg-zinc-800")}
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
                                        className={cn("h-7 w-7 rounded-lg", p.isCameraBlocked ? "text-red-500 hover:bg-red-955/20" : "text-zinc-400 hover:bg-zinc-800")}
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
                                        className="h-7 w-7 text-red-550 hover:text-red-400 hover:bg-red-955/20 rounded-lg"
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
                  </div>

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
      <footer className="h-20 bg-zinc-955 flex items-center justify-between px-6 border-t border-zinc-900 z-30 shrink-0 select-none">
        
        {/* Left Column: Room clock and code */}
        <div className="flex items-center gap-4 text-sm font-medium text-zinc-400 min-w-[200px]">
          <span className="text-white font-medium">{timeStr}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-zinc-800"></span>
          <span className="font-mono tracking-wider text-zinc-300 font-semibold">{getRoomCode()}</span>
        </div>

        {/* Center Column: Control Circle Buttons */}
        <div className="flex items-center gap-3">
          
          {/* Mute Mic */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full border transition-all relative shrink-0",
              isMuted 
                ? "bg-red-500/20 border-red-500 text-red-505 hover:bg-red-500/30" 
                : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
            )}
            onClick={toggleMute}
            title={isMuted ? "Unmute Mic" : "Mute Mic"}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            {isMuted && <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-yellow-500 border-2 border-zinc-950" />}
          </Button>

          {/* Video Camera */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full border transition-all relative shrink-0",
              isVideoOff 
                ? "bg-red-500/20 border-red-500 text-red-505 hover:bg-red-500/30" 
                : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
            )}
            onClick={toggleVideo}
            title={isVideoOff ? "Turn On Camera" : "Turn Off Camera"}
          >
            {isVideoOff ? <VideoOff className="h-5 w-5" /> : <VideoIcon className="h-5 w-5" />}
            {isVideoOff && <span className="absolute top-0 right-0 w-2.5 h-2.5 rounded-full bg-yellow-500 border-2 border-zinc-950" />}
          </Button>

          {/* Screen Share (Teacher only) */}
          {isCreator && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-12 w-12 rounded-full border transition-all shrink-0",
                isScreenSharing 
                  ? "bg-emerald-500/20 border-emerald-500 text-emerald-500 hover:bg-emerald-500/30" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
              )}
              onClick={toggleScreenShare}
              title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
            >
              <Monitor className="h-5 w-5" />
            </Button>
          )}

          {/* Whiteboard Button (Opens whiteboard in a new tab) */}
          <Button
            variant="ghost"
            size="icon"
            className="h-12 w-12 rounded-full border bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700 transition-all shrink-0"
            onClick={() => window.open("/whiteboard", "_blank")}
            title="Open Whiteboard Canvas"
          >
            <Presentation className="h-5 w-5" />
          </Button>

          {/* Closed Captions toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full border transition-all shrink-0",
              isCcEnabled 
                ? "bg-sky-500/20 border-sky-500 text-sky-400 hover:bg-sky-500/30" 
                : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
            )}
            onClick={() => setIsCcEnabled(!isCcEnabled)}
            title={isCcEnabled ? "Disable Captions" : "Enable Captions"}
          >
            <Subtitles className="h-5 w-5" />
          </Button>

          {/* Raise Hand (Student only) */}
          {!isCreator && (
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-12 w-12 rounded-full border transition-all shrink-0",
                myHandRaised 
                  ? "bg-amber-500 border-amber-505 text-zinc-950 hover:bg-amber-600 hover:border-amber-605" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
              )}
              onClick={handleRaiseHand}
              title={myHandRaised ? "Lower Hand" : "Raise Hand"}
            >
              <Hand className="h-5 w-5" />
            </Button>
          )}

          {/* Reactions popover trigger */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-12 w-12 rounded-full border transition-all shrink-0",
                showReactionsMenu
                  ? "bg-zinc-800 border-zinc-700 text-white"
                  : "bg-zinc-900 border-zinc-800 text-zinc-200 hover:bg-zinc-800 hover:border-zinc-700"
              )}
              onClick={() => setShowReactionsMenu(!showReactionsMenu)}
              title="Reactions"
            >
              <Smile className="h-5 w-5" />
            </Button>

            {/* Floating Reactions Toolbar */}
            {showReactionsMenu && (
              <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 p-1.5 rounded-full shadow-2xl z-40 animate-in fade-in slide-in-from-bottom-2 duration-200">
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
          {isCreator ? (
            <Button
              className="bg-red-600 hover:bg-red-750 text-white rounded-full px-5 py-2 h-12 gap-2 border border-red-500/20 font-semibold shadow-lg shadow-red-600/10 shrink-0"
              onClick={handleEndStream}
            >
              <PhoneOff className="h-5 w-5" />
              <span className="hidden md:inline">End Class</span>
            </Button>
          ) : (
            <Button
              className="bg-red-650 hover:bg-red-750 text-white rounded-full px-5 py-2 h-12 gap-2 border border-red-500/20 font-semibold shadow-lg shadow-red-600/10 shrink-0"
              onClick={() => navigate("/lives")}
            >
              <PhoneOff className="h-5 w-5" />
              <span className="hidden md:inline">Leave</span>
            </Button>
          )}

        </div>

        {/* Right Column: Toggle Sidebar and Settings Buttons */}
        <div className="flex items-center gap-2 min-w-[200px] justify-end">
          
          {/* People Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full transition-all relative shrink-0",
              showSidebar && activeTab === "interactions"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            )}
            onClick={() => toggleSidebarTab("interactions")}
            title="People & Roster"
          >
            <Users className="h-5 w-5" />
            {raisedHands.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-amber-500 text-[9px] font-bold text-zinc-950 rounded-full flex items-center justify-center animate-pulse border border-zinc-950">
                {raisedHands.length}
              </span>
            )}
          </Button>

          {/* Chat Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-12 w-12 rounded-full transition-all relative shrink-0",
              showSidebar && activeTab === "chat"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
            )}
            onClick={() => toggleSidebarTab("chat")}
            title="Chat"
          >
            <MessageSquare className="h-5 w-5" />
            {chatMessages.length > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-650 text-[9px] font-bold text-white rounded-full flex items-center justify-center border border-zinc-955">
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
                "h-12 w-12 rounded-full transition-all relative shrink-0",
                showSidebar && activeTab === "waiting"
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
              )}
              onClick={() => toggleSidebarTab("waiting")}
              title="Waiting Room"
            >
              <Clock className="h-5 w-5" />
              {pendingApprovals.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 text-[9px] font-bold text-white rounded-full flex items-center justify-center animate-pulse border border-zinc-950">
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
                "h-12 w-12 rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-all shrink-0",
                showSettings && "bg-zinc-800 text-white"
              )}
              onClick={() => setShowSettings(!showSettings)}
              title="Settings"
            >
              <Settings className="h-5 w-5" />
            </Button>
          )}

          {/* Invite dialog button (Teacher only) */}
          {isTeacher && (
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 rounded-full text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200 transition-all shrink-0"
              onClick={() => setShowInvite(true)}
              title="Invite Students"
            >
              <Users className="h-5 w-5" />
            </Button>
          )}

        </div>

      </footer>

      {isTeacher && <InviteDialog open={showInvite} onClose={() => setShowInvite(false)} liveClass={classItem} />}
    </div>
  );
}
