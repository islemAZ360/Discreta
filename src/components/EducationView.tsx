import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import './EducationView.css';

interface EducationViewProps {
  onGoToCourse1: () => void;
  onGoToCourse2: () => void;
}

export default function EducationView({ onGoToCourse1, onGoToCourse2 }: EducationViewProps) {
  const { currentUser } = useAuth();
  const { t } = useLanguage();

  // Specialty state
  const specialtyKey = currentUser ? `specialty_${currentUser.uid}` : 'specialty_guest';
  const defaultSpecialty = `09.03.04 - Нейротехнологии и программирование Показать учебный план`;
  const [specialty, setSpecialty] = useState(() => localStorage.getItem(specialtyKey) || defaultSpecialty);
  const [isEditingSpecialty, setIsEditingSpecialty] = useState(false);
  const [editSpecialtyValue, setEditSpecialtyValue] = useState(specialty);
  const specialtyInputRef = useRef<HTMLInputElement>(null);

  // Year state
  const yearKey = currentUser ? `year_${currentUser.uid}` : 'year_guest';
  const defaultYear = '2025/2026';
  const [year, setYear] = useState(() => localStorage.getItem(yearKey) || defaultYear);
  const [isEditingYear, setIsEditingYear] = useState(false);
  const [editYearValue, setEditYearValue] = useState(year);
  const yearInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentUser) {
      const savedSpecialty = localStorage.getItem(`specialty_${currentUser.uid}`);
      setSpecialty(savedSpecialty || defaultSpecialty);
      
      const savedYear = localStorage.getItem(`year_${currentUser.uid}`);
      setYear(savedYear || defaultYear);
    }
  }, [currentUser, defaultSpecialty]);

  useEffect(() => {
    if (isEditingSpecialty && specialtyInputRef.current) specialtyInputRef.current.focus();
  }, [isEditingSpecialty]);

  useEffect(() => {
    if (isEditingYear && yearInputRef.current) yearInputRef.current.focus();
  }, [isEditingYear]);

  // --- Specialty Handlers ---
  const handleDoubleClickSpecialty = () => {
    setEditSpecialtyValue(specialty);
    setIsEditingSpecialty(true);
  };
  const handleBlurSpecialty = () => {
    setIsEditingSpecialty(false);
    setSpecialty(editSpecialtyValue);
    localStorage.setItem(specialtyKey, editSpecialtyValue);
  };
  const handleKeyDownSpecialty = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlurSpecialty();
    if (e.key === 'Escape') setIsEditingSpecialty(false);
  };

  // --- Year Handlers ---
  const handleDoubleClickYear = () => {
    setEditYearValue(year);
    setIsEditingYear(true);
  };
  const handleBlurYear = () => {
    setIsEditingYear(false);
    setYear(editYearValue);
    localStorage.setItem(yearKey, editYearValue);
  };
  const handleKeyDownYear = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleBlurYear();
    if (e.key === 'Escape') setIsEditingYear(false);
  };

  return (
    <div className="education-view">
      {/* Filters Area */}
      <div className="education-filters">
        <div className="filter-row">
          <div className="filter-label">{t.academicYear}</div>
          <div className="filter-value filter-value-highlight filter-year" onDoubleClick={handleDoubleClickYear}>
            {isEditingYear ? (
              <input
                ref={yearInputRef}
                type="text"
                className="edit-input"
                value={editYearValue}
                onChange={(e) => setEditYearValue(e.target.value)}
                onBlur={handleBlurYear}
                onKeyDown={handleKeyDownYear}
              />
            ) : year}
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-label">{t.specialty}</div>
          <div className="filter-value-select" onDoubleClick={handleDoubleClickSpecialty}>
            <div className="mock-select-box">
              <span className="mock-select-text">
                {isEditingSpecialty ? (
                  <input
                    ref={specialtyInputRef}
                    type="text"
                    className="edit-input w-full"
                    value={editSpecialtyValue}
                    onChange={(e) => setEditSpecialtyValue(e.target.value)}
                    onBlur={handleBlurSpecialty}
                    onKeyDown={handleKeyDownSpecialty}
                  />
                ) : specialty.replace(' Показать учебный план', '')}
                {!isEditingSpecialty && <span className="arrow-icon">[→]</span>}
              </span>
              <span className="dropdown-arrow">▼</span>
            </div>
          </div>
        </div>
      </div>

      {/* Courses Container */}
      <div className="courses-list">

        {/* Semester 1 section */}
        <div className="semester-divider">{t.sem1}</div>
        
        <div className="ed-course-card">
          <div className="ed-course-left">
            <div className="ed-course-image" style={{ cursor: 'pointer' }} onClick={onGoToCourse1}>
              <img src="/1 семестр.png" alt="1 семестр" className="course-image-img" />
            </div>
            <span className="goto-course-link" style={{ cursor: 'pointer' }} onClick={onGoToCourse1}>{t.goToCourse}</span>
          </div>
          
          <div className="ed-course-center">
            <h3 className="ed-course-title">
              <a href="#" className="ed-title-link" onClick={onGoToCourse1}>{t.c1name}</a>
            </h3>
            
            <div className="ed-course-details">
              <div className="detail-row">
                <span className="detail-label">{t.discipline}</span> <span className="detail-value">{t.c1disc}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t.department}</span> <span className="detail-value">{t.itmoDept}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t.author}</span> <span className="detail-value"></span>
              </div>
            </div>
          </div>
          
          <div className="ed-course-right">
            <span className="ed-course-id">2025910</span>
            <div className="ed-course-actions">
              <a href="#" className="ed-action-link">{t.workProgram}</a>
              <span className="ed-separator">|</span>
              <a href="#" className="ed-action-link">{t.gradeSheet}</a>
            </div>
          </div>
        </div>

        {/* Semester 2 section */}
        <div className="semester-divider">{t.sem2}</div>
        
        <div className="ed-course-card">
          <div className="ed-course-left">
            <div className="ed-course-image" style={{ cursor: 'pointer' }} onClick={onGoToCourse2}>
              <img src="/2 семестр.png" alt="2 семестр" className="course-image-img" />
            </div>
            <span className="goto-course-link" style={{ cursor: 'pointer' }} onClick={onGoToCourse2}>{t.goToCourse}</span>
          </div>
          
          <div className="ed-course-center">
            <h3 className="ed-course-title">
              <a href="#" className="ed-title-link" onClick={onGoToCourse2}>{t.c2name}</a>
            </h3>
            
            <div className="ed-course-details">
              <div className="detail-row">
                <span className="detail-label">{t.discipline}</span> <span className="detail-value">{t.c2disc}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t.department}</span> <span className="detail-value">{t.itmoDept}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">{t.author}</span> <span className="detail-value"></span>
              </div>
            </div>
          </div>
          
          <div className="ed-course-right">
            <span className="ed-course-id">20269092</span>
            <div className="ed-course-actions">
              <a href="#" className="ed-action-link">{t.workProgram}</a>
              <span className="ed-separator">|</span>
              <a href="#" className="ed-action-link">{t.gradeSheet}</a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
