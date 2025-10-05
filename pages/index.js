// pages/index.js
import Link from "next/link";
import { useState } from "react";

export default function Landing() {
  const [mode, setMode] = useState("artwork");

  return (
    <main className="min-h-screen bg-base text-base flex items-center justify-center">
      <div className="text-center p-6 space-y-8">
        <h1 className="text-4xl md:text-6xl tracking-tight font-semibold">Alfredo Enrico Iacobucci</h1>

        <div className="inline-flex items-center rounded-full border border-current p-1">
          <button onClick={() => setMode("artwork")} className={`px-4 py-2 rounded-full ${mode === "artwork" ? "bg-base/10" : ""}`}>Artwork</button>
          <button onClick={() => setMode("professional")} className={`px-4 py-2 rounded-full ${mode === "professional" ? "bg-base/10" : ""}`}>Professional</button>
        </div>

        <div>
          {mode === "artwork" ? (
            <Link href="/artwork" className="underline underline-offset-4">Entra in Artwork</Link>
          ) : (
            <Link href="/professional" className="underline underline-offset-4">Entra in Professional</Link>
          )}
        </div>
      </div>
    </main>
  );
}
