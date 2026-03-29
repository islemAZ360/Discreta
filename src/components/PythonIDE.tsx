import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
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
  const [code, setCode] = useState(t.pyPlaceholder);
  const [output, setOutput] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState(t.ready);
  const pyodideRef = useRef<any>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);

  useEffect(() => {
    async function initPyodide() {
      try {
        if (!pyodideRef.current) {
          setStatus("Initializing Python...");
          const py = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
          });
          pyodideRef.current = py;
        }
        setIsReady(true);
        setStatus(t.ready);
      } catch (err) {
        console.error("Failed to load Pyodide:", err);
        setOutput(prev => [...prev, `Error: Failed to load Python engine: ${err}`]);
      }
    }
    initPyodide();
  }, [t.ready]);

  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  // Sync highlighting
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

  const runCode = async () => {
    if (!pyodideRef.current || isExecuting) return;

    setIsExecuting(true);
    const logs: string[] = [];
    
    // Redirect stdout to our logs array
    pyodideRef.current.setStdout({
      batched: (str: string) => logs.push(str)
    });
    
    // Redirect stderr
    pyodideRef.current.setStderr({
      batched: (str: string) => logs.push(`Error: ${str}`)
    });

    try {
      setStatus("Loading packages...");
      
      // Automatically load packages used in the code (matplotlib, numpy, etc.)
      await pyodideRef.current.loadPackagesFromImports(code);
      
      setStatus(t.executing);

      // Common Mocks (Available for every run)
      const commonMocks = `
import js
import sys
import types
import builtins

# 1. Mock input()
def input(prompt=""):
    res = js.prompt(prompt)
    return res if res is not None else ""
builtins.input = input
import __main__
__main__.input = input

# 2. Mock multiprocessing as a full package
def create_mock_module(name, **kwargs):
    m = types.ModuleType(name)
    for k, v in kwargs.items():
        setattr(m, k, v)
    if "." not in name:
        m.__path__ = []
    sys.modules[name] = m
    return m

mp = create_mock_module("multiprocessing", 
    Process=lambda *a, **k: None,
    Queue=lambda *a: None,
    Pool=lambda *a: None,
    Lock=lambda: None,
    RLock=lambda: None,
    Event=lambda: None,
    Condition=lambda: None,
    Semaphore=lambda: None,
    BoundedSemaphore=lambda: None,
    cpu_count=lambda: 1,
    current_process=lambda: types.SimpleNamespace(name="MainProcess")
)
sys.modules["_multiprocessing"] = mp

# Mock all commonly used submodules
create_mock_module("multiprocessing.connection", Client=lambda *a: None, Listener=lambda *a: None)
create_mock_module("multiprocessing.pool", Pool=lambda *a: None)
create_mock_module("multiprocessing.queues", Queue=lambda *a: None)
create_mock_module("multiprocessing.synchronize", Lock=lambda: None, RLock=lambda: None, Event=lambda: None, Condition=lambda: None, Semaphore=lambda: None, BoundedSemaphore=lambda: None)
create_mock_module("multiprocessing.context", DefaultContext=lambda: None)
create_mock_module("multiprocessing.spawn")
create_mock_module("multiprocessing.process")
create_mock_module("multiprocessing.util")
create_mock_module("multiprocessing.dummy", Pool=lambda *a: None, Process=lambda *a: None)

# 3. Mock concurrent.futures.ProcessPoolExecutor
try:
    import concurrent.futures
    class MockProcessPoolExecutor(concurrent.futures.ThreadPoolExecutor):
        def __init__(self, *args, **kwargs):
            super().__init__(max_workers=1)
    concurrent.futures.ProcessPoolExecutor = MockProcessPoolExecutor
except ImportError:
    pass
`;

      // Force Matplotlib to use the 'Agg' backend if detected
      if (code.includes('matplotlib') || code.includes('plt.')) {
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

      await pyodideRef.current.runPythonAsync(code);
      
      // If the code uses plt.show(), we save it to memory and open as a new tab
      if (code.includes('plt.show()')) {
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
    } catch (err: any) {
      setOutput(prev => [...prev, ...logs, `[Python Error] ${err.message}`]);
    } finally {
      setIsExecuting(false);
      setStatus(t.ready);
    }
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
                <div key={i} className={line.includes("Error") ? "error-line" : "output-line"}>
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

// Simple Python Logo Component for use in Dashboard
export const PythonLogo = ({ onClick }: { onClick: () => void }) => (
  <div className="python-trigger-icon" onClick={onClick} title="Python IDE">
    <svg viewBox="0 0 448 512" width="18" height="18">
      <path fill="#3776AB" d="M220.8 142.9c17.1 0 31 13.9 31 31s-13.9 31-31 31-31-13.9-31-31 13.9-31 31-31zm129.2 36c-18.3 0-33.2 14.9-33.2 33.2s14.9 33.2 33.2 33.2 33.2-14.9 33.2-33.2-14.9-33.2-33.2-33.2zm-129.2-36c17.1 0 31 13.9 31 31s-13.9 31-31 31-31-13.9-31-31 13.9-31 31-31zm129.2 36c-18.3 0-33.2 14.9-33.2 33.2s14.9 33.2 33.2 33.2 33.2-14.9 33.2-33.2-14.9-33.2-33.2-33.2zM224 0c-123.7 0-224 100.3-224 224s100.3 224 224 224 224-100.3 224-224S347.7 0 224 0zm0 40c101.6 0 184 82.4 184 184s-82.4 184-184 184S40 325.6 40 224 122.4 40 224 40z"/>
      <path fill="#FFD43B" d="M160 304V208h128v96H160zm112-80h-96v64h96v-64z"/>
      <path fill="#3776AB" d="M224 40c101.6 0 184 82.4 184 184s-82.4 184-184 184S40 325.6 40 224 122.4 40 224 40zm0 336c83.9 0 152-68.1 152-152s-68.1-152-152-152S72 140.1 72 224s68.1 152 152 152z"/>
    </svg>
  </div>
);
