"use client";

import { useState, useRef } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";

interface GIF {
  workers: number;
  quality: number;
  width: number;
  height: number;
  addFrame: (canvas: CanvasRenderingContext2D, options: { copy: boolean; delay: number }) => void;
  render: () => void;
  on: (event: string, callback: (blob?: Blob) => void) => void;
}

declare global {
  interface Window {
    GIF: new (options: { workers: number; quality: number; width: number; height: number }) => GIF;
  }
}

export default function ImageToGif() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedGifUrl, setGeneratedGifUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setSelectedImage(file);
      setGeneratedGifUrl(null);
    }
  };

  const generateGif = async () => {
    if (!selectedImage) return;

    setIsGenerating(true);

    try {
      // Load gif.js dynamically
      if (!window.GIF) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/gif.js@0.2.0/dist/gif.js";
        document.head.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size
      canvas.width = 600;
      canvas.height = 600;

      // Load the image
      const img = new Image();
      img.onload = () => {
        // Create GIF with exact parameters provided
        const gif = new window.GIF({
          workers: 2,
          quality: 10,
          width: 600,
          height: 600,
        });

        // Generate frames with Ken-Burns zoom effect
        for (let i = 0; i < 36; i++) {
          ctx.clearRect(0, 0, 600, 600);
          ctx.save();
          const scale = 1 + 0.2 * Math.sin((i / 12) * Math.PI); // Ken-Burns zoom
          ctx.translate(300, 300);
          ctx.scale(scale, scale);
          ctx.drawImage(img, -300, -300);
          ctx.restore();
          gif.addFrame(ctx, { copy: true, delay: 83 }); // 12 fps
        }

        // Handle GIF rendering
        gif.on("finished", (blob?: Blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            setGeneratedGifUrl(url);
          }
          setIsGenerating(false);
        });

        gif.render();
      };

      img.src = URL.createObjectURL(selectedImage);
    } catch (error) {
      console.error("Error generating GIF:", error);
      setIsGenerating(false);
    }
  };

  const downloadGif = () => {
    if (!generatedGifUrl) return;

    const link = document.createElement("a");
    link.href = generatedGifUrl;
    link.download = "animated-image.gif";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Image to Animated GIF</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
            >
              Select Image
            </Button>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
          </div>

          {selectedImage && (
            <div className="space-y-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  Selected: {selectedImage.name}
                </p>
              </div>

              <Button
                onClick={generateGif}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? "Generating..." : "Generate Animated GIF"}
              </Button>
            </div>
          )}

          {generatedGifUrl && (
            <div className="space-y-4">
              <div className="text-center">
                <img
                  src={generatedGifUrl}
                  alt="Generated GIF"
                  className="max-w-full h-auto rounded-lg border"
                />
              </div>
              <Button onClick={downloadGif} className="w-full">
                Download GIF
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <canvas
        ref={canvasRef}
        className="hidden"
        width={600}
        height={600}
      />
    </div>
  );
}