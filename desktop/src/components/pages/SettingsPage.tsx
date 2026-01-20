import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SettingsPage() {
  return (
    <div className="flex-1 flex flex-col p-12 max-w-2xl mx-auto w-full space-y-8">
      <h1 className="text-3xl font-bold text-center mb-4">Settings</h1>

      <Card className="p-6 space-y-8 bg-muted/20 border-muted/50">
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">General</h3>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium">Theme</span>
              <Select defaultValue="system">
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
              <Select defaultValue="localsend">
                <SelectTrigger className="w-[140px] bg-muted/50 border-none rounded-lg h-9">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="localsend">LocalSend</SelectItem>
                  <SelectItem value="emerald">Emerald</SelectItem>
                  <SelectItem value="violet">Violet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium">Language</span>
              <Select defaultValue="system">
                <SelectTrigger className="w-[140px] bg-muted/50 border-none rounded-lg h-9">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">System</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="es">Spanish</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium pr-8">Minimize to the System Tray/Menu Bar when closing</span>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium">Autostart after login</span>
              <Switch />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <span className="text-sm font-medium">Animations</span>
              <Switch defaultValue="on" />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
