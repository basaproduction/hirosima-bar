'use strict';

const dialogOpeners = new Map();
const menuDialog = document.querySelector('#food-menu');
const menuSections = [...menuDialog.querySelectorAll('.menu-section')];
const departmentButtons = [...menuDialog.querySelectorAll('[data-menu-department]')];
const categorySelect = document.querySelector('#menu-category');
const menuScroll = document.querySelector('#menu-scroll');
let activeDepartment = 'kitchen';

function showMenuSections() {
  for (const section of menuSections) {
    const matchesCategory = !categorySelect.value || section.id === categorySelect.value;
    section.hidden = section.dataset.department !== activeDepartment || !matchesCategory;
  }
  menuScroll.scrollTop = 0;
}

function chooseDepartment(department) {
  activeDepartment = department;
  const categories = menuSections.filter(section => section.dataset.department === department);
  categorySelect.replaceChildren(
    new Option('Все категории', ''),
    ...categories.map(section => new Option(section.querySelector('h3').textContent, section.id))
  );
  for (const button of departmentButtons) {
    button.setAttribute('aria-pressed', String(button.dataset.menuDepartment === department));
  }
  showMenuSections();
}

for (const button of departmentButtons) {
  button.addEventListener('click', () => chooseDepartment(button.dataset.menuDepartment));
}
categorySelect.addEventListener('change', showMenuSections);

function openDialog(dialog, opener) {
  if (dialog.open) return;
  dialogOpeners.set(dialog, opener);
  dialog.showModal();
}

for (const button of document.querySelectorAll('[data-dialog]')) {
  button.addEventListener('click', () => {
    const dialog = document.getElementById(button.dataset.dialog);
    if (dialog === menuDialog) chooseDepartment(button.dataset.department || 'kitchen');
    const feedback = dialog.querySelector('[role="status"]');
    if (feedback) feedback.textContent = '';
    openDialog(dialog, button);
  });
}

for (const dialog of document.querySelectorAll('dialog')) {
  dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());

  const onBackdrop = event => {
    const box = dialog.getBoundingClientRect();
    return event.target === dialog && (
      event.clientX < box.left || event.clientX > box.right ||
      event.clientY < box.top || event.clientY > box.bottom
    );
  };
  let startedOutside = false;
  dialog.addEventListener('pointerdown', event => { startedOutside = onBackdrop(event); });
  dialog.addEventListener('click', event => {
    if (startedOutside && onBackdrop(event)) dialog.close();
    startedOutside = false;
  });

  dialog.addEventListener('close', () => {
    const opener = dialogOpeners.get(dialog);
    dialogOpeners.delete(dialog);
    opener?.focus({ preventScroll: true });
  });
}

const navigation = document.querySelector('#navigation');
for (const link of navigation.querySelectorAll('a')) {
  link.addEventListener('click', event => {
    event.preventDefault();
    const target = document.querySelector(link.hash);
    navigation.addEventListener('close', () => {
      history.pushState(null, '', link.hash);
      target.setAttribute('tabindex', '-1');
      target.focus({ preventScroll: true });
      target.scrollIntoView();
    }, { once: true });
    navigation.close();
  });
}

async function copyText(text, button) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Some browsers deny Clipboard API access for local files.
    }
  }
  const field = document.createElement('textarea');
  field.value = text;
  field.readOnly = true;
  field.tabIndex = -1;
  field.style.cssText = 'position:fixed;inset:0 auto auto 0;opacity:0;pointer-events:none';
  (button.closest('dialog') || document.body).append(field);
  field.focus({ preventScroll: true });
  field.select();
  field.setSelectionRange(0, text.length);
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch {
    copied = false;
  } finally {
    field.remove();
    button.focus({ preventScroll: true });
  }
  return copied;
}

for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const value = document.getElementById(button.dataset.copy).textContent.trim();
    const status = document.getElementById(button.getAttribute('aria-describedby'));
    status.textContent = await copyText(value, button)
      ? (button.dataset.copy === 'address' ? 'Адрес скопирован' : 'Номер скопирован')
      : 'Выделите текст и скопируйте вручную.';
  });
}

const lightbox = document.querySelector('#lightbox');
const stage = lightbox.querySelector('.lightbox-stage');
const fullImage = document.querySelector('#lightbox-image');
const caption = document.querySelector('#lightbox-caption');
const counter = document.querySelector('#lightbox-count');
const galleryFrames = [...document.querySelectorAll('.frame')];
const photos = [
  ...galleryFrames.map(frame => {
    const { alt } = frame.querySelector('img');
    return [frame.dataset.photo, frame.querySelector('span').textContent.trim(), alt];
  }),
  ['concrete','Бетонная стойка','Барная стойка и бетонная конструкция под потолком'],
  ['balcony','Деревянная галерея','Деревянный балкон в полумраке зала'],
  ['atrium','Вид сверху','Высокий зал сквозь перила галереи'],
  ['ceiling','Потолок','Балки, окна и подвесные детали под потолком'],
  ['table','Столик у стены','Круглый столик возле картины'],
  ['art','Арт-объект','Фигура у зелёной стены'],
  ['wall','Коллаж','Настенная коллекция цветных изображений'],
  ['details','Детали интерьера','Картины и украшения вдоль стены'],
  ['hero','Общий вид','Двухэтажный зал и бетонная стойка'],
  ['toast','Коктейли','Гости поднимают бокалы'],
  ['drinks','Подача коктейлей','Два коктейля на столике'],
];
let photoIndex = 0;
let swipeStart;

function showPhoto(index) {
  photoIndex = (index + photos.length) % photos.length;
  const [name, label, description] = photos[photoIndex];
  fullImage.classList.remove('frame-in');
  fullImage.alt = description;
  fullImage.src = `assets/photos/${name}.webp`;
  caption.textContent = label;
  counter.textContent = `${photoIndex + 1} / ${photos.length}`;
}

fullImage.addEventListener('load', () => fullImage.classList.add('frame-in'));
for (const button of document.querySelectorAll('[data-photo]')) {
  button.addEventListener('click', () => {
    showPhoto(photos.findIndex(([name]) => name === button.dataset.photo));
    openDialog(lightbox, button);
  });
}
for (const button of lightbox.querySelectorAll('[data-step]')) {
  button.addEventListener('click', () => showPhoto(photoIndex + Number(button.dataset.step)));
}
lightbox.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  showPhoto(photoIndex + (event.key === 'ArrowRight' ? 1 : -1));
});
stage.addEventListener('touchstart', event => {
  const { clientX, clientY } = event.changedTouches[0];
  swipeStart = [clientX, clientY];
}, { passive: true });
stage.addEventListener('touchend', event => {
  if (!swipeStart) return;
  const { clientX, clientY } = event.changedTouches[0];
  const deltaX = clientX - swipeStart[0];
  const deltaY = clientY - swipeStart[1];
  if (Math.abs(deltaX) > 44 && Math.abs(deltaX) > Math.abs(deltaY)) {
    showPhoto(photoIndex + (deltaX < 0 ? 1 : -1));
  }
  swipeStart = undefined;
}, { passive: true });
stage.addEventListener('touchcancel', () => { swipeStart = undefined; }, { passive: true });
lightbox.addEventListener('close', () => { swipeStart = undefined; });
