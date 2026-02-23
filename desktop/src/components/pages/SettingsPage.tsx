import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useTheme } from '@/components/theme-provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { LogoIcon } from '../common/Logo';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Dices } from 'lucide-react';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

// SettingsPage manages user preferences for appearance, identity, and background server behavior
export function SettingsPage() {
  // --- UI & Theming Hooks ---
  const { theme, setTheme, colorTheme, setColorTheme } = useTheme();

  // --- Identity States ---
  const [deviceName, setDeviceName] = useState('');
  const [deviceNameDraft, setDeviceNameDraft] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [deviceNameDialogOpen, setDeviceNameDialogOpen] = useState(false);

  // --- Server & Filesystem States ---
  const [serverRunning, setServerRunning] = useState(true);
  const [nameChanged, setNameChanged] = useState(false);
  const [saveToFolder, setSaveToFolder] = useState('');
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);

  // Preference Sync Worker: Hydrates the UI with persistent settings from the Main process
  useEffect(() => {
    // Identity Sync
    window.ipcRenderer.invoke('get-server-info').then((info: any) => {
      setDeviceName(info?.name || '');
    });

    // Filesystem Sync: Where are we currently landing bytes?
    window.ipcRenderer.invoke('get-upload-dir').then((dir: string) => {
      setSaveToFolder(dir);
    });

    // Network Sync: Verify if the background TCP listener is active
    window.ipcRenderer.invoke('get-server-status').then((status: any) => {
      setServerRunning(status?.running ?? true);
    });
  }, []);

  const generateRandomName = () => {
    const random = uniqueNamesGenerator({
      dictionaries: [adjectives, animals],
      length: 2,
      separator: ' ',
      style: 'capital',
    });
    setDeviceNameDraft(random);
  };

  const openDeviceNameDialog = () => {
    setDeviceNameDraft(deviceName);
    setDeviceNameDialogOpen(true);
    setNameChanged(false);
  };

  // Persists the new device identity to the Main process configuration file
  const saveDeviceName = async () => {
    const next = deviceNameDraft.trim();
    if (!next) {
      toast.error("Device name can't be empty");
      return;
    }

    const changed = next !== deviceName;
    try {
      setIsSavingName(true);
      // Logic: Tell Main process to update its listener/discovery advertisement name
      window.ipcRenderer.send('set-server-name', { name: next });
      setDeviceName(next);
      setDeviceNameDialogOpen(false);
      setNameChanged(changed); // Trigger restart warning if applicable
      toast.success('Device name saved');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleServerStop = async () => {
    try {
      await window.ipcRenderer.invoke('stop-server');
      setServerRunning(false);
      toast.success('Server stopped');
    } catch (e: any) {
      toast.error('Failed to stop server: ' + e.message);
    }
  };

  const handleServerRestart = async () => {
    try {
      await window.ipcRenderer.invoke('restart-server');
      setServerRunning(true);
      setNameChanged(false);
      toast.success('Server restarted');
    } catch (e: any) {
      toast.error('Failed to restart server: ' + e.message);
    }
  };

  const handleServerRefresh = async () => {
    try {
      await window.ipcRenderer.invoke('refresh-discovery');
      toast.success('Discovery refreshed');
    } catch (e: any) {
      toast.error('Failed to refresh: ' + e.message);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const result = await window.ipcRenderer.invoke('select-save-folder');
      if (result && result.path) {
        setSaveToFolder(result.path);
        toast.success('Save folder updated');
      }
    } catch (e: any) {
      toast.error('Failed to select folder: ' + e.message);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-12 max-w-2xl mx-auto w-full space-y-8">
      <h1 className="text-3xl font-bold text-center mb-4">Settings</h1>

      <Card className="p-6 space-y-8 bg-muted/20 border-muted/50">
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
            General
          </h3>

          <div className="space-y-1">
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

        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
            Network
          </h3>

          {nameChanged && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 mb-2">
              <p className="text-xs text-destructive font-medium text-center">
                Restart the server to apply this setting
              </p>
            </div>
          )}

          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
            <span className="text-sm font-medium">Server</span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleServerRefresh} className="h-9 w-9">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </Button>
              <Button
                variant={serverRunning ? 'destructive' : 'default'}
                size="icon"
                onClick={serverRunning ? handleServerStop : handleServerRestart}
                className="h-9 w-9"
              >
                {serverRunning ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
                    />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-sm font-medium">Device name</Label>
              <span className="text-xs text-muted-foreground">
                Shown on the Receive screen and to nearby devices.
              </span>
            </div>
            <div className="flex items-center gap-2 w-[360px] max-w-full">
              <Button variant="outline" onClick={openDeviceNameDialog} className="flex-1">
                {deviceName || 'Set name'}
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
            Receive
          </h3>

          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors gap-4">
            <div className="flex flex-col gap-1">
              <Label className="text-sm font-medium">Save to folder</Label>
              <span className="text-xs text-muted-foreground">Where received files are saved.</span>
            </div>
            <Button variant="outline" onClick={handleSelectFolder} className="flex-1 max-w-[200px]">
              {saveToFolder ? saveToFolder.split(/[/\\]/).pop() : 'Select folder'}
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground px-1">
            Other
          </h3>

          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
            <span className="text-sm font-medium">About ExLink</span>
            <Button variant="outline" onClick={() => setAboutDialogOpen(true)}>
              Open
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
            <span className="text-sm font-medium">Support ExLink</span>
            <Button variant="outline">Donate</Button>
          </div>
          <div className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
            <span className="text-sm font-medium">Privacy Policy</span>
            <Button variant="outline">Open</Button>
          </div>
        </div>
      </Card>

      {/* Device Name Dialog */}
      <Dialog open={deviceNameDialogOpen} onOpenChange={setDeviceNameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Device name</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex justify-center">
              <button
                onClick={generateRandomName}
                className="p-4 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                type="button"
              >
                <Dices className="h-8 w-8 text-primary" />
              </button>
            </div>
            <Input
              value={deviceNameDraft}
              onChange={(e) => setDeviceNameDraft(e.target.value)}
              placeholder="ExLink device name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeviceNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={saveDeviceName} disabled={isSavingName || !deviceNameDraft.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* About ExLink Dialog */}
      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>About ExLink</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-6 space-y-4">
            <LogoIcon size={80} />
            <div className="text-center space-y-2">
              <h3 className="text-2xl font-bold">ExLink</h3>
              <p className="text-sm text-muted-foreground">Version 1.0.0</p>
              <p className="text-sm text-muted-foreground mt-4">
                Seamless file transfer between desktop and mobile devices over local network.
              </p>
              <p className="text-sm text-muted-foreground">Created by LW Shakib</p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setAboutDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
