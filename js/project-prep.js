/* A printable preparation checklist. No account, storage or network request. */
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
  document.querySelector('[data-print-guide]')?.addEventListener('click', () => window.print());
  document.querySelector('[data-download-guide]')?.addEventListener('click', () => {
    const lines = [
      'AVANT LES TRAVAUX — RÉNOVATION METBACH',
      'Checklist de préparation : toiture, maçonnerie et isolation extérieure.',
      'https://www.renovationmetbach.fr/preparer-travaux', '',
      ...checks.map(input => `${input.checked ? '[x]' : '[ ]'} ${input.value}`), '',
      'Contact : 07 69 13 61 82 — https://www.renovationmetbach.fr/contact',
      'Les informations rassemblées préparent un échange et ne remplacent pas une étude du chantier.'
    ];
    const url = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n')], { type: 'text/plain;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'metbach-checklist-travaux.txt';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
})();
