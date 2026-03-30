import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import NodeContentView from './NodeContentView';
import CurriculumAdminModal from './CurriculumAdminModal';
import { useCurriculum, CurriculumNode, CurriculumNodeType } from '../hooks/useCurriculum';
import './CourseDetailsView.css';
import { Edit2, Plus, Trash2 } from 'lucide-react';

interface CourseDetailsViewProps {
  courseId: 'sem1' | 'sem2';
  onBack: () => void;
}

// Initial Data setup helpers (moved inside or kept outside)
const sem1NodesStatic: CurriculumNode[] = [
  {
    id: 's1_1', title: 'Основы теории множеств', type: 'topic', children: [
      { id: 's1_1_1', title: 'Операции над множествами [+]' },
      { id: 's1_1_2', title: 'Булева алгебра [+]' },
      { id: 's1_1_3', title: 'Сравнение множеств по нечеткости [+]' },
      { id: 's1_1_4', title: 'Алгебра нечетких множеств [+]' },
      { id: 's1_1_5', title: 'Композиция нечетких отношений [+]' },
      { id: 's1_1_6', title: 'Транзитивность нечётких отношений [+]' }
    ]
  },
  {
    id: 's1_2', title: 'Алгоритмы на графах', type: 'topic', children: [
      { id: 's1_2_1', title: 'Волновой алгоритм [+]' },
      { id: 's1_2_2', title: 'Алгоритм Форда-Беллмана [+]' },
      { id: 's1_2_3', title: 'Алгоритм Робертса и Флореса [+]' },
      { id: 's1_2_4', title: 'Алгоритм Прима [+]' },
      { id: 's1_2_5', title: 'Алгоритм Краскала [+]' },
      { id: 's1_2_6', title: 'Алгоритм Магу-Вейсмана [+]' },
      { id: 's1_2_7', title: 'Алгоритм Брона-Кербоша [+]' }
    ]
  },
  {
    id: 's1_3', title: 'Поиск циклов Эйлера в графе', type: 'topic', children: [
      { id: 's1_3_1', title: 'Задача (обучение)', type: 'link' },
      { id: 's1_3_2', title: 'Задача (аттестация)', type: 'link' }
    ]
  },
  {
    id: 's1_4', title: 'Интернет-экзамен', type: 'topic', children: [
      { id: 's1_4_1', title: 'Экзаменационная задача №1', type: 'text' },
      { id: 's1_4_2', title: 'Экзаменационная задача №2', type: 'text' }
    ]
  }
];

const sem2NodesStatic: CurriculumNode[] = [
  {
    id: 's2_1', title: 'Оптимизация на графах', type: 'topic', children: [
      {
        id: 's2_1_1', title: 'Оптимизация на графах ВЛ', type: 'topic', children: [
          { id: 's2_1_1_1', title: 'Эвристические алгоритмы раскраски графа [+]' },
          { id: 's2_1_1_2', title: 'Алгоритм минимальной раскраски вершин графа на основе метода Магу [+]' },
          { id: 's2_1_1_3', title: 'Венгерский алгоритм [+]' },
          { id: 's2_1_1_4', title: 'Метод установления изоморфизма графа на основе локальных характеристик вершин [+]' },
          { id: 's2_1_1_5', title: 'Гамма-алгоритм для плоской укладки планарного графа [+]' },
        ]
      },
      {
        id: 's2_1_2', title: 'Составление опорного плана', type: 'topic', children: [
          { id: 's2_1_2_1', title: 'Метод северо-западного угла [+]' },
          { id: 's2_1_2_2', title: 'Метод минимальной стоимости [+]' }
        ]
      },
      {
        id: 's2_1_3', title: 'Метод потенциалов', type: 'topic', children: [
          { id: 's2_1_3_1', title: 'Задача (обучение)', type: 'link' },
          { id: 's2_1_3_2', title: 'Задача (аттестация)', type: 'link' }
        ]
      }
    ]
  },
  {
    id: 's2_2', title: 'Теория сетей', type: 'topic', children: [
      { id: 's2_2_1', title: 'Поиск максимального потока в транспортной сети [+]' },
      { id: 's2_2_2', title: 'Алгоритм последовательного распространения сигнала в нейронной сети [+]' },
      { id: 's2_2_3', title: 'Алгоритм обратного распространения ошибки в перцептроне [+]' },
      { id: 's2_2_4', title: 'Метод анализа свойств сети Петри на основе покрывающих деревьев [+]' },
      { id: 's2_2_5', title: 'Алгоритм последовательного распространения сигнала в свёрточной нейронной сети [+]' }
    ]
  }
];

