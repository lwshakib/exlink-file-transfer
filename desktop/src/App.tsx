import { Minus, Square, X, Download, Send, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { ReceivePage } from "./components/pages/ReceivePage";
import { SendPage } from "./components/pages/SendPage";
import { SettingsPage } from "./components/pages/SettingsPage";

function App() {
  const [activeTab, setActiveTab] = useState<"receive" | "send" | "settings">("send");

  const minimizeWindow = () => {
    (window as any).ipcRenderer.send('window-minimize');
  };

  const maximizeWindow = () => {
    (window as any).ipcRenderer.send('window-maximize');
  };

  const closeWindow = () => {
    (window as any).ipcRenderer.send('window-close');
  };

  const tabs = [
    { id: "receive", label: "Receive", icon: Download },
    { id: "send", label: "Send", icon: Send },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground select-none">
      {/* Custom TitleBar */}
      <header className="titlebar h-16 flex items-center justify-between bg-background/50 backdrop-blur-md">
        <Logo className="px-6" iconSize={24} />
        
        {/* Tabs */}
        <div className="no-drag flex items-center bg-muted/30 rounded-full p-1 border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-1.5 text-xs font-semibold rounded-full transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="no-drag flex items-center px-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 hover:bg-muted rounded-full"
            onClick={minimizeWindow}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 hover:bg-muted rounded-full"
            onClick={maximizeWindow}
          >
            <Square className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
            onClick={closeWindow}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col bg-background">
        {activeTab === "receive" && <ReceivePage />}
        {activeTab === "send" && <SendPage />}
        {activeTab === "settings" && <SettingsPage />}
      </main>
    </div>
  );
}

export default App;
