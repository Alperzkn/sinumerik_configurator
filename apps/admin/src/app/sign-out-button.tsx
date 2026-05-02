"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const router = useRouter();
  const signOut = async () => {
    await fetch("/api/login", { method: "DELETE" });
    router.replace("/login");
    router.refresh();
  };
  return (
    <Button variant="ghost" size="sm" className="text-[12px]" onClick={signOut}>
      <LogOut className="h-3.5 w-3.5" />
      Sign out
    </Button>
  );
}
