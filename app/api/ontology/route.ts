import { NextResponse } from "next/server";

const INTERVIEW_TOPIC_WEIGHTS: Record<string, number> = {
  React: 0.38,
  JavaScript: 0.23,
  "State Management": 0.12,
  Routing: 0.08,
  TypeScript: 0.07,
  Testing: 0.04,
  Accessibility: 0.03,
  CSS: 0.03,
  HTML: 0.02,
  PWA: 0.02,
};

export async function GET() {
  const totalWeight = Object.values(INTERVIEW_TOPIC_WEIGHTS).reduce((sum, value) => sum + value, 0);

  return NextResponse.json({
    success: true,
    topics: INTERVIEW_TOPIC_WEIGHTS,
    totalWeight,
  });
}
