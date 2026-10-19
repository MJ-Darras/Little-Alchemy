"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ChemicalData {
  id: string;
  label: string;
  info: string;
  formula: string;
  smiles: string;
  pubchemCid: number;
  isElement: boolean;
}

export function useChemicals() {
  const [chemicals, setChemicals] = useState<ChemicalData[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    getDocs(collection(db, "chemicals"))
      .then((snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ChemicalData));
        setChemicals(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return { chemicals, loading, error };
}
