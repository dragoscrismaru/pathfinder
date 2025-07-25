// hooks/use-modal-store.ts
import { create } from "zustand";
import type { StoreBlock } from "@/types";

export type ModalType = "editBlock";

interface ModalData {
  block?: StoreBlock;
  shelf?: {
    id: number;
  };
}

interface ModalStore {
  type: ModalType | null;
  data: ModalData;
  isOpen: boolean;
  onOpen: (type: ModalType, data?: ModalData) => void;
  onClose: () => void;
}

export const useModal = create<ModalStore>((set) => ({
  type: null,
  data: {},
  isOpen: false,
  onOpen: (type, data = {}) => set({ isOpen: true, type, data }),
  onClose: () => set({ type: null, isOpen: false, data: {} }),
}));
