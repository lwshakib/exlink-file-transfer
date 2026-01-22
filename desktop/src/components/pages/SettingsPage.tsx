import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useTheme } from "@/components/theme-provider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function SettingsPage() {
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();
  const [deviceName, setDeviceName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  useEffect(() => {
    window.ipcRenderer.invoke("get-server-info").then((info: any) => {
      setDeviceName(info?.name || "");
    });
  }, []);

  const saveDeviceName = async () => {
    const next = deviceName.trim();
    if (!next) {
      toast.error("Device name can't be empty");
      return;
    }

    try {
      setIsSavingName(true);
      window.ipcRenderer.send("set-server-name", { name: next });
      toast.success("Device name saved");
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-12 max-w-2xl mx-auto w-full space-y-8">
      <h1 className="text-3xl font-bold text-center mb-4">Settings</h1>

      <Card className="p-6 space-y-8 bg-muted/20 border-muted/50">
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">General</h3>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors gap-4">
              <div className="flex flex-col gap-1">
                <Label className="text-sm font-medium">Device name</Label>
                <span className="text-xs text-muted-foreground">Shown on the Receive screen and to nearby devices.</span>
              </div>
              <div className="flex items-center gap-2 w-[360px] max-w-full">
                <Input
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="ExLink device name"
                />
                <Button onClick={saveDeviceName} disabled={isSavingName || !deviceName.trim()}>
                  Save
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium">Theme</span>
              <Select value={theme} onValueChange={(v) => setTheme(v as any)}>
                <SelectTrigger className="w-[140px] bg-muted/50 border-none rounded-lg h-9">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium">Color</span>
              <Select value={colorTheme} onValueChange={(v) => setColorTheme(v as any)}>
                <SelectTrigger className="w-[140px] bg-muted/50 border-none rounded-lg h-9">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zinc">ExLink</SelectItem>
                  <SelectItem value="emerald">Emerald</SelectItem>
                  <SelectItem value="violet">Violet</SelectItem>
                  <SelectItem value="blue">Blue</SelectItem>
                  <SelectItem value="amber">Amber</SelectItem>
                  <SelectItem value="rose">Rose</SelectItem>
                  <SelectItem value="random">Random</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
