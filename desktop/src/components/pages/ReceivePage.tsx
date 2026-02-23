import { History, Info, X, Trash2, FolderOpen, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LogoIcon } from '../common/Logo';
import { useState, useEffect } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface HistoryItem {
  id: string;
  name: string;
  size: number;
  timestamp: number;
  from: string;
  path?: string;
}

export function ReceivePage() {
  const [deviceName, setDeviceName] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    // Get identity from main process (which handles persistence/generation)
    window.ipcRenderer.invoke('get-server-info').then((info) => {
      setDeviceName(info.name);
      setDeviceId(info.id);
    });

    const loadHistory = () => {
      const historyJson = localStorage.getItem('transfer-history');
      if (historyJson) {
        setHistory(JSON.parse(historyJson));
      }
    };

    loadHistory();

    // Listen for history updates from App.tsx
    window.addEventListener('history-updated', loadHistory);
    return () => window.removeEventListener('history-updated', loadHistory);
  }, []);

  const clearHistory = () => {
    localStorage.removeItem('transfer-history');
    setHistory([]);
  };

  const openFolder = () => {
    window.ipcRenderer.invoke('open-folder');
  };

  const openFile = (path?: string) => {
    if (path) {
      window.ipcRenderer.invoke('open-file', path);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (showHistory) {
    return (
      <div className="flex-1 flex flex-col bg-background animate-in fade-in duration-300">
        {/* History Header */}
        <div className="flex items-center justify-between p-6 border-b shrink-0">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-10 w-10 hover:bg-muted"
              onClick={() => setShowHistory(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <h2 className="text-2xl font-bold tracking-tight">Transfer History</h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-2 px-4 h-9 font-semibold"
              onClick={openFolder}
            >
              <FolderOpen className="h-4 w-4" />
              Open Folder
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full gap-2 px-4 h-9 font-semibold text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={clearHistory}
            >
              <Trash2 className="h-4 w-4" />
              Clear
            </Button>
          </div>
        </div>

        {/* History Content */}
        <div className="flex-1 overflow-hidden relative">
          {history.length > 0 ? (
            <ScrollArea className="h-full px-6 py-4">
              <div className="max-w-5xl mx-auto space-y-3">
                {[...history].reverse().map((item) => (
                  <div
                    key={item.id}
                    className="group bg-muted/30 hover:bg-muted/50 border border-transparent hover:border-border p-4 rounded-2xl flex items-center gap-4 transition-all duration-200 cursor-pointer"
                    onClick={() => openFile(item.path)}
                  >
                    <div className="h-12 w-12 bg-background rounded-xl flex items-center justify-center border shadow-sm group-hover:scale-110 transition-transform duration-300">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start">
                        <p className="text-sm font-bold truncate tracking-tight">{item.name}</p>
                        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(item.timestamp)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-muted-foreground/80">
                          {formatFileSize(item.size)}
                        </span>
                        <span className="text-[11px] text-muted-foreground/40">•</span>
                        <span className="text-[11px] font-bold text-primary/80">
                          From: {item.from}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center space-y-4 opacity-40">
              <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">
                <History size={40} className="text-muted-foreground" />
              </div>
              <p className="text-lg font-bold tracking-tight">No transfers yet</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center relative p-8 animate-in fade-in duration-500">
      {/* Top Right Actions */}
      <div className="absolute top-4 right-4 flex gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 rounded-full hover:bg-muted"
          onClick={() => setShowHistory(true)}
        >
          <History className="h-5 w-5 text-muted-foreground" />
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-muted">
          <Info className="h-5 w-5 text-muted-foreground" />
        </Button>
      </div>

      {/* Central Icon Area */}
      <div className="mb-12 relative flex items-center justify-center">
        <LogoIcon
          size={192}
          className="opacity-90 transition-transform hover:scale-105 duration-500"
        />
      </div>

      {/* Device Info */}
      <div className="text-center space-y-2 mb-12">
        <h1 className="text-5xl font-black tracking-tighter">{deviceName || 'Loading...'}</h1>
        <p className="text-xl text-muted-foreground font-mono font-bold tracking-widest opacity-60">
          #{deviceId}
        </p>
      </div>

      {/* Quick Save Toggle */}
      {/*
        Quick Save Toggle (disabled for now)
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
      */}
    </div>
  );
}
