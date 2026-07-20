// apps/web/src/store/parentContextStore.ts
import { create } from 'zustand';

interface Child {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  stream: { name: string; class: { name: string } };
}

interface ParentContextState {
  children: Child[];
  selectedChildId: string | null;
  setChildren: (children: Child[]) => void;
  setSelectedChildId: (id: string) => void;
  getSelectedChild: () => Child | undefined;
}

export const useParentContextStore = create<ParentContextState>((set, get) => ({
  children: [],
  selectedChildId: null,
  setChildren: (children) => {
    set({ children });
    // Auto-select the first child if none is selected
    if (children.length > 0 && !get().selectedChildId) {
      set({ selectedChildId: children[0].id });
    }
  },
  setSelectedChildId: (id) => set({ selectedChildId: id }),
  getSelectedChild: () => {
    const { children, selectedChildId } = get();
    return children.find(c => c.id === selectedChildId);
  }
}));