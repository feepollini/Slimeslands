import './style.css';
import { CardEditorScreen } from './ui/screens/CardEditorScreen';
import { gsap } from 'gsap';

class EditorApp {
  constructor() {
    const container = document.getElementById('editor-root')!;
    const editor = new CardEditorScreen(() => {
      // On exit, go back to hub
      gsap.to(document.body, {
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          window.location.href = 'hub.html';
        }
      });
    });
    
    editor.init(container);
    
    // Initial entry animation
    gsap.fromTo(document.body, { opacity: 0 }, { opacity: 1, duration: 0.5 });
  }
}

new EditorApp();
