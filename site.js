'use strict';

const nav = document.querySelector('#nav');
const toggle = document.querySelector('.menu-toggle');
function setMenu(open) {
  nav.classList.toggle('open', open);
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Fechar navegação' : 'Abrir navegação');
  toggle.querySelector('img').src = open ? 'assets/x.svg' : 'assets/menu.svg';
}
toggle.addEventListener('click', () => setMenu(!nav.classList.contains('open')));
nav.addEventListener('click', () => setMenu(false));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && nav.classList.contains('open')) {
    setMenu(false);
    toggle.focus();
  }
});
document.addEventListener('click', event => {
  if (!event.target.closest('header') && nav.classList.contains('open')) setMenu(false);
});
const sections = [...nav.querySelectorAll('a')].map(link => document.querySelector(link.hash));
const currentSection = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    for (const link of nav.querySelectorAll('a')) {
      if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  }
}, {rootMargin: '0px 0px -45% 0px'});
sections.forEach(section => currentSection.observe(section));

const gallery = [...document.querySelectorAll('.gallery button')];
const filters = document.querySelector('.filters');
filters.addEventListener('click', event => {
  const selected = event.target.closest('button');
  if (!selected) return;
  for (const button of filters.querySelectorAll('button')) {
    button.setAttribute('aria-pressed', String(button === selected));
  }
  for (const photo of gallery) {
    photo.hidden = selected.dataset.filter !== 'todos' && selected.dataset.filter !== photo.dataset.cat;
  }
  rebuildCarousel();
  const visibleCount = gallery.filter(photo => !photo.hidden).length;
  document.querySelector('#gallery-status').textContent = visibleCount + (visibleCount === 1 ? ' foto exibida.' : ' fotos exibidas.');
});
const galleryTrack = document.querySelector('.gallery');
const secondTrack = document.createElement('div');
secondTrack.className = 'gallery gallery-second';
secondTrack.tabIndex = 0;
secondTrack.setAttribute('aria-label', 'Segunda faixa de fotos, role para ver mais');
galleryTrack.after(secondTrack);
const galleryTracks = [galleryTrack, secondTrack];
let carouselWidths = [0, 0];
let previousFrame = 0;
let scrollRemainder = 0;
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
function rebuildCarousel() {
  galleryTracks.forEach(track => {
    track.querySelectorAll('[data-clone]').forEach(item => item.remove());
    track.scrollLeft = 0;
  });
  const visible = gallery.filter(item => !item.hidden);
  visible.forEach((photo, index) => galleryTracks[index % 2].append(photo));
  gallery.filter(item => item.hidden).forEach(photo => galleryTrack.append(photo));
  galleryTracks.forEach((track, index) => {
    const originals = visible.filter((photo, photoIndex) => photoIndex % 2 === index);
    for (const photo of originals) {
      const clone = photo.cloneNode(true);
      clone.dataset.clone = 'true';
      clone.tabIndex = -1;
      clone.setAttribute('aria-hidden', 'true');
      clone.addEventListener('click', () => photo.click());
      track.append(clone);
    }
    const firstClone = track.querySelector('[data-clone]');
    carouselWidths[index] = firstClone ? firstClone.offsetLeft - track.offsetLeft : 0;
  });
}
function animateGallery(time) {
  const elapsed = previousFrame ? Math.min(time - previousFrame, 50) : 0;
  previousFrame = time;
  if (!document.hidden && !document.querySelector('#lightbox').open) {
    scrollRemainder += elapsed * 0.045;
    const wholePixels = Math.floor(scrollRemainder);
    scrollRemainder -= wholePixels;
    galleryTracks.forEach((track, index) => {
      if (!carouselWidths[index]) return;
      track.scrollLeft += wholePixels;
      if (track.scrollLeft >= carouselWidths[index]) track.scrollLeft -= carouselWidths[index];
    });
  }
  requestAnimationFrame(animateGallery);
}
document.querySelector('.gallery-back').addEventListener('click', () => galleryTracks.forEach(track => track.scrollBy({left: -300, behavior: motionPreference.matches ? 'instant' : 'smooth'})));
document.querySelector('.gallery-forward').addEventListener('click', () => galleryTracks.forEach(track => track.scrollBy({left: 300, behavior: motionPreference.matches ? 'instant' : 'smooth'})));
window.addEventListener('resize', rebuildCarousel);
rebuildCarousel();
requestAnimationFrame(animateGallery);
const modal = document.querySelector('#lightbox');
const largePhoto = document.querySelector('#large-photo');
let currentPhoto;
function showPhoto(photo) {
  currentPhoto = photo;
  const thumbnail = photo.querySelector('img');
  largePhoto.src = thumbnail.currentSrc;
  largePhoto.alt = thumbnail.alt;
  document.querySelector('#photo-caption').textContent = photo.querySelector('span').textContent;
  const source = document.querySelector('#photo-source');
  source.hidden = photo.dataset.source === 'cliente';
  source.href = photo.dataset.source === 'google' ? 'https://www.google.com/maps?cid=10130764697712242227' : 'https://www.instagram.com/p/' + photo.dataset.source + '/';
  source.textContent = photo.dataset.source === 'google' ? 'Perfil do buffet no Google' : 'Publicação no Instagram';
  modal.querySelector('.photo-arrows').hidden = gallery.filter(item => !item.hidden).length < 2;
}
function stepPhoto(offset) {
  const visible = gallery.filter(photo => !photo.hidden);
  showPhoto(visible[(visible.indexOf(currentPhoto) + offset + visible.length) % visible.length]);
}
gallery.forEach(photo => photo.addEventListener('click', () => {
  showPhoto(photo);
  modal.showModal();
}));
modal.querySelector('.close').addEventListener('click', () => modal.close());
modal.querySelector('.next').addEventListener('click', () => stepPhoto(1));
modal.querySelector('.prev').addEventListener('click', () => stepPhoto(-1));
modal.addEventListener('click', event => {
  if (event.target === modal) modal.close();
});
modal.addEventListener('keydown', event => {
  if (event.key === 'ArrowRight') stepPhoto(1);
  if (event.key === 'ArrowLeft') stepPhoto(-1);
});

