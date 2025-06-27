import React, { useState } from 'react';

const LanguageSelector = ({ onLanguageChange }) => {
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');

  const languages = [
    { label: 'JavaScript', value: 'javascript' },
    { label: 'Python', value: 'python' },
    { label: 'C++', value: 'cpp' },
    { label: 'Java', value: 'java' },
    { label: 'HTML', value: 'html' },
    { label: 'CSS', value: 'css' },
    // Add more languages if needed
  ];

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setSelectedLanguage(newLanguage);
    onLanguageChange(newLanguage);  // Notify the parent component about the change
  };

  return (
    <div className="flex items-center space-x-4">
      <label htmlFor="language" className="text-white">Select Language:</label>
      <select
        id="language"
        value={selectedLanguage}
        onChange={handleLanguageChange}
        className="bg-gray-800 text-white p-2 rounded-md focus:outline-none"
      >
        {languages.map((language) => (
          <option key={language.value} value={language.value}>
            {language.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSelector;
