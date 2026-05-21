import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.js';
import './styles.css';
import './styles/theme.css';

createRoot(document.getElementById('root')).render(React.createElement(App));
