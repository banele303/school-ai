import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Copy, Loader2, Play, RadioTower, Swords, Trophy, Users } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/AuthProvider";

const ExamArena = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState("");
  const [createdArenaId, setCreatedArenaId] = useState<string | null>(null);

  const createArena = useMutation((api as any).arenas.createArena);
  const joinArena = useMutation((api as any).arenas.joinArena);
  const startArena = useMutation((api as any).arenas.startArena);
  const activeArenas = useQuery((api as any).arenas.getActiveArenas, {});
  const arena = useQuery(
    (api as any).arenas.getArena,
    createdArenaId ? { arenaId: createdArenaId as any } : "skip"
  );

  const selectedArena = arena || activeArenas?.find((item: any) => item._id === createdArenaId);
  const participants = selectedArena?.participants || [];
  const questionCount = selectedArena?.examDetails?.questions?.length || 1;
  const isHost = selectedArena?.host === user?._id;

  const podium = useMemo(
    () => [...participants].sort((a: any, b: any) => b.score - a.score || b.progress - a.progress).slice(0, 3),
    [participants]
  );

  const handleCreate = async () => {
    if (!id) return;
    const result = await createArena({ examId: id as any });
    setCreatedArenaId(result.arenaId);
    toast.success(`Arena ${result.code} created`);
  };

  const handleJoin = async (code: string) => {
    const result = await joinArena({ code });
    navigate(`/lms/exams/${result.examId}?arena=${result.arenaId}`);
  };

  const handleStart = async () => {
    if (!selectedArena) return;
    const result = await startArena({ arenaId: selectedArena._id });
    navigate(`/lms/exams/${result.examId}?arena=${selectedArena._id}`);
  };

  return (
    <div className="min-h-[calc(100vh-2rem)] bg-zinc-950 text-zinc-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <Badge className="mb-3 border-cyan-400/30 bg-cyan-400/10 text-cyan-100">
              <RadioTower className="mr-1 h-3.5 w-3.5" /> Live Battle Arena
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight">Exam Battle Arena</h1>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Host a timed CAPS challenge, share the battle code, and track every learner in real time.
            </p>
          </div>
          {id && (
            <Button onClick={handleCreate} className="bg-cyan-400 text-zinc-950 hover:bg-cyan-300">
              <Swords className="mr-2 h-4 w-4" /> Host This Exam
            </Button>
          )}
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-cyan-400/20 bg-white/[0.04] text-zinc-50 shadow-2xl shadow-cyan-950/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-lg">
                Battle Lobby
                {selectedArena && <Badge variant="outline" className="border-cyan-400/40 text-cyan-100">{selectedArena.code}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {!selectedArena ? (
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <Input
                    value={joinCode}
                    onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                    placeholder="BATTLE-293"
                    className="border-zinc-700 bg-zinc-900 text-zinc-50"
                  />
                  <Button variant="secondary" onClick={() => handleJoin(joinCode)} disabled={!joinCode.trim()}>
                    Join Arena
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between rounded-md border border-cyan-400/20 bg-cyan-400/10 p-3">
                    <div>
                      <div className="text-xs uppercase tracking-wide text-cyan-200">Share Code</div>
                      <div className="font-mono text-2xl font-bold">{selectedArena.code}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard?.writeText(selectedArena.code);
                        toast.success("Code copied");
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid gap-3">
                    {participants.map((participant: any) => (
                      <div key={participant.studentId} className="rounded-md border border-zinc-800 bg-zinc-900/70 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 font-medium">
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-cyan-400/15 text-cyan-100">
                              {participant.name?.[0] || "L"}
                            </span>
                            {participant.name}
                          </div>
                          <Badge variant="outline" className="border-zinc-700 text-zinc-300">
                            {participant.progress}/{questionCount}
                          </Badge>
                        </div>
                        <Progress value={(participant.progress / questionCount) * 100} />
                      </div>
                    ))}
                  </div>

                  {isHost && selectedArena.status === "waiting" && (
                    <Button onClick={handleStart} className="w-full bg-cyan-400 text-zinc-950 hover:bg-cyan-300">
                      <Play className="mr-2 h-4 w-4" /> Launch Countdown
                    </Button>
                  )}
                </>
              )}

              {activeArenas === undefined && !selectedArena && (
                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading live arenas
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-fuchsia-400/20 bg-white/[0.04] text-zinc-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5 text-amber-300" /> Battle Podium
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {podium.length === 0 ? (
                <div className="flex h-52 items-center justify-center rounded-md border border-dashed border-zinc-800 text-sm text-zinc-500">
                  Waiting for contenders
                </div>
              ) : (
                podium.map((participant: any, index: number) => (
                  <div key={participant.studentId} className="flex items-center justify-between rounded-md bg-zinc-900/80 p-3">
                    <div className="flex items-center gap-3">
                      <div className="grid h-9 w-9 place-items-center rounded bg-amber-300/15 font-bold text-amber-200">
                        {index + 1}
                      </div>
                      <div>
                        <div className="font-medium">{participant.name}</div>
                        <div className="text-xs text-zinc-500">Prestige Level {Math.max(1, Math.ceil(participant.score / 10))}</div>
                      </div>
                    </div>
                    <Badge className="bg-fuchsia-500/20 text-fuchsia-100">{participant.score} XP</Badge>
                  </div>
                ))
              )}
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Users className="h-3.5 w-3.5" /> Podium updates as learners submit progress.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ExamArena;
