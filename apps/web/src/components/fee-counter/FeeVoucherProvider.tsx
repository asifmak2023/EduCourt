"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { FeeVoucherStudent } from "./FeeVoucherGenerator";
import { FeeVoucherDialog } from "./FeeVoucherDialog";

interface OpenVoucherOptions {
  student?: FeeVoucherStudent | null;
}

interface FeeVoucherContextValue {
  openVoucher: (options?: OpenVoucherOptions) => void;
}

const FeeVoucherContext = createContext<FeeVoucherContextValue | null>(null);

export function useFeeVoucher(): FeeVoucherContextValue {
  const context = useContext(FeeVoucherContext);
  if (!context) {
    throw new Error("useFeeVoucher must be used within a FeeVoucherProvider");
  }
  return context;
}

export function FeeVoucherProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [student, setStudent] = useState<FeeVoucherStudent | null>(null);

  const openVoucher = useCallback((options?: OpenVoucherOptions) => {
    setStudent(options?.student ?? null);
    setOpen(true);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ openVoucher }), [openVoucher]);

  return (
    <FeeVoucherContext.Provider value={value}>
      {children}
      <FeeVoucherDialog open={open} student={student} onClose={close} />
    </FeeVoucherContext.Provider>
  );
}
