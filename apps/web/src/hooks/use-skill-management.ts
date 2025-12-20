"use client";

import { useState, useCallback, useEffect } from 'react';
import {
  ManagedSkill,
  ContactSkills,
  getContactSkills,
  confirmSkill as confirmSkillAction,
  rejectSkill as rejectSkillAction,
  addManualSkill as addManualSkillAction,
  loadSkillsFromStorage,
  InferredSkill,
} from '@/lib/skill-management';

interface UseSkillManagementReturn {
  skills: ContactSkills;
  pendingCount: number;
  confirmedCount: number;
  allActiveSkills: ManagedSkill[];
  confirmSkill: (skillName: string) => void;
  rejectSkill: (skillName: string) => void;
  addManualSkill: (name: string, category: string) => void;
  initializeWithInferred: (inferredSkills: InferredSkill[]) => void;
}

let hasLoadedFromStorage = false;

export function useSkillManagement(contactId: string): UseSkillManagementReturn {
  const [skills, setSkills] = useState<ContactSkills>(() => getContactSkills(contactId));

  useEffect(() => {
    if (!hasLoadedFromStorage) {
      loadSkillsFromStorage();
      hasLoadedFromStorage = true;
    }
    setSkills(getContactSkills(contactId));
  }, [contactId]);

  const confirmSkill = useCallback(
    (skillName: string) => {
      const updated = confirmSkillAction(contactId, skillName);
      setSkills({ ...updated });
    },
    [contactId]
  );

  const rejectSkill = useCallback(
    (skillName: string) => {
      const updated = rejectSkillAction(contactId, skillName);
      setSkills({ ...updated });
    },
    [contactId]
  );

  const addManualSkill = useCallback(
    (name: string, category: string) => {
      const updated = addManualSkillAction(contactId, { name, category });
      setSkills({ ...updated });
    },
    [contactId]
  );

  const initializeWithInferred = useCallback(
    (inferredSkills: InferredSkill[]) => {
      const updated = getContactSkills(contactId, inferredSkills);
      setSkills({ ...updated });
    },
    [contactId]
  );

  const allActiveSkills = [...skills.confirmed, ...skills.manual];

  return {
    skills,
    pendingCount: skills.pending.length,
    confirmedCount: skills.confirmed.length,
    allActiveSkills,
    confirmSkill,
    rejectSkill,
    addManualSkill,
    initializeWithInferred,
  };
}
