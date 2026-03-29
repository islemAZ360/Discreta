import React, { useState } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Language } from '../utils/translations';
import './TopBarBadges.css';

export default function TopBarBadges() {
  const [activePopup, setActivePopup] = useState<string | null>(null);
  const { language, setLanguage, t } = useLanguage();

  const togglePopup = (popupName: string) => {
    setActivePopup(prev => prev === popupName ? null : popupName);
  };

  const handleLangSelect = (lang: Language) => {
    setLanguage(lang);
    setActivePopup(null);
  };

  const dateStr = new Date().toLocaleDateString(language === 'zh' ? 'zh-CN' : language === 'en' ? 'en-US' : 'ru-RU', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).replace(' г.', '');

  return (
    <div className="education-badges-container">
      <div className="education-badges">
        <span className={`ed-badge ${activePopup === 'ru' ? 'active' : ''}`} onClick={() => togglePopup('ru')}>[{language}]</span>
        <span className={`ed-badge ${activePopup === 'date' ? 'active' : ''}`} onClick={() => togglePopup('date')}>[ {dateStr} ]</span>
        <span className={`ed-badge ${activePopup === 'question' ? 'active' : ''}`} onClick={() => togglePopup('question')}>[?]</span>
        <span className="ed-badge">[!]</span>
      </div>

      {activePopup === 'ru' && (
        <div className="popup-ru">
          <div className={`popup-ru-item ${language === 'ru' ? 'active' : ''}`} onClick={() => handleLangSelect('ru')}>ru</div>
          <div className={`popup-ru-item ${language === 'en' ? 'active' : ''}`} onClick={() => handleLangSelect('en')}>en</div>
          <div className={`popup-ru-item ${language === 'zh' ? 'active' : ''}`} onClick={() => handleLangSelect('zh')}>zh</div>
        </div>
      )}

      {activePopup === 'date' && (
        <div className="popup-date">
          <div className="calendar-header">
            <span className="cal-nav">&lt;</span>
            <span className="cal-title">{t.march26}</span>
            <span className="cal-nav">&gt;</span>
          </div>
          <table className="calendar-table">
            <thead>
              <tr>
                <th>{t.mo}</th><th>{t.tu}</th><th>{t.we}</th><th>{t.th}</th><th>{t.fr}</th><th>{t.sa}</th><th>{t.su}</th>
              </tr>
            </thead>
            <tbody>
              <tr><td className="cal-muted">23</td><td className="cal-muted">24</td><td className="cal-muted">25</td><td className="cal-muted">26</td><td className="cal-muted">27</td><td className="cal-muted">28</td><td>1</td></tr>
              <tr><td>2</td><td>3</td><td>4</td><td>5</td><td>6</td><td>7</td><td>8</td></tr>
              <tr><td>9</td><td>10</td><td>11</td><td>12</td><td>13</td><td>14</td><td>15</td></tr>
              <tr><td>16</td><td>17</td><td>18</td><td>19</td><td>20</td><td>21</td><td>22</td></tr>
              <tr><td>23</td><td>24</td><td>25</td><td>26</td><td>27</td><td>28</td><td className="cal-selected">29</td></tr>
              <tr><td>30</td><td>31</td><td className="cal-muted">1</td><td className="cal-muted">2</td><td className="cal-muted">3</td><td className="cal-muted">4</td><td className="cal-muted">5</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {activePopup === 'question' && (
        <div className="popup-question">
          <div className="popup-q-header">{t.question}</div>
          <div className="popup-q-body">
            <textarea className="popup-q-textarea"></textarea>
          </div>
          <div className="popup-q-footer">
            <div className="popup-q-left">
              <button className="popup-btn">{t.questionRef}</button>
            </div>
            <div className="popup-q-right">
              <button className="popup-btn">{t.send}</button>
              <button className="popup-btn">{t.history}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
