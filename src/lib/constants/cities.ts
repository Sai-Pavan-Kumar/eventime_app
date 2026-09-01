export const CITIES = [
  "Ahmedabad", "Anantapur", "Bengaluru", "Bhopal", "Chennai", "Coimbatore", "Guntur", "Gurugram",
  "Hyderabad", "Indore", "Jaipur", "Kakinada", "Kanpur", "Karimnagar", "Khammam",
  "Kochi", "Kolkata", "Lucknow", "Mangaluru", "Mumbai", "Mysuru", "Nagpur", "New Delhi",
  "Nizamabad", "Noida", "Online", "Pune", "Thiruvananthapuram", "Tirupati", "Vijayawada",
  "Visakhapatnam", "Warangal"
] as const;

export type City = typeof CITIES[number];
