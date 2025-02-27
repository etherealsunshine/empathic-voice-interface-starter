"use client";
import { expressionColors } from "@/utils/expressionColors";
import { expressionLabels } from "@/utils/expressionLabels";
type ExpressionsProps = {
  values: Record<string, number>;
};

export default function Expressions({ values }: ExpressionsProps) {
  const sortedEmotions = Object.entries(values)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  return (
    <div className="mt-4 flex gap-4">
      {sortedEmotions.map(([emotion, score]) => (
        <div key={emotion} className="flex items-center gap-2">
          <span className="font-medium">{emotion}:</span>
          <span>{score.toFixed(2)}</span>
        </div>
      ))}
    </div>
  );
}
