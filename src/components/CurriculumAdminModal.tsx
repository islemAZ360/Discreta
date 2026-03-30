import React, { useState, useEffect } from 'react';
import { CurriculumNode, CurriculumNodeType } from '../hooks/useCurriculum';
import './CourseDetailsView.css';

interface CurriculumAdminModalProps {
  onClose: () => void;
  onSave: (node: CurriculumNode) => void;
  initialNode?: CurriculumNode | null;
  mode: 'add' | 'edit';
}

export default function CurriculumAdminModal({ onClose, onSave, initialNode, mode }: CurriculumAdminModalProps) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<CurriculumNodeType>('topic');

  useEffect(() => {
    if (initialNode && mode === 'edit') {
      setTitle(initialNode.title);
      setType(initialNode.type || 'topic');
    }
  }, [initialNode, mode]);

  const handleSave = () => {
    if (!title.trim()) return;

    // Create a new ID if it's "add" mode, otherwise use the existing one
    const newNode: CurriculumNode = {
      id: mode === 'edit' && initialNode ? initialNode.id : 'node_' + Date.now().toString(),
      title: title.trim(),
      type: type,
    };

    if (mode === 'edit' && initialNode && initialNode.children) {
      newNode.children = initialNode.children;
    } else if (type === 'topic' && mode === 'add') {
      newNode.children = [];
    }

    onSave(newNode);
  };

  return (
    <div className="cd-admin-modal-overlay">
      <div className="cd-admin-modal">
        <h3>{mode === 'edit' ? 'Редактировать элемент' : 'Добавить элемент'}</h3>
        
        <div className="cd-admin-form-group">
          <label>Заголовок (Title)</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="Введите название..."
            autoFocus
          />
        </div>

        <div className="cd-admin-form-group">
          <label>Тип (Type)</label>
          <select value={type} onChange={(e) => setType(e.target.value as CurriculumNodeType)}>
            <option value="topic">Тема (Папка)</option>
            <option value="link">Ссылка (С задачей)</option>
            <option value="text">Текст (Просто надпись)</option>
          </select>
        </div>

        <div className="cd-admin-actions">
          <button className="cd-btn-cancel" onClick={onClose}>Отмена</button>
          <button className="cd-btn-save" onClick={handleSave}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}
