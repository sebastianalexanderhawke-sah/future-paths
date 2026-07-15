import Link from "next/link";

const PLACES = [
  {
    href: "/overview",
    label: "Overview",
    description: "Where everything you're exploring comes together",
  },
  {
    href: "/moments",
    label: "Situations",
    description: "The crossroads and decisions you're working through",
  },
  {
    href: "/reflections",
    label: "Workspace",
    description: "Reflections waiting for your interpretation",
  },
];

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-zinc-50 px-6 py-24">
      <main className="flex w-full max-w-md flex-col items-center gap-10 text-center">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium tracking-wide text-zinc-500 uppercase">
            Reflection
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            This path doesn&rsquo;t lead anywhere
          </h1>
          <p className="text-sm leading-6 text-zinc-600">
            The page you&rsquo;re looking for may have moved, or the link may be
            out of date. Everything you&rsquo;ve created is still here — pick a
            place to continue.
          </p>
        </div>

        <nav aria-label="Places to continue" className="flex w-full flex-col gap-3">
          {PLACES.map((place) => (
            <Link
              key={place.href}
              href={place.href}
              className="rounded-lg border border-zinc-200 bg-white px-5 py-4 text-left transition-colors hover:bg-zinc-100"
            >
              <span className="block text-sm font-medium text-zinc-900">
                {place.label}
              </span>
              <span className="mt-0.5 block text-sm text-zinc-600">
                {place.description}
              </span>
            </Link>
          ))}
        </nav>
      </main>
    </div>
  );
}