const form = document.querySelector('#quote-form');
const fields = form.elements;
const steps = [...form.querySelectorAll('.wizard-step')];
const nextButton = form.querySelector('.wizard-next');
const backButton = form.querySelector('.wizard-back');
const errorText = form.querySelector('#step-error');
const statusText = form.querySelector('#form-status');
const retryLink = form.querySelector('.retry');
let step = 0;
function updateDateLimit() {
  const today = new Date();
  const parts = [today.getFullYear(), today.getMonth() + 1, today.getDate()].map(value => String(value).padStart(2, '0'));
  fields.data.min = parts.join('-'); fields.mes.min = parts.slice(0, 2).join('-');
}
function selectedDate() {
  if (fields.tipo_data.value === 'data') return fields.data.value.split('-').reverse().join('/');
  if (fields.tipo_data.value === 'mes') return fields.mes.value.split('-').reverse().join('/');
  return 'A definir';
}
function chosenServices() { return [...form.querySelectorAll('[name="servicos"]:checked')].map(item => item.value); }
function values() { return [['Evento', fields.ocasiao.value, 0], ['Convidados', fields.convidados.value, 1], ['O que servir', chosenServices().join(', '), 2], ['Data', selectedDate(), 3], ['Nome', fields.nome.value.trim() || 'Não informado', 4], ['Local', fields.local.value.trim() || 'A definir', 4], ['Observações', fields.obs.value.trim() || 'Nenhuma', 4]]; }
function makeMessage() {
  const lines = ['Olá, Lêda! Gostaria de um orçamento para meu evento.', 'Evento: ' + fields.ocasiao.value, 'Convidados: ' + fields.convidados.value, 'O que servir: ' + chosenServices().join(', '), 'Data: ' + selectedDate()];
  if (fields.nome.value.trim()) lines.push('Nome: ' + fields.nome.value.trim());
  if (fields.local.value.trim()) lines.push('Local: ' + fields.local.value.trim());
  if (fields.obs.value.trim()) lines.push('Observações: ' + fields.obs.value.trim());
  return lines.join('\n');
}
function refreshSelections() {
  const container = form.querySelector('#wizard-selections'); container.replaceChildren();
  const choices = [fields.ocasiao.value, fields.convidados.value, chosenServices().join(', '), fields.tipo_data.value ? selectedDate() : ''];
  choices.filter(Boolean).forEach(value => { const chip = document.createElement('span'); chip.textContent = value; container.append(chip); });
}
function updateSummary() {
  const summary = form.querySelector('#quote-summary'); summary.replaceChildren();
  for (const [label, value, target] of values()) {
    const row = document.createElement('div'); const content = document.createElement('div');
    const term = document.createElement('dt'); const description = document.createElement('dd'); const edit = document.createElement('button');
    term.textContent = label; description.textContent = value; edit.type = 'button'; edit.textContent = 'Editar'; edit.setAttribute('aria-label', 'Editar ' + label.toLowerCase()); edit.addEventListener('click', () => showStep(target));
    content.append(term, description); row.append(content, edit); summary.append(row);
  }
  form.querySelector('#message-preview').textContent = makeMessage();
}
function showStep(index) {
  step = index; steps.forEach((section, position) => { section.hidden = position !== step; });
  const percent = step * 20; form.querySelector('#step-label').textContent = step === 5 ? 'Pronto para enviar' : `Etapa ${step + 1} de 5`;
  form.querySelector('#step-percent').textContent = `${percent}%`; form.querySelector('#progress-fill').style.width = `${percent}%`;
  backButton.hidden = step === 0; nextButton.hidden = step === 5; nextButton.firstChild.textContent = step === 4 ? 'Ver resumo ' : 'Continuar ';
  errorText.textContent = ''; refreshSelections(); if (step === 5) updateSummary();
}
function validateStep(index) {
  if (index === 0 && !fields.ocasiao.value) { errorText.textContent = 'Escolha o tipo de celebração.'; return false; }
  if (index === 1 && !fields.convidados.value) { errorText.textContent = 'Escolha a quantidade aproximada de convidados.'; return false; }
  if (index === 2 && !chosenServices().length) { errorText.textContent = 'Escolha ao menos uma opção.'; return false; }
  if (index === 3) {
    if (!fields.tipo_data.value) { errorText.textContent = 'Escolha uma opção para a data.'; return false; }
    updateDateLimit();
    if (fields.tipo_data.value === 'data' && !fields.data.reportValidity()) return false;
    if (fields.tipo_data.value === 'mes' && !fields.mes.reportValidity()) return false;
  }
  return true;
}
nextButton.addEventListener('click', () => { if (validateStep(step)) showStep(step + 1); });
backButton.addEventListener('click', () => showStep(step - 1));
form.addEventListener('change', event => {
  if (event.target.name === 'tipo_data') {
    form.querySelector('#date-field').hidden = fields.tipo_data.value !== 'data'; form.querySelector('#month-field').hidden = fields.tipo_data.value !== 'mes';
    fields.data.required = fields.tipo_data.value === 'data'; fields.mes.required = fields.tipo_data.value === 'mes';
  }
  errorText.textContent = ''; refreshSelections();
});
form.addEventListener('input', () => { errorText.textContent = ''; retryLink.hidden = true; statusText.textContent = ''; refreshSelections(); });
document.querySelectorAll('[data-interesse]').forEach(link => link.addEventListener('click', () => {
  form.reset(); form.querySelector('#date-field').hidden = true; form.querySelector('#month-field').hidden = true;
  fields.data.required = false; fields.mes.required = false;
  if (link.dataset.interesse === 'Casamento') fields.ocasiao.value = 'Casamento';
  if (link.dataset.interesse === 'Mesa de sobremesas') form.querySelector('[name="servicos"][value="Mesa de sobremesas"]').checked = true;
  if (link.dataset.interesse === 'Festas e encontros') fields.ocasiao.value = 'Outra ocasião';
  showStep(0);
}));
form.addEventListener('submit', event => {
  event.preventDefault();
  for (let index = 0; index < 4; index++) { if (!validateStep(index)) { showStep(index); validateStep(index); return; } }
  retryLink.href = document.querySelector('.direct-wa').href + '?text=' + encodeURIComponent(makeMessage()); retryLink.hidden = false;
  statusText.textContent = 'Mensagem preparada. Envie no WhatsApp. Se a conversa não abriu, use o link abaixo.';
  window.open(retryLink.href, '_blank', 'noopener,noreferrer');
});
form.querySelector('#copy-message').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(makeMessage()); statusText.textContent = 'Mensagem copiada.'; }
  catch { statusText.textContent = 'Não foi possível copiar. Abra a mensagem acima para selecioná-la.'; form.querySelector('.message-preview').open = true; }
});
form.querySelector('#restart-quote').addEventListener('click', () => {
  form.reset(); fields.data.required = false; fields.mes.required = false; form.querySelector('#date-field').hidden = true; form.querySelector('#month-field').hidden = true;
  retryLink.hidden = true; statusText.textContent = ''; showStep(0);
});
updateDateLimit(); showStep(0);

