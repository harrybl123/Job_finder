import { create } from 'zustand';
import { ConstellationNode, RoleNode } from '@/data/constellationData';

type ZoomLevel = 'galaxy' | 'industry' | 'role';

interface ConstellationStore {
    // View state
    zoomLevel: ZoomLevel;
    selectedIndustry: string | null;
    selectedRole: string | null;

    // Actions
    setZoomLevel: (level: ZoomLevel) => void;
    selectIndustry: (id: string | null) => void;
    selectRole: (roleId: string | null) => void;
    reset: () => void;
}

export const useConstellationStore = create<ConstellationStore>((set) => ({
    // Initial state
    zoomLevel: 'galaxy',
    selectedIndustry: null,
    selectedRole: null,

    // Actions
    setZoomLevel: (level) => set({ zoomLevel: level }),

    selectIndustry: (id) => set({
        selectedIndustry: id,
        zoomLevel: id ? 'industry' : 'galaxy'
    }),

    selectRole: (roleId) => set({
        selectedRole: roleId,
        zoomLevel: roleId ? 'role' : 'industry'
    }),

    reset: () => set({
        zoomLevel: 'galaxy',
        selectedIndustry: null,
        selectedRole: null
    })
}));
