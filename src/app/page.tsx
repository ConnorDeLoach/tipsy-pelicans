"use client";

import { ScheduleBanner } from "@/components/schedule-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <>
      {/* Top banner, flush against the top of the viewport */}
      <div className="w-full">
        <ScheduleBanner limit={12} className="rounded-none border-0" />
      </div>

      {/* Content area with background image below the banner */}
      <div className="min-h-screen bg-[url('/fl-orange.png')] bg-cover bg-center">
        <main className="mx-auto max-w-6xl px-4 py-6">
          <div className="mx-auto max-w-3xl">
            <Card className="border-t-2 border-t-orange-500 border border-blue-200/40 bg-white/80 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60">
              <CardHeader className="pb-2 text-center">
                <CardTitle className="text-2xl font-bold text-blue-900">Let’s Go Pelicans</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex justify-center">
                  <Button asChild className="bg-blue-600 text-white hover:bg-blue-700">
                    <Link href="/signin">Sign In</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}
