export const CAREER_GOALS = [
  "Web Development",
  "AI/ML",
  "Startups & Funding",
  "Open Source",
  "Product Management",
  "UI/UX Design",
  "App Development",
  "Cybersecurity",
  "Blockchain",
  "Internships",
  "Certificates",
  "Networking",
  "Hackathons",
  "Fun"
] as const;

export type CareerGoal = typeof CAREER_GOALS[number];