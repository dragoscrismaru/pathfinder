"use client";

import { useEffect, useState } from "react";
import { EditBlockModal } from "@/components/modals/edit-block-modal";

export const ModalProvider = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <EditBlockModal />
      {/* Add more modals here as needed */}
    </>
  );
};
