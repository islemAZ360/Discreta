import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  X, Save, Copy, Check, Edit2, 
  Bold, Italic, List, ListOrdered, Image as ImageIcon, 
  Link as LinkIcon, Heading1, Heading2, Quote, Undo, Redo,
  Sparkles, FileCode, FileText, Trash2, Download, PlusCircle, Link2
} from 'lucide-react';
import './NodeContentView.css';

interface NodeContentViewProps {
  nodeId: string;
  nodeTitle: string;
  onClose: () => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const addImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (readerEvent) => {
          const content = readerEvent.target?.result as string;
          editor.chain().focus().setImage({ src: content }).run();
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <div className="nc-toolbar">
      <button 
        onClick={() => editor.chain().focus().toggleBold().run()} 
        className={editor.isActive('bold') ? 'is-active' : ''}
        type="button"
      >
        <Bold size={16} />
      </button>
      <button 
        onClick={() => editor.chain().focus().toggleItalic().run()} 
        className={editor.isActive('italic') ? 'is-active' : ''}
        type="button"
      >
        <Italic size={16} />
      </button>
      <button 
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
        className={editor.isActive('heading', { level: 1 }) ? 'is-active' : ''}
        type="button"
      >
        <Heading1 size={16} />
      </button>
      <button 
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
        type="button"
      >
        <Heading2 size={16} />
      </button>
      <button 
        onClick={() => editor.chain().focus().toggleBulletList().run()} 
        className={editor.isActive('bulletList') ? 'is-active' : ''}
        type="button"
      >
        <List size={16} />
      </button>
      <button 
        onClick={() => editor.chain().focus().toggleOrderedList().run()} 
        className={editor.isActive('orderedList') ? 'is-active' : ''}
        type="button"
      >
        <ListOrdered size={16} />
      </button>
      <button 
        onClick={() => editor.chain().focus().toggleBlockquote().run()} 
        className={editor.isActive('blockquote') ? 'is-active' : ''}
        type="button"
      >
        <Quote size={16} />
      </button>
      <button onClick={addImage} type="button">
        <ImageIcon size={16} />
      </button>
      <div className="nc-toolbar-divider" />
      <button onClick={() => editor.chain().focus().undo().run()} type="button">
        <Undo size={16} />
      </button>
      <button onClick={() => editor.chain().focus().redo().run()} type="button">
        <Redo size={16} />
      </button>
    </div>
  );
};

