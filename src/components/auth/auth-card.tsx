import Image from "next/image"

// The frame shared by the public sign-in screens.
export function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-3">
          <Image src="/logo.png" alt="יקב מוניץ" width={140} height={62} className="h-14 w-auto" priority />
          <h1 className="text-xl font-bold text-stone-800">{title}</h1>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-6">{children}</div>
      </div>
    </main>
  )
}
