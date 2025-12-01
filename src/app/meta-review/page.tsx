"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { InstagramEmbed } from "@/components/chat/InstagramEmbed";
import { toast } from "sonner";
import { Loader2, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";

export default function MetaReviewPage() {
  const requestEmbed = useAction(api.oembed.instagram.requestEmbed);
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [embedData, setEmbedData] = useState<{
    html: string;
    authorName?: string;
    provider: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setEmbedData(null);

    try {
      const result = await requestEmbed({ url: url.trim() });

      if (result.success) {
        setEmbedData({
          html: result.data.html,
          authorName: result.data.authorName,
          provider: result.data.provider,
        });
        toast.success("Embed fetched successfully");
      } else {
        toast.error(result.error || "Failed to fetch embed");
      }
    } catch (error) {
      console.error("Embed error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  // Example URLs for testing
  const exampleUrls = [
    "https://www.instagram.com/p/DCuS0iYv02D/", // Official Instagram post
    "https://www.facebook.com/instagram/posts/10161234567890123", // Facebook post
  ];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">
            Meta oEmbed Integration Demo
          </h1>
          <p className="text-muted-foreground">
            This page demonstrates the "oEmbed Read" permission usage for the
            Tipsy Pelicans chat application. It allows users to share rich media
            content from Instagram and Facebook directly in the team chat.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test oEmbed Fetch</CardTitle>
            <CardDescription>
              Enter a public Instagram or Facebook post URL to test the
              embedding functionality.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="https://www.instagram.com/p/..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button type="submit" disabled={isLoading || !url.trim()}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    "Embed Content"
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground font-medium">
                  Try these examples:
                </p>
                <div className="flex flex-wrap gap-2">
                  {exampleUrls.map((example, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setUrl(example)}
                      className="text-xs bg-muted hover:bg-muted/80 px-2 py-1 rounded-md transition-colors text-left truncate max-w-[300px]"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        {embedData && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">
                Successfully fetched oEmbed data
              </span>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg capitalize">
                    {embedData.provider} Preview
                  </CardTitle>
                  {embedData.authorName && (
                    <span className="text-sm text-muted-foreground">
                      by {embedData.authorName}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex justify-center bg-muted/20 rounded-lg p-4 min-h-[300px]">
                  <InstagramEmbed html={embedData.html} />
                </div>
              </CardContent>
            </Card>

            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Privacy & Data Usage
              </h3>
              <p className="text-sm text-muted-foreground">
                This application uses the oEmbed API solely to display previews
                of content shared by users. No user data from Instagram/Facebook
                is stored beyond the public embed HTML and metadata needed for
                caching (24h TTL).
              </p>
              <a
                href="/privacy-policy"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                View Privacy Policy <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