// Reserve space around the floating contact on small screens where the page uses the full width.
const floating = document.querySelector('.floating');
const compactLayout = window.matchMedia('(max-width: 850px)');
function positionContact() {
  const size = 48;
  const right = document.documentElement.clientWidth;
  const bottom = window.innerHeight;
  const protectedElements = document.querySelectorAll('main p,main h1,main h2,main h3,main a,main button,main input,main select,main textarea,main summary,footer a,footer p');
  const overlaps = compactLayout.matches && [...protectedElements].some(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.right > right - size - 13 && bounds.top < bottom - 5 && bounds.bottom > bottom - size - 13;
  });
  floating.hidden = overlaps || modal.open;
}
let positionQueued = false;
function schedulePosition() {
  if (positionQueued) return;
  positionQueued = true;
  requestAnimationFrame(() => { positionContact(); positionQueued = false; });
}
window.addEventListener('scroll', schedulePosition, {passive:true});
window.addEventListener('resize', schedulePosition);
modal.addEventListener('close', schedulePosition);
positionContact();

const testimonialCards = [...document.querySelectorAll('.testimonial-card')];
let activeTestimonial = 0;
function changeTestimonial(direction) {
  activeTestimonial = (activeTestimonial + direction + testimonialCards.length) % testimonialCards.length;
  testimonialCards.forEach((card, index) => { card.hidden = index !== activeTestimonial; });
  document.querySelector('#testimonial-counter').textContent = `${activeTestimonial + 1} / ${testimonialCards.length}`;
}
document.querySelector('.testimonial-next').addEventListener('click', () => changeTestimonial(1));

const reviewPhotoDialog = document.querySelector('#review-photo-dialog');
document.querySelector('.review-photo-trigger').addEventListener('click', () => reviewPhotoDialog.showModal());
reviewPhotoDialog.querySelector('.review-photo-close').addEventListener('click', () => reviewPhotoDialog.close());
reviewPhotoDialog.addEventListener('click', event => { if (event.target === reviewPhotoDialog) reviewPhotoDialog.close(); });
