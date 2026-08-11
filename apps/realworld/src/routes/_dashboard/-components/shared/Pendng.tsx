import { Loader } from "lucide-react";

export function PendingComponent() {
  return (
    <div className="w-full h-screen flex flex-col items-center justify-center">
      <Loader className="animate-spin" />
    </div>
  );
}
