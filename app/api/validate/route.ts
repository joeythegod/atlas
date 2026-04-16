import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { ValidationResult } from "@/app/types";

const client = new Anthropic();

const validateTool: Anthropic.Tool = {
  name: "validate_trip",
  description: "Check if the selected trip components have any scheduling or logistics conflicts",
  input_schema: {
    type: "object" as const,
    properties: {
      has_conflict: { type: "boolean" },
      conflict_message: { type: "string" },
      conflict_type: { type: "string", enum: ["hotel", "flight", "itinerary", "none"] },
    },
    required: ["has_conflict", "conflict_message", "conflict_type"],
  },
};

const noConflict: ValidationResult = {
  has_conflict: false,
  conflict_message: "",
  conflict_type: "none",
};

export async function POST(req: NextRequest) {
  try {
    const { hotel, flight, pace, itinerary_day } = await req.json();

    const prompt = `Check this travel plan for scheduling or logistics conflicts:

Flight: ${flight.airline}, departs ${flight.departure_time}, arrives ${flight.arrival_time}
Hotel: ${hotel.name} (${hotel.tier} tier, $${hotel.price_per_night}/night)
Day 1 pace: ${pace}
Day 1 itinerary: ${JSON.stringify(itinerary_day?.activities ?? [])}

Look for:
- Flight arrival time vs hotel check-in availability (hotels typically check in at 3pm)
- Whether the first activity is feasible given arrival time
- Whether the day's schedule is realistic given the chosen pace

If there's a real conflict, describe it concisely (one sentence). If everything looks fine, set has_conflict to false.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 512,
      tools: [validateTool],
      tool_choice: { type: "any" },
      messages: [{ role: "user", content: prompt }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(noConflict);
    }

    return NextResponse.json(toolUse.input as ValidationResult);
  } catch (err) {
    console.error("Validate error:", err);
    // Soft fail — let user proceed
    return NextResponse.json(noConflict);
  }
}
