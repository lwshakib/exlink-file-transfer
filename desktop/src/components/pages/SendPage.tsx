import { useState, useEffect } from 'react';
import {
  File,
  Folder,
  Clipboard,
  RotateCcw,
  Target,
  Heart,
  Smartphone,
  AlignLeft,
  Laptop,
  Monitor,
  X,
  Plus,
  ChevronLeft,
  Trash2,
  FileText,
  Paperclip,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'motion/react';
import { useSelection, SelectedItem } from '../../hooks/useSelection';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface NearbyNode {
  id: string;
  name: string;
  ip: string;
  port: number;
  platform: 'desktop' | 'mobile';
  os?: string; // For desktop: Windows, MacOS, Linux
  brand?: string; // For mobile: Tecno, Samsung, etc.
}

// SendPage manages the source side of file transfers: selecting items and discovering target devices
export function SendPage() {
  // Discovery State: List of active ExLink stations found on the LAN
  const [devices, setDevices] = useState<NearbyNode[]>([]);
  
  // Centralized Selection Hook: Tracks files, folders, and text objects ready for transfer
  const { selectedItems, addItems, clearSelection, hasSelection, removeItem } = useSelection();
  
  // UI Component States
  const [isTextDialogOpen, setIsTextDialogOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);

  const totalSize = selectedItems.reduce((acc, item) => acc + (item.size || 0), 0);
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Discovery Worker: Syncs the UI with the background network scanner
  useEffect(() => {
    // Initial fetch of already known devices
    window.ipcRenderer.invoke('get-nearby-nodes').then((nodes: NearbyNode[]) => {
      setDevices(nodes);
    });

    // Event listener for real-time subnet updates from Electron main process
    const removeListener = window.ipcRenderer.on(
      'nearby-nodes-updated',
      (_event: any, nodes: NearbyNode[]) => {
        setDevices(nodes);
      }
    );

    return () => {
      if (removeListener) removeListener();
    };
  }, [devices]);

  useEffect(() => {
    const stored = localStorage.getItem('favoriteDeviceIds');
    if (stored) {
      try {
        setFavoriteIds(JSON.parse(stored));
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const toggleFavorite = (e: React.MouseEvent, deviceId: string) => {
    e.stopPropagation();
    const nextFavorites = favoriteIds.includes(deviceId)
      ? favoriteIds.filter((id) => id !== deviceId)
      : [...favoriteIds, deviceId];

    setFavoriteIds(nextFavorites);
    localStorage.setItem('favoriteDeviceIds', JSON.stringify(nextFavorites));
  };

  const sortedDevices = [...devices].sort((a, b) => {
    const aFav = favoriteIds.includes(a.id);
    const bFav = favoriteIds.includes(b.id);
    if (aFav && !bFav) return -1;
    if (!aFav && bFav) return 1;
    return a.name.localeCompare(b.name);
  });

  // Native File Picker Strategy: Triggers OS-native dialog via IPC for cross-platform support
  const handleFilePick = async () => {
    try {
      const items: { path: string; name: string; size: number }[] =
        await window.ipcRenderer.invoke('share-files');
      if (items && items.length > 0) {
        // Map native paths to internal Selection Schema
        const newItems: SelectedItem[] = items.map((item) => ({
          id: `${item.path}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: item.name,
          size: item.size,
          type: 'file',
          path: item.path,
        }));
        addItems(newItems);
        toast.success(`Added ${newItems.length} files`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Folder Picker Integration: Allows selecting entire directories (handled recursively by backend)
  const handleFolderPick = async () => {
    try {
      const items: { path: string; name: string; size: number }[] =
        await window.ipcRenderer.invoke('share-folders');
      if (items && items.length > 0) {
        const newItems: SelectedItem[] = items.map((item) => ({
          id: `${item.path}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          name: item.name,
          size: item.size,
          type: 'folder',
          path: item.path,
        }));
        addItems(newItems);
        toast.success(`Added ${newItems.length} folders`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const newItem: SelectedItem = {
          id: `paste-${Date.now()}`,
          name: 'Pasted Text',
          size: text.length,
          type: 'text',
          content: text,
        };
        addItems([newItem]);
        toast.success('Text pasted from clipboard');
      } else {
        toast.error('Clipboard is empty or does not contain text');
      }
    } catch (e) {
      toast.error('Failed to read clipboard');
    }
  };

  const handleTextAdd = () => {
    if (textInput.trim()) {
      const newItem: SelectedItem = {
        id: `text-${Date.now()}`,
        name: 'Text Content',
        size: textInput.length,
        type: 'text',
        content: textInput,
      };
      addItems([newItem]);
      setTextInput('');
      setIsTextDialogOpen(false);
      toast.success('Text added to selection');
    }
  };

  // Transfer Initiation: Handshakes with the selected device to prompt user acceptance
  const handleDeviceClick = async (device: NearbyNode) => {
    if (!hasSelection) {
      toast.error('Please select at least one file or item to share first.');
      return;
    }

    // Modal feedback for long-running handshake
    toast.loading(`Waiting for ${device.name} to accept...`, { id: 'pairing' });

    try {
      // Logic: Tell Main process to send a Pairing Request (JSON over TCP/HTTP)
      await window.ipcRenderer.invoke('initiate-pairing', {
        deviceId: device.id,
        deviceIp: device.ip,
        items: selectedItems,
      });
    } catch (e) {
      toast.error('Failed to initiate pairing.', { id: 'pairing' });
    }
  };

  const selectionItems = [
    { label: 'File', icon: File, onClick: handleFilePick },
    { label: 'Folder', icon: Folder, onClick: handleFolderPick },
    { label: 'Text', icon: AlignLeft, onClick: () => setIsTextDialogOpen(true) },
    { label: 'Paste', icon: Clipboard, onClick: handlePaste },
  ];

  const handleRefresh = async () => {
    toast.loading('Refreshing devices...', { id: 'refresh', duration: 1000 });
    await window.ipcRenderer.invoke('refresh-discovery');
  };

  const getDeviceIcon = (device: NearbyNode) => {
    if (device.platform === 'mobile') return Smartphone;
    if (device.os === 'Windows' || device.os === 'Linux') return Laptop;
    return Monitor;
  };

  if (isDetailsOpen) {
    return (
      <div className="flex-1 flex flex-col bg-background relative overflow-hidden">
        <header className="h-12 flex items-center px-4 border-b border-border bg-card/50 backdrop-blur-md sticky top-0 z-10">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsDetailsOpen(false)}
            className="rounded-full mr-2 hover:bg-muted h-6 w-6"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>
          <h1 className="text-xs font-medium text-foreground/80">Selection</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 max-w-2xl mx-auto w-full space-y-2">
          <div className="flex items-center justify-between mb-4 px-1">
            <div className="space-y-0 text-[10px]">
              <p className="text-muted-foreground">Files: {selectedItems.length}</p>
              <p className="text-muted-foreground">Size: {formatSize(totalSize)}</p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={clearSelection}
              className="bg-primary/10 text-primary hover:bg-primary/20 rounded-full px-3 h-6 text-[10px] font-semibold"
            >
              Delete all
            </Button>
          </div>

          <AnimatePresence mode="popLayout">
            {selectedItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.99 }}
                className="group flex items-center justify-between p-2.5 bg-card border border-border/80 rounded-xl hover:bg-muted/40 transition-all mb-1.5"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-muted/50 rounded-lg flex items-center justify-center border border-border/50">
                    {item.type === 'text' ? (
                      <FileText className="h-4 w-4 text-primary/60" />
                    ) : (
                      <Paperclip className="h-4 w-4 text-primary/60" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground/90 text-[11px] truncate max-w-[180px]">
                      {item.name}
                    </span>
                    <span className="text-[9px] text-muted-foreground font-mono tracking-tighter">
                      {formatSize(item.size)}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(item.id)}
                  className="rounded-full text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 h-6 w-6"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col px-6 py-8 max-w-4xl mx-auto w-full space-y-6 overflow-y-auto">
      {/* Selection Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[11px] font-medium text-muted-foreground/60">Selection</h3>
        </div>

        {hasSelection ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-card/80 border border-border rounded-2xl relative group shadow-sm"
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={clearSelection}
              className="absolute top-3 right-3 h-6 w-6 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all"
            >
              <X className="h-3 w-3" />
            </Button>

            <div className="space-y-3">
              <div className="space-y-0">
                <p className="text-xs font-medium text-foreground">Files: {selectedItems.length}</p>
                <p className="text-[10px] text-muted-foreground/80 tracking-tight">
                  Size: {formatSize(totalSize)}
                </p>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
                {selectedItems.slice(0, 8).map((item) => (
                  <div
                    key={item.id}
                    className="h-10 w-9 bg-muted/50 rounded-lg flex items-center justify-center border border-border/50 shrink-0"
                  >
                    <Paperclip className="h-3.5 w-3.5 text-muted-foreground/60" strokeWidth={1.5} />
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsDetailsOpen(true)}
                  className="text-muted-foreground font-semibold hover:bg-muted hover:text-foreground rounded-full px-3 h-7 transition-all text-[10px]"
                >
                  Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => setIsAddMenuOpen(true)}
                  className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 rounded-full px-4 h-7 font-semibold flex gap-1.5 transition-all"
                >
                  <Plus className="h-3 w-3" />
                  <span className="text-[10px]">Add item</span>
                </Button>
              </div>
            </div>
          </motion.div>
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {selectionItems.map((item) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex-1"
                onClick={item.onClick}
              >
                <Card className="h-full group cursor-pointer hover:bg-muted/80 bg-card border-border/80 transition-all duration-200 py-3 flex flex-col items-center justify-center gap-1.5 rounded-xl min-h-[85px] shadow-sm">
                  <div className="p-2 bg-muted transition-colors rounded-lg group-hover:bg-accent/20">
                    <item.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground tracking-tight">
                    {item.label}
                  </span>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* Discovery Section */}
      <section className="space-y-3">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex items-center justify-between px-1"
        >
          <h3 className="text-[11px] font-medium text-muted-foreground/60">Nearby devices</h3>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              className="h-6 w-6 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-all"
            >
              <RotateCcw className="h-3 w-3" strokeWidth={1.5} />
            </Button>
          </div>
        </motion.div>

        <div className="space-y-1.5">
          <AnimatePresence mode="popLayout">
            {sortedDevices.map((device, index) => {
              const DeviceIcon = getDeviceIcon(device);
              const isFavorite = favoriteIds.includes(device.id);
              return (
                <motion.div
                  key={device.id}
                  layout
                  initial={{ opacity: 0, x: -5 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.99 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  onClick={() => handleDeviceClick(device)}
                >
                  <div className="w-full p-3 flex items-center justify-between bg-card/60 border border-border/80 hover:border-accent/40 hover:bg-muted/40 transition-all duration-200 cursor-pointer group rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-lg group-hover:bg-accent/20 transition-all border border-border/40">
                        <DeviceIcon
                          className="h-4.5 w-4.5 text-foreground/80 group-hover:scale-105 transition-transform"
                          strokeWidth={1.5}
                        />
                      </div>
                      <div className="flex flex-col gap-0 items-start">
                        <h4 className="text-xs font-medium text-foreground tracking-tight m-0">
                          {device.name}
                        </h4>
                        <div className="flex gap-1">
                          <Badge
                            variant="secondary"
                            className="bg-muted/50 text-muted-foreground font-mono text-[8px] px-1.5 py-0 border-none rounded uppercase font-bold tracking-tighter"
                          >
                            #{device.id.slice(-3)}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className="bg-muted/50 text-muted-foreground font-mono text-[8px] px-1.5 py-0 border-none rounded uppercase font-bold tracking-tighter"
                          >
                            {device.os || device.brand?.slice(0, 6) || 'Other'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => toggleFavorite(e, device.id)}
                        className={`rounded-full transition-all h-7 w-7 ${isFavorite ? 'text-primary' : 'text-muted-foreground/30 hover:text-foreground/60'}`}
                      >
                        <Heart
                          className={`h-3 w-3 ${isFavorite ? 'fill-current' : ''}`}
                          strokeWidth={1.5}
                        />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          {devices.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.2 }}
              className="py-12 flex flex-col items-center justify-center gap-3 text-muted-foreground/40"
            >
              <Target className="h-8 w-8 animate-pulse" />
              <p className="text-[9px] font-semibold uppercase tracking-widest">Searching...</p>
            </motion.div>
          )}
        </div>
      </section>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="flex flex-col items-center gap-4 pt-4 flex-1 justify-end pb-2"
      >
        <Button
          variant="link"
          className="text-primary/80 hover:text-primary hover:no-underline font-semibold text-[9px] tracking-widest h-auto p-0 transition-all uppercase"
        >
          Troubleshoot
        </Button>
        <p className="text-[9px] text-muted-foreground/60 max-w-[200px] text-center font-medium leading-relaxed tracking-wide">
          Target must belong to current local frequency station.
        </p>
      </motion.div>

      {/* Add Menu Dialog */}
      <Dialog open={isAddMenuOpen} onOpenChange={setIsAddMenuOpen}>
        <DialogContent className="max-w-[230px] bg-background border border-border rounded-[28px] p-5 shadow-2xl">
          <DialogHeader className="space-y-1 text-center items-center">
            <DialogTitle className="text-sm font-semibold text-foreground">
              Add to selection
            </DialogTitle>
            <p className="text-[9px] text-muted-foreground tracking-wide">Select share type</p>
          </DialogHeader>
          <div className="py-4">
            <div className="grid grid-cols-2 gap-2">
              {selectionItems.map((item) => (
                <button
                  key={item.label}
                  onClick={() => {
                    item.onClick();
                    setIsAddMenuOpen(false);
                  }}
                  className="flex flex-col items-center justify-center gap-2 p-3 bg-card border border-border hover:bg-muted rounded-xl transition-all group aspect-square"
                >
                  <item.icon className="h-5 w-5 text-primary/80 group-hover:scale-105 transition-transform" />
                  <span className="text-[9px] font-bold text-primary uppercase tracking-tighter">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <DialogFooter className="sm:justify-center">
            <Button
              variant="ghost"
              onClick={() => setIsAddMenuOpen(false)}
              className="text-muted-foreground hover:text-foreground hover:bg-transparent font-bold uppercase tracking-widest text-[8px] h-6 px-0"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Text Dialog */}
      <Dialog open={isTextDialogOpen} onOpenChange={setIsTextDialogOpen}>
        <DialogContent className="max-w-xs bg-background border border-border rounded-2xl p-5 shadow-3xl">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-semibold text-foreground">
              Enter Text Message
            </DialogTitle>
          </DialogHeader>
          <div className="py-3">
            <Textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Content..."
              className="min-h-[120px] bg-card border border-border rounded-xl p-3 focus-visible:ring-primary/10 text-xs leading-normal text-foreground placeholder:text-muted-foreground/40"
            />
          </div>
          <DialogFooter className="sm:justify-end gap-2 flex-row">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsTextDialogOpen(false)}
              className="rounded-lg hover:bg-muted h-8 font-semibold text-[10px] px-3"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleTextAdd}
              disabled={!textInput.trim()}
              className="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 h-8 font-bold text-[10px] px-4 shadow-primary/10 shadow-lg"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
