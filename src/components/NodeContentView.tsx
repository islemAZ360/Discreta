import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  X, Save, Copy, Check, Edit2, 
  Bold, Italic, List, ListOrdered, Image as ImageIcon, 
  Link as LinkIcon, Heading1, Heading2, Quote, Undo, Redo,
  Sparkles, FileCode, FileText, Trash2, Download, Link2
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
  const [isDirty, setIsDirty] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({
        allowBase64: true,
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

  const handleAddExternalLink = () => {
    const url = window.prompt("Введите прямую ссылку на PDF (Google Drive direct link, Cloud, etc.):");
    if (!url) return;
    
    if (!url.startsWith('http')) {
      alert("Некорректная ссылка. Должна начинаться с http:// или https://");
      return;
    }

    const name = window.prompt("Введите название для этого файла:", "Внешний документ.pdf");
    if (!name) return;

    setAttachments(prev => [...prev, { name, data: url }]);
  };

  const removeAttachment = (index: number) => {
    const fileToRemove = attachments[index] as any;
    if (confirm(`Do you want to delete ${fileToRemove.name}?`)) {
      setAttachments(attachments.filter((_, i) => i !== index));
    }
  };

  const downloadFile = (file: {name: string, data: string}) => {
    let url = file.data;
    
    // Smart URL Parsing for Direct Downloads
    if (url.includes('drive.google.com/file/d/')) {
      // Convert Google Drive view link to direct download link
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        url = `https://drive.google.com/uc?export=download&id=${match[1]}`;
      }
    } else if (url.includes('dropbox.com/') && url.includes('dl=0')) {
      // Convert Dropbox view link to direct download link
      url = url.replace('dl=0', 'dl=1');
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = file.name || 'document';
    link.target = '_blank'; // Fallback if browser blocks standard download due to CORS
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
              {attachments.length === 0 ? (
                <p className="nc-placeholder">{t.noFiles}</p>
              ) : (
                <div className="nc-file-list">
                  {attachments.map((file, index) => (
                    <div key={index} className="nc-file-item">
                      <div className="nc-file-info" onClick={() => downloadFile(file)}>
                        <FileText size={16} className="nc-file-icon" />
                        <span className="nc-file-name">{file.name}</span>
                        {file.data.startsWith('http') && (
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
                    onClick={handleAddExternalLink}
                    disabled={saving}
                  >
                     <Link2 size={16} />
                     <span>Добавить ссылку на PDF</span>
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
              {saving ? (
                <div className="spinner-dots"><span></span><span></span><span></span></div>
              ) : (
                <Save size={14} />
              )}
              <span>{saving ? t.saving : t.saveChanges}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
