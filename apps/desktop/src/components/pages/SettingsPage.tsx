import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { useTheme, ColorTheme } from '@/components/theme-provider';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Dices, Sliders, Globe, Download, Info, Shield, Heart, RefreshCw, Edit2, FolderOpen } from 'lucide-react';
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
    window.ipcRenderer.invoke('get-server-info').then((res) => {
      const info = res as { name: string };
      setDeviceName(info?.name || '');
    });

    // Filesystem Sync: Where are we currently landing bytes?
    window.ipcRenderer.invoke('get-upload-dir').then((res) => {
      const dir = res as string;
      setSaveToFolder(dir);
    });

    // Network Sync: Verify if the background TCP listener is active
    window.ipcRenderer.invoke('get-server-status').then((res) => {
      const status = res as { running: boolean };
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
    } catch (e) {
      toast.error('Failed to stop server: ' + (e as Error).message);
    }
  };

  const handleServerRestart = async () => {
    try {
      await window.ipcRenderer.invoke('restart-server');
      setServerRunning(true);
      setNameChanged(false);
      toast.success('Server restarted');
    } catch (e) {
      toast.error('Failed to restart server: ' + (e as Error).message);
    }
  };

  const handleServerRefresh = async () => {
    try {
      await window.ipcRenderer.invoke('refresh-discovery');
      toast.success('Discovery refreshed');
    } catch (e) {
      toast.error('Failed to refresh: ' + (e as Error).message);
    }
  };

  const handleSelectFolder = async () => {
    try {
      const res = await window.ipcRenderer.invoke('select-save-folder');
      const result = res as { path: string };
      if (result && result.path) {
        setSaveToFolder(result.path);
        toast.success('Save folder updated');
      }
    } catch (e) {
      toast.error('Failed to select folder: ' + (e as Error).message);
    }
  };

  return (
    <div className="flex-1 flex flex-col p-8 max-w-3xl mx-auto w-full space-y-6">
      {/* Redesigned settings sections using separate cards with icons and premium feel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General Card */}
        <Card className="p-6 bg-muted/20 border-muted/40 rounded-2xl flex flex-col space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-muted/30">
            <Sliders className="h-4 w-4 text-primary/80" />
            <h3 className="text-sm font-bold tracking-wide text-foreground">
              General
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between p-2">
              <span className="text-xs font-medium">Theme</span>
              <Select
                value={theme}
                onValueChange={(v) => setTheme(v as 'light' | 'dark' | 'system')}
              >
                <SelectTrigger className="w-[120px] bg-muted/50 border-none rounded-lg h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between p-2">
              <span className="text-xs font-medium">Color Accent</span>
              <Select value={colorTheme} onValueChange={(v) => setColorTheme(v as ColorTheme)}>
                <SelectTrigger className="w-[120px] bg-muted/50 border-none rounded-lg h-8 text-xs cursor-pointer">
                  <SelectValue placeholder="Select color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zinc">Default</SelectItem>
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
        </Card>

        {/* Network Card */}
        <Card className="p-6 bg-muted/20 border-muted/40 rounded-2xl flex flex-col space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-muted/30">
            <Globe className="h-4 w-4 text-primary/80" />
            <h3 className="text-sm font-bold tracking-wide text-foreground">
              Network
            </h3>
          </div>

          <div className="space-y-3">
            {nameChanged && (
              <div className="p-2 rounded-lg bg-destructive/10 border border-destructive/20 mb-1">
                <p className="text-[10px] text-destructive font-medium text-center">
                  Restart the server to apply this setting
                </p>
              </div>
            )}

            <div className="flex items-center justify-between p-2">
              <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                <span className="text-xs font-medium text-foreground">Server</span>
                <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${serverRunning ? 'text-emerald-500' : 'text-destructive'}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${serverRunning ? 'bg-emerald-500 animate-pulse' : 'bg-destructive'}`} />
                  {serverRunning ? 'Running' : 'Stopped'}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="icon" onClick={handleServerRefresh} className="h-8 w-8 rounded-lg hover:bg-muted/80" title="Refresh discovery">
                  <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
                <Switch
                  checked={serverRunning}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleServerRestart();
                    } else {
                      handleServerStop();
                    }
                  }}
                  className="cursor-pointer"
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-2 gap-3">
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <Label className="text-xs font-semibold text-foreground">Device name</Label>
                <span className="text-[10px] text-muted-foreground leading-tight">
                  Visible to other devices.
                </span>
                <span className="text-xs font-medium text-foreground truncate px-3 py-2 bg-muted/30 border border-muted/30 rounded-xl max-w-full block">
                  {deviceName || 'Not set'}
                </span>
              </div>
              <Button variant="outline" size="icon" onClick={openDeviceNameDialog} className="h-9 w-9 rounded-xl shrink-0 hover:bg-muted self-end" title="Edit device name">
                <Edit2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </Card>

        {/* Receive Card */}
        <Card className="p-6 bg-muted/20 border-muted/40 rounded-2xl flex flex-col space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-muted/30">
            <Download className="h-4 w-4 text-primary/80" />
            <h3 className="text-sm font-bold tracking-wide text-foreground">
              Receive
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-2 p-2">
              <div className="flex justify-between items-start gap-3">
                <div className="flex flex-col gap-1 min-w-0">
                  <Label className="text-xs font-semibold text-foreground">Save to folder</Label>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    Where received files are saved.
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={handleSelectFolder} className="h-8 px-3 rounded-lg text-xs font-medium shrink-0 hover:bg-muted">
                  <FolderOpen className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                  Change
                </Button>
              </div>
              {saveToFolder && (
                <div className="px-3 py-2 bg-muted/30 border border-muted/30 rounded-xl text-[10px] text-muted-foreground font-mono truncate max-w-full">
                  {saveToFolder}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Other / Information Card */}
        <Card className="p-6 bg-muted/20 border-muted/40 rounded-2xl flex flex-col space-y-4 shadow-sm">
          <div className="flex items-center gap-2 pb-2 border-b border-muted/30">
            <Info className="h-4 w-4 text-primary/80" />
            <h3 className="text-sm font-bold tracking-wide text-foreground">
              About & Support
            </h3>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between p-2">
              <span className="text-xs font-medium flex items-center gap-2">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                About ExLink
              </span>
              <Button variant="ghost" size="sm" onClick={() => setAboutDialogOpen(true)} className="h-8 text-xs font-medium rounded-lg hover:bg-muted">
                Open
              </Button>
            </div>
            <div className="flex items-center justify-between p-2">
              <span className="text-xs font-medium flex items-center gap-2">
                <Heart className="h-3.5 w-3.5 text-muted-foreground" />
                Support ExLink
              </span>
              <Button variant="ghost" size="sm" className="h-8 text-xs font-medium rounded-lg hover:bg-muted">
                Donate
              </Button>
            </div>
            <div className="flex items-center justify-between p-2">
              <span className="text-xs font-medium flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                Privacy Policy
              </span>
              <Button variant="ghost" size="sm" className="h-8 text-xs font-medium rounded-lg hover:bg-muted">
                Open
              </Button>
            </div>
          </div>
        </Card>
      </div>

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
