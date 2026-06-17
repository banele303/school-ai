import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";

type CognitiveRadarProps = {
  questions?: Array<{ cognitiveLevel?: string; topic?: string; points?: number }>;
  className?: string;
};

const LABELS: Record<string, string> = {
  knowledge: "Knowledge",
  routine: "Routine",
  complex: "Complex",
  problem_solving: "Problem Solving",
};

const CognitiveRadar = ({ questions = [], className }: CognitiveRadarProps) => {
  const totals = questions.reduce<Record<string, number>>(
    (acc, question) => {
      const key = question.cognitiveLevel || "knowledge";
      acc[key] = (acc[key] || 0) + (question.points || 1);
      return acc;
    },
    { knowledge: 0, routine: 0, complex: 0, problem_solving: 0 }
  );

  const max = Math.max(...Object.values(totals), 1);
  const data = Object.entries(totals).map(([key, value]) => ({
    domain: LABELS[key] || key,
    mastery: Math.round((value / max) * 100),
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={220}>
        <RadarChart data={data} outerRadius={76}>
          <PolarGrid stroke="rgba(148, 163, 184, 0.35)" />
          <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fill: "currentColor" }} />
          <Radar
            dataKey="mastery"
            stroke="#22d3ee"
            fill="#22d3ee"
            fillOpacity={0.28}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CognitiveRadar;
