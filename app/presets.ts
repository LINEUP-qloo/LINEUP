// Demo bills offered on the landing page and in the tool. Real artists and cities; results are always fetched live.
export const PRESETS = [
  { label: "Tyler · Phoebe · Fred", names: ["Tyler, the Creator", "Phoebe Bridgers", "Fred again.."], cities: ["Los Angeles"] },
  { label: "Tyler, the Creator", names: ["Tyler, the Creator"], cities: ["Atlanta"] },
  { label: "Phoebe Bridgers", names: ["Phoebe Bridgers"], cities: ["Nashville"] },
  { label: "Fred · 3-city run", names: ["Fred again.."], cities: ["Los Angeles", "New York City", "Chicago"] },
];

/** /app link that opens a preset ready to run. */
export const presetHref = (p: (typeof PRESETS)[number]) => {
  const q = new URLSearchParams();
  p.names.forEach((n) => q.append("h", n));
  p.cities.forEach((c) => q.append("city", c));
  return `/app?${q}`;
};
