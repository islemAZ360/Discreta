import React, { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'; // Added Storage utilities
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  X, Save, Copy, Check, Edit2, 
  Bold, Italic, List, ListOrdered, Image as ImageIcon, 
  Link as LinkIcon, Heading1, Heading2, Quote, Undo, Redo,
  Sparkles, FileCode, FileText, Trash2, Download, PlusCircle 
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
        if (docSnap.exists()) {
          const data = docSnap.data();
          const content = data.instructions || '';
          setInstructions(content);
          setPrompt(data.prompt || '');
          setAttachments(data.attachments || []);
          if (editor) {
            editor.commands.setContent(content);
          }
          setEditMode(false); // Default to view mode for existing content
        } else {
          // RESET STATE for new/empty nodes
          setInstructions('');
          setPrompt('');
          setAttachments([]);
          if (editor) {
            editor.commands.setContent('');
          }
          // AUTO-EDIT: If it's a new node and it's an Admin, enable edit mode immediately
          if (isAdmin) {
             setEditMode(true);
          } else {
             setEditMode(false);
          }
        }
      } catch (error) {
        console.error("Error fetching content:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchContent();
  }, [nodeId, editor, isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'nodes_content', nodeId), {
        instructions: editor?.getHTML() || instructions,
        prompt,
        attachments,
        updatedAt: new Date().toISOString()
      });
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
    input.multiple = true; // Allow multiple selection
    input.onchange = async (e: any) => {
      const files = Array.from(e.target.files) as File[];
      if (files.length === 0) return;

      setSaving(true);
      const newAttachments = [...attachments];

      for (const file of files) {
        // Size check (e.g. 10MB per file since it's Storage now)
        if (file.size > 10 * 1024 * 1024) {
          alert(`${file.name} is too large. 10MB max per file.`);
          continue;
        }

        try {
          const storagePath = `nodes/${nodeId}/${Date.now()}_${file.name}`;
          const storageRef = ref(storage, storagePath);
          await uploadBytes(storageRef, file);
          const downloadURL = await getDownloadURL(storageRef);
          
          newAttachments.push({ 
            name: file.name, 
            data: downloadURL,
            storagePath: storagePath // Keep path to delete later
          });
        } catch (error) {
          console.error("Error uploading file:", error);
          alert(`Could not upload ${file.name}`);
        }
      }

      setAttachments(newAttachments);
      setSaving(false);
    };
    input.click();
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
            <button className="nc-btn-close" onClick={onClose}>
              <X size={20} />
            </button>
          </div>
        </div>

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
                <button 
                  className="nc-upload-pdf-btn" 
                  onClick={handleFileUpload}
                  disabled={saving}
                >
                   {saving ? <div className="spinner-small"></div> : <PlusCircle size={16} />}
                   <span>{saving ? t.saving : t.uploadPdfBtn}</span>
                </button>
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
