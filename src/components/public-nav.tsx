import Link from "next/link";
import { Button } from "@/components/ui/button";

export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4 mx-auto">
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="font-bold text-xl tracking-tight">
            Tipsy Pelicans
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild className="text-sm font-medium">
            <Link href="/">Home</Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-blue-600 text-white hover:bg-blue-700"
          >
            <Link href="/signin">Sign In</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
