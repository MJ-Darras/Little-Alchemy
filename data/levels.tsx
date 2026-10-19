export type Level = {
  id: string;
  title: string;
  scenario: string;
  availableChemicalIds: string[];
  goalChemicalIds: string[];
  goalChemicalRoles: string[];
};

// Updated to match DB
export const LEVELS: Level[] = [
  {
    id: "1",
    title: "The Source of Life",
    scenario:
      "Explore the basic chemicals that form the building blocks of life.",
    availableChemicalIds: ["hydrogen", "oxygen", "carbon", "phosphorus"],
    goalChemicalIds: ["water", "glucose", "deoxyribose", "phospholipid"],
    goalChemicalRoles: [
      "Universal solvent for biological reactions",
      "Primary energy source for living cells",
      "Sugar backbone of DNA strands",
      "Forms the cell membrane layer",
    ],
  },

  {
    id: "2",
    title: "Pollution",
    scenario: "Learn about chemicals involved in harming the environment",
    availableChemicalIds: [
      "sulfur",
      "oxygen",
      "nitrogen",
      "hydrogen",
      "sodium",
    ],
    goalChemicalIds: ["sulfur-dioxide", "ammonia", "sulfuric-acid"],
    goalChemicalRoles: [
      "Causes acid rain and air pollution",
      "Toxic gas contributing to smog formation",
      "Highly corrosive component of acid rain",
    ],
  },

  {
    id: "3",
    title: "The Kitchen Lab",
    scenario:
      "From cooking to cleaning, discover chemicals behind everyday kitchen reactions.",
    availableChemicalIds: [
      "carbon",
      "oxygen",
      "sodium",
      "chlorine",
      "hydrogen",
    ],
    goalChemicalIds: [
      "carbon-dioxide",
      "salt",
      "sodium-hydroxide",
      "acetic-acid",
    ],
    goalChemicalRoles: [
      "Makes baked goods rise when heated",
      "Preserves food and enhances flavour",
      "Strong base used in drain cleaners",
      "Active component that gives vinegar its tang",
    ],
  },

  {
    id: "4",
    title: "Space Chemistry",
    scenario:
      "Investigate chemicals that form in space, creating molecules found in stars, planets, and cosmic dust.",
    availableChemicalIds: [
      "hydrogen",
      "carbon",
      "sulfur",
      "nitrogen",
      "helium",
      "silicon",
      "iron",
    ],
    goalChemicalIds: [
      "methane",
      "silicon-carbide",
      "helium-hydride",
      "iron-sulfide",
    ],
    goalChemicalRoles: [
      "Found in planetary atmospheres and comets",
      "Stardust grain from ancient stellar explosions",
      "First molecule ever formed in the universe",
      "Common mineral in meteorites and planet cores",
    ],
  },

  {
    id: "5",
    title: "The First Aid Kit",
    scenario:
      "Examine chemicals in common first aid supplies that help treat injuries, pain, and health issues.",
    availableChemicalIds: [
      "calcium",
      "carbon",
      "oxygen",
      "phosphorus",
      "hydrogen",
      "nitrogen"
    ],
    goalChemicalIds: ["calcium-carbonate", "calcium-phosphate", "aspirin"],
    goalChemicalRoles: [
      "Neutralizes stomach acid as an antacid",
      "Mineral that hardens bones and teeth",
      "Relieves pain, fever, and inflammation",
    ],
  },
  {
    id: "6",
    title: "Feeding the World",
    scenario:
      "Discover how the Haber Process transformed agriculture by producing ammonia and enabling the large-scale creation of fertilizers and industrial chemicals.",
    availableChemicalIds: [
      "hydrogen",
      "nitrogen",
      "oxygen",
      "methane",
      "carbon",
    ],
    goalChemicalIds: ["ammonia", "nitric-acid", "ammonium-nitrate", "urea"],
    goalChemicalRoles: [
      "Key product of the Haber Process used to make fertilizers",
      "Industrial acid produced from ammonia in the Ostwald Process",
      "High-yield nitrogen fertilizer for agriculture",
      "Widely used fertilizer supplying nitrogen to crops",
    ],
  },
  {
    id: "7",
    title: "Scents and Solvents",
    scenario:
      "Explore organic functional groups and discover how alcohols, carboxylic acids, and esters are connected through reactions used in fuels, food, fragrances, and industry.",
    availableChemicalIds: ["ethene", "water", "oxygen"],
    goalChemicalIds: ["ethanol", "ethanoic-acid", "ethyl-ethanoate"],
    goalChemicalRoles: [
      "Alcohol used in fuels, beverages, and disinfectants",
      "Carboxylic acid responsible for vinegar acidity",
      "Sweet-smelling ester used in perfumes and flavorings",
    ],
  },
];
