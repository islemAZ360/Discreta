import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { ChevronRight, ChevronLeft, Sparkles, BookOpen, TerminalSquare, CheckCircle2 } from 'lucide-react';
import './WelcomeScreen.css';

export default function WelcomeScreen() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (currentUser) {
      const hasSeen = localStorage.getItem(`welcomed_${currentUser.uid}`);
      if (!hasSeen) {
        setIsOpen(true);
      }
    }
  }, [currentUser]);

  if (!isOpen) return null;

  const handleClose = () => {
    if (currentUser) {
      localStorage.setItem(`welcomed_${currentUser.uid}`, 'true');
    }
    setIsOpen(false);
  };

  const steps = [
    {
      title: "Добро пожаловать в Discreta!",
      content: "Платформа нового поколения для изучения дискретной математики. Здесь вы найдете все необходимое для успешного освоения курса, от теории до практики.",
      icon: <Sparkles size={64} color="#1a5598" />
    },
    {
      title: "Учебные материалы",
      content: "В разделе «Обучение и аттестация» выстроена удобная структура семестров. Выбирайте нужную тему, читайте встроенные лекции и скачивайте PDF-материалы для подготовки.",
      icon: <BookOpen size={64} color="#1a5598" />
    },
    {
      title: "Помощь Искусственного Интеллекта",
      content: "Длинные алгоритмы или сложные графы? Не проблема! Наш встроенный Нейро-Ассистент всегда готов помочь: он объяснит логику, решит задачу и даже напишет за вас чистый код.",
      icon: <CheckCircle2 size={64} color="#1a5598" />
    },
    {
      title: "Встроенный Python IDE",
      content: "Обратите внимание на иконку Python в правом верхнем углу! Открывайте мощнейшую среду разработки прямо браузере. Вы можете запускать ИИ-код, строить гиперграфы (hypernetx) и проверять ответы мгновенно.",
      icon: <TerminalSquare size={64} color="#1a5598" />
    }
  ];

  return (
    <div className="welcome-overlay">
      <div className="welcome-modal">
        <div className="welcome-header">
           <button className="welcome-skip-btn" onClick={handleClose}>Пропустить</button>
        </div>
        
        <div className="welcome-content-area">
          <div className="welcome-icon-box">
            {steps[currentStep].icon}
          </div>
          <h2 className="welcome-title">{steps[currentStep].title}</h2>
          <p className="welcome-desc">{steps[currentStep].content}</p>
        </div>

        <div className="welcome-footer">
           <div className="welcome-dots">
              {steps.map((_, i) => (
                <span key={i} className={`welcome-dot ${i === currentStep ? 'active' : ''}`} />
              ))}
           </div>
           <div className="welcome-actions">
              {currentStep > 0 && (
                <button className="btn-secondary" onClick={() => setCurrentStep(prev => prev - 1)}>
                   <ChevronLeft size={16} /> Назад
                </button>
              )}
              {currentStep < steps.length - 1 ? (
                <button className="btn-primary" onClick={() => setCurrentStep(prev => prev + 1)}>
                   Далее <ChevronRight size={16} />
                </button>
              ) : (
                <button className="btn-primary" onClick={handleClose}>
                   Начать обучение!
                </button>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}
