import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Play, Trash2, Loader2, Plus, Terminal, Copy, Check } from 'lucide-react';
import './PythonIDE.css';

interface PythonIDEProps {
  onClose: () => void;
}

interface PythonConsole {
  id: string;
  name: string;
  logs: string[];
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
  
  // Single Editor, Multiple Consoles
  const [consoles, setConsoles] = useState<PythonConsole[]>([
    { id: '1', name: 'Консоль 1', logs: [] }
  ]);
  const [activeTab, setActiveTab] = useState<string>('code'); // 'code' or console id
  const [terminalInput, setTerminalInput] = useState<string>('');
  const [copiedConsole, setCopiedConsole] = useState<string | null>(null);
  
  const [isReady, setIsReady] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [status, setStatus] = useState(t.ready);
  
  const pyodideRef = useRef<any>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLPreElement>(null);
  const installedPackagesRef = useRef<Set<string>>(new Set());
  const consoleCounterRef = useRef<number>(2);

  // Auto-scroll the active console
  useEffect(() => {
    if (activeTab !== 'code') {
      consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoles, activeTab]);

  useEffect(() => {
    async function initPyodide() {
      try {
        if (!pyodideRef.current) {
          setStatus("Initializing Python...");
          const py = await window.loadPyodide({
            indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/"
          });
          pyodideRef.current = py;

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
        pushLogToConsole('1', `Error: Failed to load Python engine: ${err}`);
      }
    }
    initPyodide();
  }, [t.ready, currentUser]);

  useEffect(() => {
    if (activeTab === 'code' && window.Prism && highlightRef.current) {
      window.Prism.highlightElement(highlightRef.current);
    }
  }, [code, activeTab]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (highlightRef.current) {
      highlightRef.current.scrollTop = e.currentTarget.scrollTop;
      highlightRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const pushLogToConsole = (consoleId: string, log: string) => {
    setConsoles(prev => prev.map(c => 
      c.id === consoleId ? { ...c, logs: [...c.logs, log] } : c
    ));
  };

  const addConsole = () => {
    const newId = Date.now().toString();
    const newName = `Консоль ${consoleCounterRef.current++}`;
    setConsoles(prev => [...prev, { id: newId, name: newName, logs: [] }]);
    setActiveTab(newId);
  };

  const deleteConsole = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConsoles(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        // Always keep at least one output tab to avoid logic breaks
        const newId = Date.now().toString();
        const rescueConsole = { id: newId, name: `Консоль ${consoleCounterRef.current++}`, logs: [] };
        if (activeTab === id) setActiveTab('code');
        return [rescueConsole];
      }
      if (activeTab === id) {
        setActiveTab('code');
      }
      return filtered;
    });
  };

  const executeCodeContext = async (userCode: string, targetConsoleId: string, isAutoRetry = false, isTerminalCommand = false): Promise<void> => {
    if (!pyodideRef.current) return;
    
    if (!isAutoRetry && !isTerminalCommand) {
      // Clear target console if it's a full run
      setConsoles(prev => prev.map(c => c.id === targetConsoleId ? { ...c, logs: [] } : c));
    }
    
    setIsExecuting(true);
    
    // Redirect Streams
    pyodideRef.current.setStdout({ batched: (str: string) => pushLogToConsole(targetConsoleId, str) });
    pyodideRef.current.setStderr({ batched: (str: string) => pushLogToConsole(targetConsoleId, `Error: ${str}`) });

    try {
      if (!isAutoRetry && !isTerminalCommand) setStatus("Loading packages...");
      
      if (!isTerminalCommand) {
        await pyodideRef.current.loadPackagesFromImports(userCode);
      }
      
      setStatus(t.executing);

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

mp_util = create_mock_module("multiprocessing.util", register_after_fork=lambda *a, **k: None, Finalize=lambda *a, **k: None)
mp_pool = create_mock_module("multiprocessing.pool", ThreadPool=lambda *a, **k: None)
mp_context = create_mock_module("multiprocessing.context", get_context=lambda *a: None)
mp = create_mock_module("multiprocessing", 
    Process=lambda *a, **k: None, 
    Queue=lambda *a: None, 
    Pool=lambda *a: None, 
    Lock=lambda: None, 
    util=mp_util, 
    pool=mp_pool, 
    context=mp_context, 
    TimeoutError=TimeoutError,
    cpu_count=lambda: 1,
    current_process=lambda: type('Process', (), {'name': 'MainProcess'})()
)
sys.modules["_multiprocessing"] = mp
sys.modules["multiprocessing.util"] = mp_util
sys.modules["multiprocessing.pool"] = mp_pool
sys.modules["multiprocessing.context"] = mp_context
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

      if (!isTerminalCommand && (userCode.includes('matplotlib') || userCode.includes('plt.'))) {
        await pyodideRef.current.runPythonAsync(`
import matplotlib
matplotlib.use("Agg") 
import matplotlib.pyplot as plt
plt.show = lambda *args, **kwargs: None
plt.clf()
plt.close('all')
` + commonMocks);
      } else if (!isTerminalCommand) {
        await pyodideRef.current.runPythonAsync(commonMocks);
      }

      // Execute exactly what was requested
      const result = await pyodideRef.current.runPythonAsync(userCode);
      
      // If it's a terminal command and returns a value, print it like a REPL
      if (isTerminalCommand && result !== undefined) {
         pushLogToConsole(targetConsoleId, String(result));
      }
      
      if (!isTerminalCommand && userCode.includes('plt.show()')) {
        await pyodideRef.current.runPythonAsync("plt.savefig('/tmp/plot.png', bbox_inches='tight', dpi=100)");
        const data = pyodideRef.current.FS.readFile('/tmp/plot.png');
        const blob = new Blob([data.buffer], { type: 'image/png' });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (!win) {
          pushLogToConsole(targetConsoleId, "[!] Warning: Popup blocked. Please allow popups to see graphs in a new tab.");
        }
      }

      setIsExecuting(false);
      setStatus(t.ready);
      
    } catch (err: any) {
      const errorMsg = err.message;
      // Auto-Pilot: Detect Missing Module ONLY for main runs
      let missingPkg = null;
      if (!isTerminalCommand) {
        const match1 = errorMsg.match(/ModuleNotFoundError: No module named '([^']+)'/);
        const match2 = errorMsg.match(/The module '([^']+)' is included in the Pyodide distribution/);
        if (match1 && match1[1]) missingPkg = match1[1];
        else if (match2 && match2[1]) missingPkg = match2[1];
      }
      
      if (missingPkg) {
        
        if (installedPackagesRef.current.has(missingPkg)) {
          pushLogToConsole(targetConsoleId, `[Система] Неустранимая ошибка при загрузке библиотеки '${missingPkg}'.`);
          setIsExecuting(false);
          setStatus(t.ready);
          return;
        }

        installedPackagesRef.current.add(missingPkg);
        pushLogToConsole(targetConsoleId, `[Система] Обнаружена отсутствующая библиотека '${missingPkg}'. Автоматическая установка...`);
        setStatus(`Installing ${missingPkg}...`);
        
        try {
          await pyodideRef.current.loadPackage("micropip");
          await pyodideRef.current.runPythonAsync(`
import micropip
await micropip.install('${missingPkg}')
          `);
          
          pushLogToConsole(targetConsoleId, `[Система] Успешно установлено '${missingPkg}'. Повторный запуск кода...`);
          
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
          
          await executeCodeContext(userCode, targetConsoleId, true);
          return; 
          
        } catch (installErr: any) {
          const errMsg = installErr.message || "";
          if (errMsg.includes("Can't find a pure Python 3 wheel") || errMsg.includes("is already installed")) {
             let cExtDep: string | null = null;
             try {
                // Dynamically extract the specific C/C++ dependency causing the problem
                const depMatch = errMsg.match(/for '([a-zA-Z0-9_\\-]+)/) || errMsg.match(/Requested '([a-zA-Z0-9_\\-]+)/);
                cExtDep = depMatch && depMatch[1] ? depMatch[1] : null;

                if (cExtDep) {
                   pushLogToConsole(targetConsoleId, `[Система] ⚠️ Обнаружена зависимость C/C++ '${cExtDep}'. Попытка найти встроенную Wasm-версию...`);
                   await pyodideRef.current.loadPackage(cExtDep);
                   pushLogToConsole(targetConsoleId, `[Система] Wasm-версия '${cExtDep}' загружена. Возврат к принудительной установке '${missingPkg}'...`);
                   await pyodideRef.current.runPythonAsync(`await micropip.install('${missingPkg}', deps=False)`);
                   pushLogToConsole(targetConsoleId, `[Система] Принудительная установка '${missingPkg}' завершена. Повторный запуск кода...`);
                   await executeCodeContext(userCode, targetConsoleId, true);
                   return;
                } else {
                   pushLogToConsole(targetConsoleId, `[Система] ⛔ Умная установка не удалась: не удалось определить модуль C/C++ из сообщения об ошибке.`);
                }
             } catch (forceErr: any) {
                pushLogToConsole(targetConsoleId, `[Система] ⛔ Извините! Библиотека '${missingPkg}' (или ${cExtDep}) полностью несовместима с WebAssembly: ${forceErr.message}`);
             }
          } else {
             pushLogToConsole(targetConsoleId, `[Система] ⛔ Ошибка автоматической установки '${missingPkg}': ${errMsg}`);
          }
        }
      } else {
        pushLogToConsole(targetConsoleId, `[Ошибка Python] ${errorMsg}`);
      }
      
      setIsExecuting(false);
      setStatus(t.ready);
    }
  };

  const runMainCode = () => {
    if (isExecuting || !isReady) return;
    
    // Determine which console to send output to
    let targetId = activeTab;
    if (activeTab === 'code') {
       // Send to the last created console or the first one
       targetId = consoles[consoles.length - 1].id;
    }
    
    // Switch view to see the output running
    setActiveTab(targetId);
    executeCodeContext(code, targetId, false, false);
  };

  const handleTerminalCommand = (e: React.KeyboardEvent<HTMLInputElement>, consoleId: string) => {
    if (e.key === 'Enter' && terminalInput.trim() !== '') {
      if (isExecuting || !isReady) return;
      const cmd = terminalInput;
      setTerminalInput('');
      pushLogToConsole(consoleId, `>>> ${cmd}`);
      executeCodeContext(cmd, consoleId, false, true);
    }
  };

  const clearCurrentConsole = () => {
    if (activeTab !== 'code') {
       setConsoles(prev => prev.map(c => c.id === activeTab ? { ...c, logs: [] } : c));
    }
  };

  const copyCurrentConsole = () => {
    if (activeTab === 'code') return;
    const currentConsole = consoles.find(c => c.id === activeTab);
    if (currentConsole) {
      navigator.clipboard.writeText(currentConsole.logs.join('\\n')).then(() => {
        setCopiedConsole(activeTab);
        setTimeout(() => setCopiedConsole(null), 2000);
      });
    }
  };

  return (
    <div className="py-overlay">
      <div className="py-modal" onClick={e => e.stopPropagation()}>
        <div className="py-header">
          <h2>{t.pythonIdeTitle}</h2>
          <div style={{display: 'flex', alignItems: 'center', gap: '15px'}}>
            <span className="py-status">
              {!isReady ? "Loading Python engine..." : status}
            </span>
            <button className="py-close-btn" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="py-toolbar">
          <button 
            className="py-run-btn" 
            onClick={runMainCode} 
            disabled={!isReady || isExecuting}
          >
            {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {t.runCode}
          </button>
          
          {/* AcademicNT Styled Tabs */}
          <div className="cd-tabs py-tabs">
            <div 
              className={`cd-tab ${activeTab === 'code' ? 'active' : ''}`} 
              onClick={() => setActiveTab('code')}
            >
               📝 Код
            </div>
            {consoles.map(c => (
              <div 
                key={c.id} 
                className={`cd-tab py-console-tab ${activeTab === c.id ? 'active' : ''}`} 
                onClick={() => setActiveTab(c.id)}
              >
                💻 {c.name}
                <span className="py-tab-close" onClick={(e) => deleteConsole(c.id, e)}>
                  <X size={12}/>
                </span>
              </div>
            ))}
            <div className="cd-tab py-add-tab" onClick={addConsole} title="Новая консоль">
              <Plus size={14} />
            </div>
          </div>
        </div>

        {/* Dynamic Content Area */}
        <div className="cd-box py-container">
          {activeTab === 'code' ? (
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
                placeholder="# Пишите код здесь..."
              />
            </div>
          ) : (
            <div className="py-console-area">
              <div className="py-console-header">
                <span>Результат выполнения ({consoles.find(c => c.id === activeTab)?.name})</span>
                <div style={{display: 'flex', gap: '8px'}}>
                  <button className="py-clear-btn cd-back-btn" onClick={copyCurrentConsole} title="Копировать вывод">
                    {copiedConsole === activeTab ? <Check size={12} style={{marginRight: '6px'}} /> : <Copy size={12} style={{marginRight: '6px'}} />}
                    {copiedConsole === activeTab ? 'Скопировано!' : 'Копировать'}
                  </button>
                  <button className="py-clear-btn cd-back-btn" onClick={clearCurrentConsole}>
                    <Trash2 size={12} style={{marginRight: '6px'}} />
                    Очистить
                  </button>
                </div>
              </div>
              <div className="py-console">
                {consoles.find(c => c.id === activeTab)?.logs.map((line, i) => (
                  <div key={i} className={line.includes("Error") || line.includes("Failed") ? "error-line" : line.includes("[System]") ? "system-line" : "output-line"}>
                    {line}
                  </div>
                ))}
                <div ref={consoleEndRef} />
              </div>
              
              {/* Terminal Command Input */}
              <div className="py-terminal-input-wrapper">
                <Terminal size={14} className="py-terminal-icon" />
                <input 
                  type="text" 
                  className="py-terminal-input"
                  placeholder="Ввести терминальную команду (REPL)... Нажмите Enter"
                  value={terminalInput}
                  onChange={(e) => setTerminalInput(e.target.value)}
                  onKeyDown={(e) => handleTerminalCommand(e, activeTab)}
                  disabled={isExecuting || !isReady}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export const PythonLogo = ({ onClick }: { onClick: () => void }) => (
  <div className="python-trigger-icon" onClick={onClick} title="Python IDE">
    <svg viewBox="0 0 448 512" width="18" height="18">
      <path fill="#3776AB" d="M220.8 142.9c17.1 0 31 13.9 31 31s-13.9 31-31 31-31-13.9-31-31 13.9-31 31-31zm129.2 36c-18.3 0-33.2 14.9-33.2 33.2s14.9 33.2 33.2 33.2 33.2-14.9 33.2-33.2-14.9-33.2-33.2-33.2zm-129.2-36c17.1 0 31 13.9 31 31s-13.9 31-31 31-31-13.9-31-31 13.9-31 31-31zm129.2 36c-18.3 0-33.2 14.9-33.2 33.2s14.9 33.2 33.2 33.2 33.2-14.9 33.2-33.2-14.9-33.2-33.2-33.2zM224 0c-123.7 0-224 100.3-224 224s100.3 224 224 224 224-100.3 224-224S347.7 0 224 0zm0 40c101.6 0 184 82.4 184 184s-82.4 184-184 184S40 325.6 40 224 122.4 40 224 40zm0 336c83.9 0 152-68.1 152-152s-68.1-152-152-152S72 140.1 72 224s68.1 152 152 152z"/>
      <path fill="#FFD43B" d="M160 304V208h128v96H160zm112-80h-96v64h96v-64z"/>
      <path fill="#3776AB" d="M224 40c101.6 0 184 82.4 184 184s-82.4 184-184 184S40 325.6 40 224 122.4 40 224 40zm0 336c83.9 0 152-68.1 152-152s-68.1-152-152-152S72 140.1 72 224s68.1 152 152 152z"/>
    </svg>
  </div>
);
