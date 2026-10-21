import { AcademyScreen } from '../screens/AcademyScreen';

/**
 * AcademyScreenLandscape — Cópia adaptada da tela de Academia / Eventos para Modo Paisagem.
 */
export class AcademyScreenLandscape extends AcademyScreen {
  public override render(container: HTMLElement) {
    super.render(container);
    const screen = container.querySelector('.academy-screen') as HTMLElement | null;
    if (screen) {
      screen.style.maxWidth = '100%';
      screen.style.padding = '16px 28px 60px 28px';
    }
  }
}
