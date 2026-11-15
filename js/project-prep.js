/* An interactive preparation checklist. No account, storage or network request. */
(() => {
  'use strict';
  const checks = Array.from(document.querySelectorAll('[data-checklist]'));
  const progress = document.querySelector('[data-checklist-progress]');
  const update = () => {
    const done = checks.filter(input => input.checked).length;
    if (progress) progress.textContent = `${done} / ${checks.length} points préparés. Vos choix restent dans cette page et ne sont pas envoyés.`;
  };
  checks.forEach(input => input.addEventListener('change', update));
  update();
})();
