import { History, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoIcon } from "../common/Logo";

export function ReceivePage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center relative p-8">
      {/* Top Right Actions */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <History className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
          <Info className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>

      {/* Central Icon Area */}
      <div className="mb-12 relative flex items-center justify-center">
        <LogoIcon size={192} className="opacity-90 transition-transform hover:scale-105 duration-500" />
      </div>

      {/* Device Info */}
      <div className="text-center space-y-2 mb-12">
        <h1 className="text-5xl font-medium tracking-tight">Efficient Pineapple</h1>
        <p className="text-xl text-muted-foreground font-mono">#106 #1</p>
      </div>

      {/* Quick Save Toggle */}
      <div className="space-y-4 w-full max-w-xs">
        <p className="text-sm font-medium text-muted-foreground text-center">Quick Save</p>
        <div className="flex items-center justify-center bg-muted/50 p-1 rounded-full border">
          {["Off", "Favorites", "On"].map((option) => (
            <button
              key={option}
              className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                option === "Favorites" 
                  ? "bg-background text-foreground shadow-sm px-8" 
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
