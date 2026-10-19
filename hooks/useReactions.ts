"use client";

import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";

export interface ReactionRule {
  id: string;
  reagents: [string, string];
  result: string;
  resultLabel: string;
  resultInfo?: string;
}

export function useReactions() {
  const [reactions, setReactions] = useState<ReactionRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getDocs(collection(db, "reactions"))
      .then((snapshot) => {
        const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ReactionRule));
        setReactions(data);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, []);

  return { reactions, loading, error };
}
