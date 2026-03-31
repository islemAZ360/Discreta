import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Play, Trash2, Loader2 } from 'lucide-react';
import './PythonIDE.css';

interface PythonIDEProps {
  onClose: () => void;
}

declare global {
  interface Window {
    loadPyodide: (config: { indexURL: string }) => Promise<any>;
    Prism: any;
  }
}

export default function PythonIDE({ onClose }: PythonIDEProps) {
  const { t } = useLanguage();
  const { currentUser } = useAuth();
  
  const [code, setCode] = useState(t.pyPlaceholder);
  const [output, setOutput] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState(t.ready);
  
  const pyodideRef = useRef<any>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  // Store user's auto-installed packages in memory to avoid redundant calls
  const installedPackagesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    async function initPyodide() {
      try {
        if (!pyodideRef.current) {
          setStatus("Initializing Python...");
          const py = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
          });
          pyodideRef.current = py;

          // Background Pre-flight: Fetch previously saved packages 
          if (currentUser) {
            setStatus("Loading saved libraries...");
            try {
              const userDocRef = doc(db, 'users', currentUser.uid);
              const userDocSnap = await getDoc(userDocRef);
              if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                const pkgs = userData.pythonPackages || [];
                if (pkgs.length > 0) {
                  await py.loadPackage("micropip");
                  await py.runPythonAsync(`
import micropip
await micropip.install([${pkgs.map((p:string) => `'${p}'`).join(',')}])
                  `);
                  pkgs.forEach((p:string) => installedPackagesRef.current.add(p));
                }
              }
            } catch (fbErr) {
              console.warn("Failed to preload user packages", fbErr);
            }
          }
        }
        setIsReady(true);
        setStatus(t.ready);
      } catch (err) {
        console.error("Failed to load Pyodide:", err);
        setOutput(prev => [...prev, `Error: Failed to load Python engine: ${err}`]);
      }
    }
    initPyodide();
  }, [t.ready, currentUser]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  useEffect(() => {
    if (window.Prism && highlightRef.current) {
      window.Prism.highlightElement(highlightRef.current);
    }
  }, [code]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const executeCodeContext = async (userCode: string, isAutoRetry = false): Promise<void> => {
    if (!pyodideRef.current) return;
    
    if (!isAutoRetry) {
      setIsExecuting(true);
    }
    
    const logs: string[] = [];
    pyodideRef.current.setStdout({ batched: (str: string) => logs.push(str) });
    pyodideRef.current.setStderr({ batched: (str: string) => logs.push(`Error: ${str}`) });

    try {
      if (!isAutoRetry) setStatus("Loading packages...");
      await pyodideRef.current.loadPackagesFromImports(userCode);
      
      if (!isAutoRetry) setStatus(t.executing);

      const commonMocks = `
import js
import sys
import types
import builtins

def input(prompt=""):
    res = js.prompt(prompt)
    return res if res is not None else ""
builtins.input = input
import __main__
__main__.input = input

def create_mock_module(name, **kwargs):
    m = types.ModuleType(name)
    for k, v in kwargs.items():
        setattr(m, k, v)
    if "." not in name:
        m.__path__ = []
    sys.modules[name] = m
    return m

mp = create_mock_module("multiprocessing", Process=lambda *a, **k: None, Queue=lambda *a: None, Pool=lambda *a: None, Lock=lambda: None)
sys.modules["_multiprocessing"] = mp
create_mock_module("multiprocessing.dummy", Pool=lambda *a: None, Process=lambda *a: None)
try:
    import concurrent.futures
    class MockProcessPoolExecutor(concurrent.futures.ThreadPoolExecutor):
        def __init__(self, *args, **kwargs):
            super().__init__(max_workers=1)
    concurrent.futures.ProcessPoolExecutor = MockProcessPoolExecutor
except ImportError:
    pass
      `;

      if (userCode.includes('matplotlib') || userCode.includes('plt.')) {
        await pyodideRef.current.runPythonAsync(`
import matplotlib
matplotlib.use("Agg") 
import matplotlib.pyplot as plt
plt.show = lambda *args, **kwargs: None
plt.clf()
plt.close('all')
` + commonMocks);
      } else {
        await pyodideRef.current.runPythonAsync(commonMocks);
      }

      await pyodideRef.current.runPythonAsync(userCode);
      
      if (userCode.includes('plt.show()')) {
        await pyodideRef.current.runPythonAsync("plt.savefig('/tmp/plot.png', bbox_inches='tight', dpi=100)");
        const data = pyodideRef.current.FS.readFile('/tmp/plot.png');
        const blob = new Blob([data.buffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
          setOutput(prev => [...prev, "[!] Warning: Popup blocked. Please allow popups to see graphs in a new tab."]);
        }
      }

      setOutput(prev => [...prev, ...logs]);
      setIsExecuting(false);
      setStatus(t.ready);
      
    } catch (err: any) {
      const errorMsg = err.message;
      
      // Auto-Pilot: Detect Missing Module
      const match = errorMsg.match(/ModuleNotFoundError: No module named '([^']+)'/);
      
      if (match && match[1]) {
        const missingPkg = match[1];
        
        // Prevent infinite loops if the package simply fails to install completely
        if (installedPackagesRef.current.has(missingPkg)) {
          setOutput(prev => [...prev, ...logs, `[System] Unresolvable Error trying to load library '${missingPkg}'.`]);
          setIsExecuting(false);
          setStatus(t.ready);
          return;
        }

        installedPackagesRef.current.add(missingPkg);
        
        // Notify User
        setOutput(prev => [...prev, `[System] Missing library '${missingPkg}' detected. Auto-installing...`]);
        setStatus(`Installing ${missingPkg}...`);
        
        try {
          // Install via micropip
          await pyodideRef.current.loadPackage("micropip");
          await pyodideRef.current.runPythonAsync(`
import micropip
await micropip.install('${missingPkg}')
          `);
          
          setOutput(prev => [...prev, `[System] Successfully installed '${missingPkg}'. Re-running code...`]);
          
          // Save to Firebase for next time
          if (currentUser) {
            try {
              const userRef = doc(db, 'users', currentUser.uid);
              await updateDoc(userRef, {
                pythonPackages: arrayUnion(missingPkg)
              });
            } catch (fbErr) {
               console.warn("Could not save package permanently:", fbErr);
            }
          }
          
          // Retry automatically
          await executeCodeContext(userCode, true);
          return; // Exit current catch to let the retry finish
          
        } catch (installErr: any) {
          setOutput(prev => [...prev, ...logs, `[System] Failed to auto-install '${missingPkg}': ${installErr.message}`]);
        }
      } else {
        // Standard non-module errors
        setOutput(prev => [...prev, ...logs, `[Python Error] ${errorMsg}`]);
      }
      
      // Cleanup on failure
      setIsExecuting(false);
      setStatus(t.ready);
    }
  };

  const runCode = () => {
    if (isExecuting || !isReady) return;
    executeCodeContext(code, false);
  };

  const clearConsole = () => setOutput([]);

  return (
    <div className="py-overlay" onClick={onClose}>
      <div className="py-modal" onClick={e => e.stopPropagation()}>
        <div className="py-header">
          <h2>{t.pythonIdeTitle}</h2>
          <button className="py-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="py-toolbar">
          <button 
            className="py-run-btn" 
            onClick={runCode} 
            disabled={!isReady || isExecuting}
          >
            {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {t.runCode}
          </button>
          <span className="py-status">
            {!isReady ? "Loading Python engine..." : status}
          </span>
        </div>

        <div className="py-container">
          <div className="py-editor-side">
            <div className="py-editor-wrapper">
              <pre className="py-highlight-layer" aria-hidden="true">
                <code ref={highlightRef} className="language-python">
                  {code}
                </code>
              </pre>
              <textarea
                ref={textareaRef}
                className="py-editor"
                value={code}
                onChange={e => setCode(e.target.value)}
                onScroll={handleScroll}
                spellCheck={false}
                autoFocus
              />
            </div>
          </div>
          <div className="py-console-side">
            <div className="py-console-header">
              <span>{t.consoleTitle}</span>
              <button className="py-clear-btn" onClick={clearConsole}>
                <Trash2 size={12} style={{marginRight: '4px'}} />
                {t.clearConsole}
              </button>
            </div>
            <div className="py-console">
              {output.map((line, i) => (
                <div key={i} className={line.includes("Error") || line.includes("Failed") ? "error-line" : line.includes("[System]") ? "system-line" : "output-line"}>
                  {line}
                </div>
              ))}
              <div ref={consoleEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const PythonLogo = ({ onClick }: { onClick: () => void }) => (
  <div className="python-trigger-icon" onClick={onClick} title="Python IDE">
    <svg viewBox="0 0 448 512" width="18" height="18">
      <path fill="#3776AB" d="M220.8 142.9c17.1 0 31 13.9 31 31s-13.9 31-31 31-31-13.9-31-31 13.9-31 31-31zm129.2 36c-18.3 0-33.2 14.9-33.2 33.2s14.9 33.2 33.2 33.2 33.2-14.9 33.2-33.2-14.9-33.2-33.2-33.2zm-129.2-36c17.1 0 31 13.9 31 31s-13.9 31-31 31-31-13.9-31-31 13.9-31 31-31zm129.2 36c-18.3 0-33.2 14.9-33.2 33.2s14.9 33.2 33.2 33.2 33.2-14.9 33.2-33.2-14.9-33.2-33.2-33.2zM224 0c-123.7 0-224 100.3-224 224s100.3 224 224 224 224-100.3 224-224S347.7 0 224 0zm0 40c101.6 0 184 82.4 184 184s-82.4 184-184 184S40 325.6 40 224 122.4 40 224 40z"/>
      <path fill="#FFD43B" d="M160 304V208h128v96H160zm112-80h-96v64h96v-64z"/>
      <path fill="#3776AB" d="M224 40c101.6 0 184 82.4 184 184s-82.4 184-184 184S40 325.6 40 224 122.4 40 224 40zm0 336c83.9 0 152-68.1 152-152s-68.1-152-152-152S72 140.1 72 224s68.1 152 152 152z"/>
    </svg>
  </div>
);
