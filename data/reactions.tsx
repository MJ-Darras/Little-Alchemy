// export type ReactionRule = {
//   reagents: [string, string]; // the two chemical IDs that react
//   result: string; // chemical ID of the product
//   resultLabel: string; // display name shown on the result card
//   resultInfo?: string; // category/type label shown on the result card
// };

// export const REACTIONS: ReactionRule[] = [
//   {
//     reagents: ["hydrogen", "oxygen"],
//     result: "water",
//     resultLabel: "Water",
//     resultInfo: "H2O",
//   },
//   {
//     reagents: ["sodium", "chlorine"],
//     result: "salt",
//     resultLabel: "Table Salt",
//     resultInfo: "NaCl",
//   },
//   {
//     reagents: ["carbon-monoxide", "oxygen"],
//     result: "carbon-dioxide",
//     resultLabel: "Carbon Dioxide",
//     resultInfo: "CO2",
//   },
//   {
//     reagents: ["hydrogen", "chlorine"],
//     result: "hydrochloric_acid",
//     resultLabel: "Hydrochloric Acid",
//     resultInfo: "HCl",
//   },
//   {
//     reagents: ["sodium", "water"],
//     result: "sodium-hydroxide",
//     resultLabel: "Sodium Hydroxide",
//     resultInfo: "NaOH",
//   },
//   {
//     reagents: ["carbon", "hydrogen"],
//     result: "methane",
//     resultLabel: "Methane",
//     resultInfo: "CH4",
//   },
//   {
//     reagents: ["nitrogen", "hydrogen"],
//     result: "ammonia",
//     resultLabel: "Ammonia",
//     resultInfo: "NH3",
//   },
//   {
//     reagents: ["ammonia", "hydrochloric_acid"],
//     result: "ammonium_chloride",
//     resultLabel: "Ammonium Chloride",
//     resultInfo: "NH4Cl",
//   },
//   {
//     reagents: ["sulfur", "oxygen"],
//     result: "sulfur-dioxide",
//     resultLabel: "Sulfur Dioxide",
//     resultInfo: "SO2",
//   },
//   {
//     reagents: ["carbon", "oxygen"],
//     result: "carbon-monoxide",
//     resultLabel: "Carbon Monoxide",
//     resultInfo: "CO",
//   },
//   {
//     reagents: ["carbon-monoxide", "oxygen"],
//     result: "carbon-dioxide",
//     resultLabel: "Carbon Dioxide",
//     resultInfo: "CO2",
//   },
//   {
//     reagents: ["sulfur-dioxide", "water"],
//     result: "sulfuric-acid",
//     resultLabel: "Sulfuric Acid",
//     resultInfo: "H2SO4",
//   },
//   {
//     reagents: ["water", "oxygen"],
//     result: "hydrogen-peroxide",
//     resultLabel: "Hydrogen Peroxide",
//     resultInfo: "H2O2",
//   },
//   {
//     reagents: ["carbon-dioxide", "water"],
//     result: "glucose",
//     resultLabel: "Glucose",
//     resultInfo: "C6H12O6",
//   },
//   {
//     reagents: ["carbon-dioxide", "hydrogen"],
//     result: "deoxyribose",
//     resultLabel: "Deoxyribose",
//     resultInfo: "C5H10O4",
//   },
//   {
//     reagents: ["carbon-monoxide", "water"],
//     result: "acetic-acid",
//     resultLabel: "Acetic Acid",
//     resultInfo: "CH3COOH",
//   },
//   {
//     reagents: ["acetic-acid", "oxygen"],
//     result: "aspirin",
//     resultLabel: "Aspirin",
//     resultInfo: "C9H8O4",
//   },
//   {
//     reagents: ["calcium", "carbon-dioxide"],
//     result: "calcium-carbonate",
//     resultLabel: "Calcium Carbonate",
//     resultInfo: "CaCO3",
//   },
//   {
//     reagents: ["calcium", "phosphorus"],
//     result: "calcium-phosphate",
//     resultLabel: "Calcium Phosphate",
//     resultInfo: "Ca3(PO4)2",
//   },
//   {
//     reagents: ["glucose", "phosphorus"],
//     result: "phospholipid",
//     resultLabel: "Phospholipid Base",
//     resultInfo: "C10H18O8P2",
//   },
//   {
//     reagents: ["silicon", "carbon"],
//     result: "silicon-carbide",
//     resultLabel: "Silicon Carbide",
//     resultInfo: "SiC",
//   },
//   {
//     reagents: ["helium", "hydrogen"],
//     result: "helium-hydride",
//     resultLabel: "Helium Hydride",
//     resultInfo: "HeH⁺",
//   },
//   {
//     reagents: ["iron", "sulfur"],
//     result: "iron-sulfide",
//     resultLabel: "Iron Sulfide",
//     resultInfo: "FeS",
//   },
//   {
//     reagents: ["ammonia", "oxygen"],
//     result: "nitric_oxide",
//     resultLabel: "Nitric Oxide",
//     resultInfo: "NO",
//   },

//   {
//     reagents: ["nitric_oxide", "oxygen"],
//     result: "nitrogen_dioxide",
//     resultLabel: "Nitrogen Dioxide",
//     resultInfo: "NO2",
//   },

//   {
//     reagents: ["nitrogen_dioxide", "oxygen"],
//     result: "nitric_acid",
//     resultLabel: "Nitric Acid",
//     resultInfo: "HNO3",
//   },
//   {
//     reagents: ["nitrogen_dioxide", "water"],
//     result: "nitric_acid",
//     resultLabel: "Nitric Acid",
//     resultInfo: "HNO3",
//   },

//   {
//     reagents: ["ammonia", "nitric_acid"],
//     result: "ammonium_nitrate",
//     resultLabel: "Ammonium Nitrate",
//     resultInfo: "NH4NO3",
//   },

//   {
//     reagents: ["ammonia", "carbon-dioxide"],
//     result: "urea",
//     resultLabel: "Urea",
//     resultInfo: "CH4N2O",
//   },
//   {
//     reagents: ["copper", "tin"],
//     result: "bronze",
//     resultLabel: "Bronze",
//     resultInfo: "Cu+Sn",
//   },

//   {
//     reagents: ["iron", "carbon"],
//     result: "steel",
//     resultLabel: "Steel",
//     resultInfo: "Fe+C",
//   },

//   {
//     reagents: ["tin", "lead"],
//     result: "solder",
//     resultLabel: "Solder",
//     resultInfo: "Sn+Pb",
//   },

//   {
//     reagents: ["steel", "carbon"],
//     result: "cast_iron",
//     resultLabel: "Cast Iron",
//     resultInfo: "Fe+C",
//   },
//   {
//     reagents: ["ethene", "water"],
//     result: "ethanol",
//     resultLabel: "Ethanol",
//     resultInfo: "C2H5OH",
//   },
//   {
//     reagents: ["ethanol", "oxygen"],
//     result: "ethanoic_acid",
//     resultLabel: "Ethanoic Acid",
//     resultInfo: "CH3COOH",
//   },

//   {
//     reagents: ["ethanol", "ethanoic_acid"],
//     result: "ethyl_ethanoate",
//     resultLabel: "Ethyl Ethanoate",
//     resultInfo: "CH3COOC2H5",
//   },
// ];
