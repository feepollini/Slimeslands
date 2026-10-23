import './style.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { HubWorldMapGameView } from './ui/screens/HubWorldMapGameView';
import { autoFullscreen } from './ui/utils/fullscreen';

autoFullscreen();

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(React.createElement(HubWorldMapGameView));
}
