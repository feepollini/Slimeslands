import { t } from '../../core/i18n';

export class AcademyScreen {
    constructor() {}

    public render(container: HTMLElement) {
        container.innerHTML = `
            <div style="height: 100%; width: 100%; display: flex; align-items: center; justify-content: center; color: rgba(255,255,255,0.2); font-size: 2rem; font-weight: 950; letter-spacing: 10px;">
                ${t('nav.academy')}
            </div>
        `;
    }
}
