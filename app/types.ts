export interface Hotel {
  name: string;
  price_per_night: number;
  rating: number;
  tier: "budget" | "mid" | "luxury";
  location: string;       // e.g. "Marais District, 4th arrondissement"
  image_query: string;    // e.g. "paris boutique hotel lobby interior"
  pros: string[];
  cons: string[];
}

export interface Flight {
  airline: string;
  departure_time: string;
  arrival_time: string;
  price: number;
  duration_minutes: number;
}

export interface Activity {
  time: string;
  place: string;
  duration_minutes: number;
  travel_from_prev_minutes: number;
}

export interface ItineraryDay {
  day: number;
  pace: "packed" | "balanced" | "relaxed";
  activities: Activity[];
}

export interface TripOptions {
  hotels: Hotel[];
  flights: Flight[];
  itinerary: ItineraryDay[];
}

export interface TripInput {
  destination: string;
  start_date: string;
  end_date: string;
  must_see: string;
}

export interface Selections {
  hotel: Hotel | null;
  flight: Flight | null;
  pace: "packed" | "balanced" | "relaxed" | null;
}

export interface ValidationResult {
  has_conflict: boolean;
  conflict_message: string;
  conflict_type: "hotel" | "flight" | "itinerary" | "none";
}
