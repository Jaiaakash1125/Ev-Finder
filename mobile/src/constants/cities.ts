export interface CityCoordinate {
  lat: number;
  lng: number;
  zoom: number;
}

export const INDIA_CENTER: CityCoordinate = {
  lat: 20.5937,
  lng: 78.9629,
  zoom: 5,
};

export const BENGALURU_CENTER: CityCoordinate = {
  lat: 12.9716,
  lng: 77.5946,
  zoom: 12,
};

export const cityCoordinates: Record<string, CityCoordinate> = {
  Bengaluru: { lat: 12.9716, lng: 77.5946, zoom: 12 },
  Mumbai: { lat: 19.076, lng: 72.8777, zoom: 12 },
  "New Delhi": { lat: 28.6139, lng: 77.209, zoom: 12 },
  Gurugram: { lat: 28.4595, lng: 77.0266, zoom: 12 },
  Noida: { lat: 28.5355, lng: 77.391, zoom: 12 },
  Hyderabad: { lat: 17.385, lng: 78.4867, zoom: 12 },
  Chennai: { lat: 13.0827, lng: 80.2707, zoom: 12 },
  Pune: { lat: 18.5204, lng: 73.8567, zoom: 12 },
  Kolkata: { lat: 22.5726, lng: 88.3639, zoom: 12 },
  Ahmedabad: { lat: 23.0225, lng: 72.5714, zoom: 12 },
  Jaipur: { lat: 26.9124, lng: 75.7873, zoom: 12 },
  Kochi: { lat: 9.9312, lng: 76.2673, zoom: 12 },
  Chandigarh: { lat: 30.7333, lng: 76.7794, zoom: 12 },
  Lucknow: { lat: 26.8467, lng: 80.9462, zoom: 12 },
  Surat: { lat: 21.1702, lng: 72.8311, zoom: 12 },
  Indore: { lat: 22.7196, lng: 75.8577, zoom: 12 },
  Coimbatore: { lat: 11.0168, lng: 76.9558, zoom: 12 },
  Goa: { lat: 15.2993, lng: 74.124, zoom: 11 },
  Nagpur: { lat: 21.1458, lng: 79.0882, zoom: 12 },
  Vadodara: { lat: 22.3072, lng: 73.1812, zoom: 12 },
  Bhopal: { lat: 23.2599, lng: 77.4126, zoom: 12 },
  Visakhapatnam: { lat: 17.6868, lng: 83.2185, zoom: 12 },
  Patna: { lat: 25.5941, lng: 85.1376, zoom: 12 },
  Agra: { lat: 27.1767, lng: 78.0081, zoom: 12 },
  Varanasi: { lat: 25.3176, lng: 82.9739, zoom: 12 },
  Amritsar: { lat: 31.634, lng: 74.8723, zoom: 12 },
  Bhubaneswar: { lat: 20.2961, lng: 85.8245, zoom: 12 },
  Guwahati: { lat: 26.1445, lng: 91.7362, zoom: 12 },
  Dehradun: { lat: 30.3165, lng: 78.0322, zoom: 12 },
  Thiruvananthapuram: { lat: 8.5241, lng: 76.9366, zoom: 12 },
  Mysore: { lat: 12.2958, lng: 76.6394, zoom: 12 },
  Mangalore: { lat: 12.9141, lng: 74.856, zoom: 12 },
  Ludhiana: { lat: 30.901, lng: 75.8573, zoom: 12 },
  Kanpur: { lat: 26.4499, lng: 80.3319, zoom: 12 },
  Nashik: { lat: 19.9975, lng: 73.7898, zoom: 12 },
  Rajkot: { lat: 22.3039, lng: 70.8022, zoom: 12 },
  Vijayawada: { lat: 16.5062, lng: 80.648, zoom: 12 },
  Madurai: { lat: 9.9252, lng: 78.1198, zoom: 12 },
  Raipur: { lat: 21.2514, lng: 81.6296, zoom: 12 },
  Ranchi: { lat: 23.3441, lng: 85.3096, zoom: 12 },
  Jodhpur: { lat: 26.2389, lng: 73.0243, zoom: 12 },
  Udaipur: { lat: 24.5854, lng: 73.7125, zoom: 12 },
};

export const TOP_CITIES = [
  "Bengaluru",
  "Mumbai",
  "New Delhi",
  "Hyderabad",
  "Chennai",
  "Pune",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Kochi",
  "Chandigarh",
  "Goa",
];

export const MAJOR_CITIES = Object.keys(cityCoordinates).sort();
