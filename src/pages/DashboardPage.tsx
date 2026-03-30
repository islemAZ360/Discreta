import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import EducationView from '../components/EducationView';
import CourseDetailsView from '../components/CourseDetailsView';
import TopBarBadges from '../components/TopBarBadges';
import PythonIDE, { PythonLogo } from '../components/PythonIDE';
import { useLanguage } from '../contexts/LanguageContext';
import { Menu, X } from 'lucide-react';
import './DashboardPage.css';

export default function DashboardPage() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [currentView, setCurrentView] = useState<'home' | 'education' | 'course-details-1' | 'course-details-2'>('home');
  const [showPythonIDE, setShowPythonIDE] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { t } = useLanguage();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  const isCourseView = currentView === 'course-details-1' || currentView === 'course-details-2';

  return (
    <div className={`dashboard ${isSidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          {/* Hamburger Menu for Mobile */}
          <button 
            className="mobile-menu-toggle show-mobile" 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            aria-label="Toggle menu"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div 
            className="academic-logo" 
            title="На главную" 
            onClick={() => setCurrentView('home')}
            style={{ cursor: 'pointer' }}
          >
            <span className="logo-a">A</span>
            <div className="logo-right-part">
              <span className="logo-cademic">cademic</span>
              <span className="logo-nt">NT</span>
            </div>
          </div>
          <span className="header-title">{t.learningSystem}</span>
        </div>
        <div className="header-right">
          <div className="header-user">
            <strong>{t.student}</strong> <span className="student-name">Азайзия Ислам</span>
            <PythonLogo onClick={() => setShowPythonIDE(true)} />
            <svg className="settings-icon" viewBox="0 0 24 24" width="16" height="16">
              <path fill="#777777" d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.06-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.73,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.06,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.43-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.49-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
            </svg>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        {/* Sidebar Overlay for Mobile */}
        {isSidebarOpen && <div className="sidebar-overlay show-mobile" onClick={() => setIsSidebarOpen(false)}></div>}

        {/* Sidebar */}
        <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''}`}>
          <ul className="sidebar-menu">
            <li><a href="#" className={`sidebar-link ${currentView === 'education' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setCurrentView('education'); }}>{t.education}</a></li>
            <li><a href="#" className="sidebar-link" onClick={(e) => e.preventDefault()}>{t.achievements}</a></li>
            <li><a href="#" className="sidebar-link" onClick={(e) => e.preventDefault()}>{t.portfolio}</a></li>
            <li><a href="#" className="sidebar-link" onClick={(e) => e.preventDefault()}>{t.network}</a></li>
            <li>
              <a href="#" className="sidebar-link" onClick={(e) => e.preventDefault()}>{t.monitoring}</a>
              <ul className="sidebar-submenu">
                <li><a href="#" className="sidebar-link" onClick={(e) => e.preventDefault()}>{t.electronicJournal}</a></li>
                <li><a href="#" className="sidebar-link" onClick={(e) => e.preventDefault()}>{t.changeLog}</a></li>
                <li><a href="#" className="sidebar-link" onClick={(e) => e.preventDefault()}>{t.reports}</a></li>
                <li><a href="#" className="sidebar-link" onClick={(e) => e.preventDefault()}>{t.parents}</a></li>
              </ul>
            </li>
            <li><a href="#" className="sidebar-link" onClick={(e) => e.preventDefault()}>{t.admin}</a></li>
            <li>
              <a href="#" className="sidebar-link" onClick={(e) => e.preventDefault()}>{t.calendarTitle}</a>
              <ul className="sidebar-submenu">
                <li><a href="#" className="sidebar-link" onClick={(e) => e.preventDefault()}>{t.eventReg}</a></li>
              </ul>
            </li>
            <li><a href="#" className="sidebar-link" onClick={(e) => e.preventDefault()}>{t.search}</a></li>
          </ul>
          <div className="sidebar-divider"></div>
          <a href="#" className="sidebar-link logout-link" onClick={(e) => { e.preventDefault(); handleLogout(); }}>{t.logout}</a>
        </aside>

        {/* Main Content */}
        <main className="dashboard-main" onClick={() => isSidebarOpen && setIsSidebarOpen(false)}>
          {/* Unified global right-side header */}
          <div className="main-content-header" style={{ borderBottom: isCourseView ? 'none' : '', marginBottom: isCourseView ? '0' : '8px' }}>
            <h2 className="main-content-title">
              {currentView === 'home' ? t.disciplines : currentView === 'education' ? t.education : ''}
            </h2>
            <TopBarBadges />
          </div>

          {currentView === 'home' ? (
            <>
              <div className="courses-grid" style={{ marginTop: '16px' }}>
                {/* Пустой квадрат */}
              </div>

              {/* News Section */}
              <h3 className="news-title">{t.newsTitle}</h3>
              <p className="news-empty">{t.newsEmpty}</p>

              <div className="notifications-table-wrapper">
                <div className="notifications-header">
                  <button className="btn-small">{t.commentBtn}</button>
                  <button className="btn-small">{t.showAllBtn}</button>
                </div>
                <table className="notifications-table striped">
                  <tbody>
                    <tr>
                      <td className="notif-label"><strong>{t.boards}</strong></td>
                      <td className="notif-count">0</td>
                    </tr>
                    <tr>
                      <td className="notif-label"><strong>{t.votes}</strong></td>
                      <td className="notif-count">0</td>
                    </tr>
                    <tr>
                      <td className="notif-label"><strong>{t.surveys}</strong></td>
                      <td className="notif-count">0</td>
                    </tr>
                    <tr>
                      <td className="notif-label"><strong>{t.forums}</strong></td>
                      <td className="notif-count">0</td>
                    </tr>
                    <tr>
                      <td className="notif-label"><strong>{t.chats}</strong></td>
                      <td className="notif-count">0</td>
                    </tr>
                  </tbody>
                </table>

                <table className="notifications-table messages-table">
                  <thead>
                    <tr>
                      <th className="notif-label"><strong>{t.messagesTitle}</strong></th>
                      <th className="notif-count"><strong>{t.messagesCount}</strong></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="notif-label message-link">{t.inbox}</td>
                      <td className="notif-count count-link">0</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Active Surveys */}
              <h3 className="section-subtitle">{t.activeSurveys}</h3>
              <table className="surveys-table">
                <thead>
                  <tr>
                    <th>{t.surveyName}</th>
                    <th>{t.surveyOwner}</th>
                    <th>{t.surveyTerm}</th>
                    <th>{t.surveyDate}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={4} className="empty-row">&nbsp;</td>
                  </tr>
                </tbody>
              </table>
              <div className="survey-actions">
                <button className="btn-small">Просмотреть</button>
              </div>

              {/* Footer */}
              <footer className="dashboard-footer">
                <span>Обучение и аттестация</span>
                <span> | </span>
                <span>Выход</span>
              </footer>
            </>
          ) : currentView === 'course-details-1' ? (
            <CourseDetailsView courseId="sem1" onBack={() => setCurrentView('education')} />
          ) : currentView === 'course-details-2' ? (
            <CourseDetailsView courseId="sem2" onBack={() => setCurrentView('education')} />
          ) : (
            <>
              <EducationView 
                onGoToCourse1={() => setCurrentView('course-details-1')} 
                onGoToCourse2={() => setCurrentView('course-details-2')} 
              />
              <footer className="global-bottom-footer">
                <span className="footer-links">Обучение и аттестация | Достижения пользователей | Портфолио пользователя | Сетевое общение | Мониторинг | Администрирование | Календарь | Поиск</span>
              </footer>
            </>
          )}
        </main>
      </div>

      {showPythonIDE && (
        <PythonIDE onClose={() => setShowPythonIDE(false)} />
      )}
    </div>
  );
}
