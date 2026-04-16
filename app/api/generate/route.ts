import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { TripOptions } from "@/app/types";

const client = new Anthropic();

const generateTool: Anthropic.Tool = {
  name: "generate_trip_options",
  description: "Generate hotel, flight, and itinerary options for a trip",
  input_schema: {
    type: "object" as const,
    properties: {
      hotels: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            price_per_night: { type: "number" },
            rating: { type: "number" },
            tier: { type: "string", enum: ["budget", "mid", "luxury"] },
            location: { type: "string" },
            image_query: { type: "string" },
            pros: { type: "array", items: { type: "string" } },
            cons: { type: "array", items: { type: "string" } },
          },
          required: ["name", "price_per_night", "rating", "tier", "location", "image_query", "pros", "cons"],
        },
      },
      flights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            airline: { type: "string" },
            departure_time: { type: "string" },
            arrival_time: { type: "string" },
            price: { type: "number" },
            duration_minutes: { type: "number" },
          },
          required: ["airline", "departure_time", "arrival_time", "price", "duration_minutes"],
        },
      },
      itinerary: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: { type: "number" },
            pace: { type: "string", enum: ["packed", "balanced", "relaxed"] },
            activities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  time: { type: "string" },
                  place: { type: "string" },
                  duration_minutes: { type: "number" },
                  travel_from_prev_minutes: { type: "number" },
                },
                required: ["time", "place", "duration_minutes", "travel_from_prev_minutes"],
              },
            },
          },
          required: ["day", "pace", "activities"],
        },
      },
    },
    required: ["hotels", "flights", "itinerary"],
  },
};

// Fallback demo data if API fails
const fallbackData: TripOptions = {
  hotels: [
    {
      name: "Ibis Paris Gare de Lyon",
      price_per_night: 89,
      rating: 4.1,
      tier: "budget",
      location: "Gare de Lyon, 12th arrondissement",
      image_query: "paris budget hotel modern room city view",
      pros: ["Great transit access", "Clean rooms", "24h reception"],
      cons: ["Small rooms", "No pool"],
    },
    {
      name: "Hotel Molitor Paris",
      price_per_night: 195,
      rating: 4.6,
      tier: "mid",
      location: "Bois de Boulogne, 16th arrondissement",
      image_query: "paris hotel molitor pool art deco",
      pros: ["Iconic pool", "Central location", "Great breakfast"],
      cons: ["Pricier bar", "Can be busy"],
    },
    {
      name: "Le Meurice",
      price_per_night: 850,
      rating: 4.9,
      tier: "luxury",
      location: "Tuileries Garden, 1st arrondissement",
      image_query: "paris palace hotel luxury chandelier golden interior",
      pros: ["Palace hotel", "Michelin dining", "Tuileries views"],
      cons: ["Very expensive", "Formal dress expected"],
    },
  ],
  flights: [
    {
      airline: "Air France",
      departure_time: "07:15",
      arrival_time: "10:30",
      price: 420,
      duration_minutes: 135,
    },
    {
      airline: "Delta Airlines",
      departure_time: "13:00",
      arrival_time: "16:20",
      price: 380,
      duration_minutes: 140,
    },
    {
      airline: "United Airlines",
      departure_time: "22:00",
      arrival_time: "11:45+1",
      price: 290,
      duration_minutes: 465,
    },
  ],
  itinerary: [
    {
      day: 1,
      pace: "balanced",
      activities: [
        { time: "10:00", place: "Eiffel Tower", duration_minutes: 90, travel_from_prev_minutes: 0 },
        { time: "12:30", place: "Café de Flore lunch", duration_minutes: 60, travel_from_prev_minutes: 20 },
        { time: "14:30", place: "Louvre Museum", duration_minutes: 150, travel_from_prev_minutes: 15 },
        { time: "18:00", place: "Seine River Walk", duration_minutes: 60, travel_from_prev_minutes: 10 },
      ],
    },
  ],
};

export async function POST(req: NextRequest) {
  try {
    const { destination, start_date, end_date, must_see } = await req.json();

    const userPrompt = `Plan a trip to ${destination} from ${start_date} to ${end_date}.
Must-see events/places: ${must_see || "no specific preferences"}.

Generate exactly 3 hotel options (budget/mid/luxury), exactly 3 flight options (morning/afternoon/evening departure), and a day-by-day itinerary. Day 1 pace should be "balanced" — it will be adjusted by user selection. All subsequent days default to "balanced".

For each hotel include:
- location: the specific neighborhood or area (e.g. "Le Marais, 4th arrondissement" or "Near Times Square, Midtown Manhattan")
- image_query: 3-5 descriptive keywords for finding a photo of this hotel or its surroundings (e.g. "paris boutique hotel marble lobby" or "tokyo ryokan traditional room tatami")`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      tools: [generateTool],
      tool_choice: { type: "any" },
      messages: [{ role: "user", content: userPrompt }],
    });

    const toolUse = response.content.find((b) => b.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return NextResponse.json(fallbackData);
    }

    return NextResponse.json(toolUse.input as TripOptions);
  } catch (err) {
    console.error("Generate error:", err);
    return NextResponse.json(fallbackData);
  }
}
