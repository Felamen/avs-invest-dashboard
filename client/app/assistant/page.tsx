"use client";

import AccessGuard from "@/components/AccessGuard";
import AIChatWidget from "@/components/AIChatWidget";

export default function AssistantPage() {
  return (
    <AccessGuard page="assistant">
      <div className="h-screen flex flex-col">
        <AIChatWidget variant="page" />
      </div>
    </AccessGuard>
  );
}
