import { BottomNav } from "@/components/nav/BottomNav";
import { TransactionSheet } from "@/components/transaction/TransactionSheet";
import { NotebookPickerSheet } from "@/components/notebook/NotebookPickerSheet";
import { ToastHost } from "@/components/shared/Toast";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen pb-24">
      <div className="max-w-md mx-auto pt-safe">{children}</div>
      <BottomNav />
      <TransactionSheet />
      <NotebookPickerSheet />
      <ToastHost />
    </div>
  );
}