// Helper functions for deep nested updates
const addNodeRecursively = (nodesArray: CurriculumNode[], parentId: string, newNode: CurriculumNode): CurriculumNode[] => {
  return nodesArray.map(node => {
    if (node.id === parentId) {
      return { ...node, children: [...(node.children || []), newNode] };
    }
    if (node.children) {
      return { ...node, children: addNodeRecursively(node.children, parentId, newNode) };
    }
    return node;
  });
};

const editNodeRecursively = (nodesArray: CurriculumNode[], nodeId: string, updatedNode: CurriculumNode): CurriculumNode[] => {
  return nodesArray.map(node => {
    if (node.id === nodeId) {
      return updatedNode;
    }
    if (node.children) {
      return { ...node, children: editNodeRecursively(node.children, nodeId, updatedNode) };
    }
    return node;
  });
};

const deleteNodeRecursively = (nodesArray: CurriculumNode[], nodeId: string): CurriculumNode[] => {
  return nodesArray.filter(node => node.id !== nodeId).map(node => {
    if (node.children) {
      return { ...node, children: deleteNodeRecursively(node.children, nodeId) };
    }
    return node;
  });
};

export default function CourseDetailsView({ courseId, onBack }: CourseDetailsViewProps) {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const { nodes, loading, updateCurriculum, initDefaultCurriculum } = useCurriculum(courseId);
  const isSem1 = courseId === 'sem1';

  const [activeTab, setActiveTab] = useState<'course' | 'tasks' | 'about'>('course');
  const [selectedNode, setSelectedNode] = useState<{ id: string, title: string } | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  // Admin Modal State
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalTargetParentId, setModalTargetParentId] = useState<string | null>(null);
  const [nodeToEdit, setNodeToEdit] = useState<CurriculumNode | null>(null);

  useEffect(() => {
    if (!loading && nodes.length === 0) {
      initDefaultCurriculum(isSem1 ? sem1NodesStatic : sem2NodesStatic);
    }
  }, [loading, nodes, isSem1, initDefaultCurriculum]);

  const toggleSection = (key: string) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleLeafClick = (nodeId: string, nodeTitle: string) => {
    setSelectedNode({ id: nodeId, title: nodeTitle });
  };

  // --- Admin Functions ---
  const openAddModal = (parentId: string | null) => {
    setModalTargetParentId(parentId);
    setModalMode('add');
    setNodeToEdit(null);
    setShowAdminModal(true);
  };

  const openEditModal = (node: CurriculumNode) => {
    setModalMode('edit');
    setNodeToEdit(node);
    setShowAdminModal(true);
  };

  const deleteNode = (nodeId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот элемент?')) {
      const updatedNodes = deleteNodeRecursively([...nodes], nodeId);
      updateCurriculum(updatedNodes);
    }
  };

  const handleModalSave = (savedNode: CurriculumNode) => {
    if (modalMode === 'add') {
      let updatedNodes = [...nodes];
      if (modalTargetParentId === null) {
        updatedNodes.push(savedNode);
      } else {
        updatedNodes = addNodeRecursively(updatedNodes, modalTargetParentId, savedNode);
      }
      updateCurriculum(updatedNodes);
      if (modalTargetParentId) {
        setExpanded(prev => ({...prev, [modalTargetParentId]: true})); // Auto expand parent
      }
    } else {
      const updatedNodes = editNodeRecursively([...nodes], savedNode.id, savedNode);
      updateCurriculum(updatedNodes);
    }
    setShowAdminModal(false);
  };

  const renderTree = (nodeArray: CurriculumNode[], isRoot = true) => {
    return (
      <ul className={isRoot ? "cd-list-root" : "cd-list-sub"}>
        {nodeArray.map(node => {
          const hasChildren = node.children && node.children.length > 0;
          const isExpanded = !!expanded[node.id];
          
          let actualTitle = node.title;
          let showStaticPlus = false;
          if (actualTitle.endsWith(' [+]')) {
            actualTitle = actualTitle.replace(' [+]', '');
            showStaticPlus = true;
          }

          const isFolder = node.type === 'topic' || hasChildren;

          return (
            <li key={node.id} className="cd-node-item">
              <div className="cd-node-content">
                {isFolder ? (
                  <span className="cd-node-wrapper" onClick={() => toggleSection(node.id)}>
                    <span className="cd-topic-link">{actualTitle}</span>
                    <span className="cd-bracket"> [</span>
                    <span className="cd-toggle-icon">{isExpanded ? '−' : '+'}</span>
                    <span className="cd-bracket">]</span>
                  </span>
                ) : (
                  <span className="cd-node-wrapper" onClick={() => handleLeafClick(node.id, actualTitle)}>
                    <span className={node.type === 'text' ? 'cd-text-plain' : node.type === 'link' ? 'cd-regular-link' : 'cd-item-link'}>
                      {actualTitle}
                    </span>
                    {showStaticPlus && (
                      <>
                        <span className="cd-bracket"> [</span>
                        <span className="cd-toggle-icon">+</span>
                        <span className="cd-bracket">]</span>
                      </>
                    )}
                  </span>
                )}
                
                {isAdmin && (
                  <div className="cd-admin-controls" onClick={(e) => e.stopPropagation()}>
                    {isFolder && (
                      <button className="cd-admin-icon" onClick={() => openAddModal(node.id)} title="Добавить внутрь">
                        <Plus size={14} />
                      </button>
                    )}
                    <button className="cd-admin-icon" onClick={() => openEditModal(node)} title="Редактировать">
                      <Edit2 size={14} />
                    </button>
                    <button className="cd-admin-icon delete" onClick={() => deleteNode(node.id)} title="Удалить">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {isFolder && isExpanded && (node.children ? renderTree(node.children, false) : null)}
            </li>
          );
        })}
      </ul>
    );
  };

  const displayTitle = isSem1 
    ? 'Электронный курс Дискретная математика (1 семестр, 2025/2026 уч.гг.) [2025910]'
    : 'Электронный курс Дискретная математика (2 семестр, 2025/2026) [20269092]';

  return (
    <div className="course-details-wrapper">
      <div className="cd-tabs">
        <div className={`cd-tab ${activeTab === 'course' ? 'active' : ''}`} onClick={() => setActiveTab('course')}>{t.courseTab1}</div>
        <div className={`cd-tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => setActiveTab('tasks')}>{t.courseTab2}</div>
        <div className={`cd-tab ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>{t.courseTab3}</div>
      </div>

      <div className="cd-box">
        {activeTab === 'course' && (
          <>
            <h3 className="cd-title">{displayTitle}</h3>
            <div className="cd-state-row">
              <span className="cd-state-label">{t.courseState}</span>
              <select className="cd-state-select" defaultValue="0">
                <option value="0">{t.stateOptionTraining}</option>
              </select>
            </div>

            <div className="cd-curriculum">
              {loading ? (
                <div style={{ padding: '20px', color: '#666' }}>Загрузка...</div>
              ) : (
                <>
                  {renderTree(nodes)}
                  {isAdmin && (
                    <button className="cd-admin-add-root-btn" onClick={() => openAddModal(null)}>
                      <Plus size={16} style={{ marginRight: '6px' }} /> Добавить корневую тему
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* --- Other Tabs Hidden for Brevity in this specific block, but typically complete. Keeping them as original --- */}
        {activeTab === 'tasks' && (
          <>
            <div className="tasks-filter-box">
              <div className="task-form-grid">
                <div className="task-form-row">
                  <div className="task-label">{t.taskTheme}</div>
                  <div className="task-input-wrapper"><input type="text" className="task-input" /></div>
                </div>
                <div className="task-form-row">
                  <div className="task-label">{t.taskStatus}</div>
                  <div className="task-input-wrapper"><select className="task-select"></select></div>
                </div>
                <div className="task-form-row">
                  <div className="task-label">{t.taskPriority}</div>
                  <div className="task-input-wrapper"><select className="task-select"></select></div>
                </div>
                <div className="task-form-row">
                  <div className="task-label">{t.taskCategory}</div>
                  <div className="task-input-wrapper"><select className="task-select"></select></div>
                </div>
                <div className="task-form-row">
                  <div className="task-label">{t.taskAssigned}</div>
                  <div className="task-input-wrapper"><input type="text" className="task-input" placeholder={t.taskPlaceholder} /></div>
                </div>
                <div className="task-form-row">
                  <div className="task-label">{t.taskObserver}</div>
                  <div className="task-input-wrapper"><input type="text" className="task-input" placeholder={t.taskPlaceholder} /></div>
                </div>
                <div className="task-form-row">
                  <div className="task-label">{t.taskAuthor}</div>
                  <div className="task-input-wrapper"><input type="text" className="task-input" placeholder={t.taskPlaceholder} /></div>
                </div>
              </div>
            </div>

            <div className="tasks-btn-row">
              <button className="task-btn">{t.btnClean}</button>
              <button className="task-btn">{t.btnShow}</button>
              <button className="task-btn">{t.btnNewTask}</button>
              <button className="task-btn">{t.btnActions}</button>
            </div>

            <div className="tasks-table-header">
              <div className="th-col th-no">{t.thNo}</div>
              <div className="th-col th-cat">{t.thCategory}</div>
              <div className="th-col th-status">{t.thStatus}</div>
              <div className="th-col th-prio">{t.thPriority}</div>
              <div className="th-col th-theme">{t.thTheme}</div>
              <div className="th-col th-assign">{t.thAssigned}</div>
              <div className="th-col th-obs">{t.thObservers}</div>
              <div className="th-col th-upd">{t.thUpdated}</div>
              <div className="th-col th-prog">{t.thProgress}</div>
            </div>
          </>
        )}

        {activeTab === 'about' && (
          <div className="about-content">
            <div className="about-image">
              <img src={isSem1 ? "/1 семестр.png" : "/2 семестр.png"} alt="Course" />
            </div>
            <div className="about-info">
              <span className="about-info-title">{displayTitle}</span>
              <div className="about-info-row">
                <div className="about-info-label">{t.aboutLink}</div>
                <div className="about-info-value">
                  <a href={isSem1 ? "https://de.ifmo.ru/servlet/course/180108/" : "https://de.ifmo.ru/servlet/course/180118/"} target="_blank" rel="noreferrer">
                    {isSem1 ? "https://de.ifmo.ru/servlet/course/180108/" : "https://de.ifmo.ru/servlet/course/180118/"}
                  </a>
                </div>
              </div>
              <div className="about-info-row">
                <div className="about-info-label">{t.aboutDiscipline}</div>
                <div className="about-info-value">
                  {isSem1 ? "Дискретная математика (2025647507 - И)" : "Дискретная математика (2026647507 - И)"}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="cd-footer-actions">
        <button className="cd-back-btn" onClick={onBack}>{t.backBtn}</button>
      </div>

      {selectedNode && (
        <NodeContentView 
          nodeId={selectedNode.id} 
          nodeTitle={selectedNode.title} 
          onClose={() => setSelectedNode(null)} 
        />
      )}

      {showAdminModal && (
        <CurriculumAdminModal 
          mode={modalMode}
          initialNode={nodeToEdit}
          onClose={() => setShowAdminModal(false)}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