export default function NodeContentView({ nodeId, nodeTitle, onClose }: NodeContentViewProps) {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const [instructions, setInstructions] = useState('');
  const [prompt, setPrompt] = useState('');
  const [attachments, setAttachments] = useState<{name: string, data: string, storagePath?: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Record<string, number>>({});
  const [isDirty, setIsDirty] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
      }),
    ],
    content: instructions,
    editable: editMode,
    onUpdate: ({ editor }) => {
      setInstructions(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && !loading) {
      editor.setEditable(editMode);
    }
  }, [editMode, editor, loading]);

  useEffect(() => {
    const fetchContent = async () => {
      setLoading(true);
      try {
        const docRef = doc(db, 'nodes_content', nodeId);
        const docSnap = await getDoc(docRef);
        
        // Initial defaults
        let finalInstructions = '';
        let finalPrompt = '';
        let finalAttachments: any[] = [];

        if (docSnap.exists()) {
          const data = docSnap.data();
          finalInstructions = data.instructions || '';
          finalPrompt = data.prompt || '';
          finalAttachments = data.attachments || [];
        }

        // --- CHECK FOR LOCAL DRAFT ---
        const savedDraft = localStorage.getItem(`draft_${nodeId}`);
        if (savedDraft) {
          try {
            const draft = JSON.parse(savedDraft);
            // If draft is different from Firestore, restore it!
            if (draft.instructions !== finalInstructions || draft.prompt !== finalPrompt || JSON.stringify(draft.attachments) !== JSON.stringify(finalAttachments)) {
              finalInstructions = draft.instructions;
              finalPrompt = draft.prompt;
              finalAttachments = draft.attachments;
              setDraftRestored(true);
              setIsDirty(true);
              setTimeout(() => setDraftRestored(false), 3000);
            }
          } catch (e) {
            console.error("Error parsing draft", e);
          }
        }

        setInstructions(finalInstructions);
        setPrompt(finalPrompt);
        setAttachments(finalAttachments);
        if (editor) {
          editor.commands.setContent(finalInstructions);
        }

        if (docSnap.exists()) {
          setEditMode(false);
        } else {
          if (isAdmin) setEditMode(true);
        }
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [nodeId, editor, isAdmin]);

  // --- AUTO-SAVE DRAFT EFFECT ---
  useEffect(() => {
    if (!loading && editMode && isAdmin) {
      const draft = {
        instructions,
        prompt,
        attachments,
        timestamp: Date.now()
      };
      const timer = setTimeout(() => {
        localStorage.setItem(`draft_${nodeId}`, JSON.stringify(draft));
      }, 1000); // Save every 1 sec of inactivity
      return () => clearTimeout(timer);
    }
  }, [instructions, prompt, attachments, nodeId, loading, editMode, isAdmin]);

  // --- UNSAVED CHANGES WARNING (TAB CLOSE) ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Track changes to mark as dirty
  useEffect(() => {
    if (!loading && editMode) {
      setIsDirty(true);
    }
  }, [instructions, prompt, attachments]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'nodes_content', nodeId), {
        instructions: editor?.getHTML() || instructions,
        prompt,
        attachments,
        updatedAt: new Date().toISOString()
      });
      localStorage.removeItem(`draft_${nodeId}`); // Clear draft!
      setIsDirty(false);
      setEditMode(false);
    } catch (error) {
      console.error("Error saving content:", error);
      alert("Error saving data. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf';
    input.multiple = true;
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files) as File[];
      if (files.length === 0) return;

      setSaving(true);
      
      const uploadPromises = files.map(async (file) => {
        if (file.size > 20 * 1024 * 1024) { // Increased to 20MB
          alert(`${file.name} is too large. 20MB max.`);
          return null;
        }

        return new Promise<{name: string, data: string, storagePath: string} | null>((resolve) => {
          const storagePath = `nodes/${nodeId}/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, storagePath);
          const uploadTask = uploadBytesResumable(storageRef, file);

          uploadTask.on('state_changed', 
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              setUploadingFiles(prev => ({ ...prev, [file.name]: Math.round(progress) }));
            }, 
            (error) => {
              console.error("Upload error:", error);
              alert(`Could not upload ${file.name}`);
              setUploadingFiles(prev => {
                const newState = { ...prev };
                delete newState[file.name];
                return newState;
              });
              resolve(null);
            }, 
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              setUploadingFiles(prev => {
                const newState = { ...prev };
                delete newState[file.name];
                return newState;
              });
              resolve({ 
                name: file.name, 
                data: downloadURL,
                storagePath: storagePath 
              });
            }
          );
        });
      });

      const results = await Promise.all(uploadPromises);
      const successfulUploads = results.filter(r => r !== null) as any[];
      
      if (successfulUploads.length > 0) {
        setAttachments(prev => [...prev, ...successfulUploads]);
      }
      setSaving(false);
    };
    input.click();
  };

  const handleAddExternalLink = () => {
    const url = window.prompt("Введите прямую ссылку на PDF (Google Drive direct link, Cloud, etc.):");
    if (!url) return;
    
    // Basic validation
    if (!url.startsWith('http')) {
      alert("Некорректная ссылка. Должна начинаться مع http:// أو https://");
      return;
    }

    const name = window.prompt("Введите название для этого файла:", "Внешний документ.pdf");
    if (!name) return;

    setAttachments(prev => [...prev, { name, data: url }]);
  };

  const removeAttachment = async (index: number) => {
    const fileToRemove = attachments[index] as any;
    
    if (confirm(`Do you want to delete ${fileToRemove.name}?`)) {
      setSaving(true);
      try {
        // If it has a storagePath, delete it from Firebase Storage
        if (fileToRemove.storagePath) {
          const storageRef = ref(storage, fileToRemove.storagePath);
          await deleteObject(storageRef);
        }
        
        setAttachments(attachments.filter((_, i) => i !== index));
      } catch (error) {
        console.error("Error deleting from storage:", error);
        // Still remove from state even if storage delete fails (maybe it was manually deleted already)
        setAttachments(attachments.filter((_, i) => i !== index));
      } finally {
        setSaving(false);
      }
    }
  };

  const downloadFile = (file: {name: string, data: string}) => {
    const link = document.createElement('a');
    link.href = file.data;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSafeClose = () => {
    if (isDirty) {
      if (window.confirm("У вас есть несохраненные изменения (черновик сохранен локально). Вы уверены, что хотите выйти?")) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  if (loading) {
    return (
      <div className="nc-overlay">
        <div className="nc-modal loading">
          <div className="spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="nc-overlay" onClick={onClose}>
      <div 
        className={`nc-modal ${!isAdmin ? 'secure-mode' : ''}`} 
        onClick={(e) => e.stopPropagation()}
        onContextMenu={(e) => !isAdmin && e.preventDefault()}
      >
        <div className="nc-header">
          <h2>{nodeTitle}</h2>
          <div className="nc-actions">
            {isAdmin && (
              <button 
                className={`nc-btn-icon ${editMode ? 'active' : ''}`} 
                onClick={() => setEditMode(!editMode)}
                title={t.editModeTooltip}
              >
                <Edit2 size={18} />
              </button>
            )}
            <button className="nc-btn-close" onClick={handleSafeClose}>
              <X size={20} />
            </button>
          </div>
        </div>

        {draftRestored && (
          <div className="nc-draft-alert">
            <Sparkles size={14} /> <span>Черновик автоматически восстановлен</span>
          </div>
        )}

        <div className="nc-content">
          <section className="nc-section">
            <h3 className="nc-section-title">
              {t.instructionsTitle}
            </h3>
            <div className={`nc-editor-container ${editMode ? 'is-editing' : 'is-viewing'}`}>
              {isAdmin && editMode && <MenuBar editor={editor} />}
              <div className="nc-tiptap-wrapper">
                <EditorContent editor={editor} />
                {!editMode && !instructions && (
                  <p className="nc-placeholder">{t.noInstructions}</p>
                )}
              </div>
            </div>
          </section>

          <section className="nc-section">
            <h3 className="nc-section-title">
              {t.attachmentsTitle}
            </h3>
            <div className="nc-attachments-container">
              {Object.keys(uploadingFiles).length > 0 && (
                <div className="nc-uploading-list">
                  {Object.entries(uploadingFiles).map(([name, progress]) => (
                    <div key={name} className="nc-uploading-item">
                      <div className="nc-uploading-info">
                        <span className="nc-uploading-name">Загрузка: {name}</span>
                        <span className="nc-uploading-percent">{progress}%</span>
                      </div>
                      <div className="nc-progress-bar">
                        <div className="nc-progress-fill" style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {attachments.length === 0 && Object.keys(uploadingFiles).length === 0 ? (
                <p className="nc-placeholder">{t.noFiles}</p>
              ) : (
                <div className="nc-file-list">
                  {attachments.map((file, index) => (
                    <div key={index} className="nc-file-item">
                      <div className="nc-file-info" onClick={() => downloadFile(file)}>
                        <FileText size={16} className="nc-file-icon" />
                        <span className="nc-file-name">{file.name}</span>
                        {file.data.startsWith('http') && !file.data.includes('firebasestorage') && (
                           <span title="Внешняя ссылка"><Link2 size={12} className="nc-external-icon" /></span>
                        )}
                        <Download size={14} className="nc-download-hint" />
                      </div>
                      {isAdmin && editMode && (
                        <button 
                          className="nc-delete-file-btn" 
                          onClick={() => removeAttachment(index)}
                          title={t.deleteFile}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              {isAdmin && editMode && (
                <div className="nc-upload-actions">
                  <button 
                    className="nc-upload-pdf-btn" 
                    onClick={handleFileUpload}
                    disabled={saving}
                  >
                     {saving ? <div className="spinner-small"></div> : <PlusCircle size={16} />}
                     <span>{saving ? 'Загрузка...' : t.uploadPdfBtn}</span>
                  </button>
                  <button 
                    className="nc-upload-pdf-btn secondary" 
                    onClick={handleAddExternalLink}
                    disabled={saving}
                  >
                     <Link2 size={16} />
                     <span>Добавить ссылку</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          <section className="nc-section">
            <h3 className="nc-section-title">
              {t.promptTitle}
            </h3>
            <div className="nc-prompt-wrapper">
              {isAdmin && editMode ? (
                <textarea 
                  className="nc-prompt-input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={t.promptPlaceholder}
                />
              ) : (
                <div className="nc-prompt-display">
                  <pre className="nc-prompt-text">{prompt || t.noPrompt}</pre>
                  {prompt && (
                    <button className="nc-copy-btn" onClick={handleCopy}>
                      {copied ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copied ? t.copied : t.copyPrompt}</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {isAdmin && editMode && (
          <div className="nc-footer">
            <button className="nc-save-btn" onClick={handleSave} disabled={saving}>
              {saving ? <div className="spinner-dots"><span></span><span></span><span></span></div> : <Save size={14} />}
              <span>{saving ? t.saving : t.saveChanges}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
