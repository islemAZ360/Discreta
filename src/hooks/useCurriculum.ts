import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export type CurriculumNodeType = 'link' | 'text' | 'topic';

export type CurriculumNode = {
  id: string;
  title: string;
  type?: CurriculumNodeType; 
  children?: CurriculumNode[];
};

export function useCurriculum(courseId: 'sem1' | 'sem2') {
  const [nodes, setNodes] = useState<CurriculumNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const docRef = doc(db, 'courses', courseId);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().nodes) {
        setNodes(docSnap.data().nodes);
      } else {
        setNodes([]); 
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching curriculum:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [courseId]);

  const updateCurriculum = async (newNodes: CurriculumNode[]) => {
    try {
      const docRef = doc(db, 'courses', courseId);
      await setDoc(docRef, { nodes: newNodes });
    } catch (error) {
      console.error("Error updating curriculum:", error);
      throw error;
    }
  };

  const initDefaultCurriculum = async (defaultNodes: CurriculumNode[]) => {
    try {
      const docRef = doc(db, 'courses', courseId);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists() || !docSnap.data().nodes) {
         await setDoc(docRef, { nodes: defaultNodes });
      }
    } catch (error) {
      console.error("Error initializing curriculum", error);
    }
  }

  return { nodes, loading, updateCurriculum, initDefaultCurriculum };
}
