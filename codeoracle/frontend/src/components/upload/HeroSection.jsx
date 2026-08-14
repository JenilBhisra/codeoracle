import { Braces, FileCode2, GitFork, MessageSquareCode, TestTube2, Wand2 } from "lucide-react";
import { Logo } from "../common/Logo";
import { Badge } from "../common/Badges";

const CAPABILITIES = [
  { label: "Python", icon: FileCode2, tone: "blue" },
  { label: "JavaScript", icon: Braces, tone: "warning" },
  { label: "Dependency Graph", icon: GitFork, tone: "cyan" },
  { label: "AI Explanations", icon: MessageSquareCode, tone: "purple" },
  { label: "Test Generation", icon: TestTube2, tone: "success" },
  { label: "Safe Refactoring", icon: Wand2, tone: "magenta" },
];

export function HeroSection() {
  return (
    <section className="relative overflow-hidden pb-4 pt-10 sm:pt-14">
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden="true">
        <div className="absolute inset-0 grid-backdrop opacity-25 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="absolute left-1/2 top-[-18rem] h-[34rem] w-[52rem] -translate-x-1/2 rounded-full bg-gradient-brand-soft blur-3xl animate-aurora" />
      </div>

      <div className="flex flex-col items-center text-center">
        <Logo size={58} className="mb-6" />
        <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">
          <span className="text-gradient-brand">Understand.</span> Test. Modernize.
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
          Turn unfamiliar Python and JavaScript codebases into clear explanations, dependency maps,
          generated tests, and safer refactoring proposals.
        </p>

        <ul className="mt-7 flex flex-wrap justify-center gap-2">
          {CAPABILITIES.map((capability) => (
            <li key={capability.label}>
              <Badge tone={capability.tone} icon={capability.icon}>
                {capability.label}
              </Badge>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
