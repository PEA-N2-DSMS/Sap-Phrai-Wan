const byId = id => document.getElementById(id);
const surveyCircuit = 'WGT03VR-04';
const circuitUrl = new URL(window.location.href);
const isSurveyCircuit = circuitUrl.searchParams.get('circuit') === surveyCircuit;
const circuit = byId('circuit');
circuit.value = isSurveyCircuit ? surveyCircuit : 'WGT03VR-105';
document.title = 'PEA ' + circuit.value;
let circuitTransition;
window.addEventListener('pageshow', () => {
  circuitTransition?.cancel();
  circuit.value = isSurveyCircuit ? surveyCircuit : 'WGT03VR-105';
});
circuit.addEventListener('change', () => {
  circuitTransition?.cancel();
  if (circuit.value === surveyCircuit) circuitUrl.searchParams.set('circuit', surveyCircuit);
  else circuitUrl.searchParams.delete('circuit');
  if (reducedMotion.matches) {
    window.location.assign(circuitUrl);
    return;
  }
  circuitTransition = dashboard.animate([{opacity: 1}, {opacity: .7}], {
    duration: 140, easing: 'ease-in', fill: 'forwards'
  });
  circuitTransition.onfinish = () => window.location.assign(circuitUrl);
});
const photos = isSurveyCircuit ? wgt03vr04 : patrolData.photos;
const rows = isSurveyCircuit ? photos.map(photo => [photo.id]) : patrolData.rows.map(row => [...row]);
const editStorageKey = 'pea-survey-edits:' + circuit.value;
let edits = {};
try {
  edits = JSON.parse(localStorage.getItem(editStorageKey)) ?? {};
} catch {
  // The survey remains viewable when browser storage is unavailable.
}
const descriptions = edits.descriptions ?? {};
const jobEdits = edits.jobs ?? {};
const applyJobEdit = row => {
  const edit = jobEdits[row[0]];
  if (edit) {
    row[3] = edit.access;
    row[5] = edit.time;
  }
  return row;
};
rows.forEach(applyJobEdit);
const detailBody = byId('detail-body');
const dashboard = byId('dashboard');
const totalMinutes = jobs => jobs.reduce((total, row) => {
  const estimate = String(row[5] ?? '');
  const hours = Number(estimate.match(/(\d+)\s*ชั่[วง]โมง/)?.[1] ?? 0);
  const minutes = Number(estimate.match(/(\d+)\s*นาที/)?.[1] ?? 0);
  return total + hours * 60 + minutes;
}, 0);
// Excel job numbers in photo-ID order. A job recorded in several photos contributes once to the total.
const jobNumbersByPhoto = [
  1, 2, 3, 4, 4, 5, 7, 9, 10, 11,
  12, 13, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 44, 44, 44, 45
];
const jobsByPhoto = new Map(photos.map(photo => [
  photo.id, rows.find(row => row[0] === (isSurveyCircuit ? photo.id : jobNumbersByPhoto[photo.id - 1]))
]));
const isManualPhoto = photo => jobsByPhoto.get(photo.id)?.[3] === 'เข้าไม่ถึง';
const photoCountByJob = new Map();
for (const job of jobsByPhoto.values()) {
  if (job) photoCountByJob.set(job[0], (photoCountByJob.get(job[0]) ?? 0) + 1);
}
const workTimeLabel = row => {
  const time = row?.[5]?.replace('ชั่งโมง', 'ชั่วโมง');
  if (!time) return 'ไม่มีข้อมูลประมาณเวลาทำงาน';
  const photoCount = photoCountByJob.get(row[0]);
  return photoCount > 1
    ? 'ประมาณเวลาทำงานรวม ' + time
    : 'ประมาณเวลาทำงาน ' + time;
};
const vehicleAccess = row => ({
  'เข้าถึง': 'รถเข้าถึงได้',
  'เข้าไม่ถึง': 'รถเข้าถึงไม่ได้ ต้องใช้กำลังคนเข้าปฏิบัติงาน'
})[row?.[3]];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const overviewZoom = 13;
const workDetailZoom = 16;
let map;
let markers;
let activePhoto = null;
let overviewAnimation;
const node = (tag, value) => {
  const element = document.createElement(tag);
  if (value != null) element.textContent = value;
  return element;
};
const polePhoto = photos.find(photo => photo.file === 'photos/50.jpg');
const insulatorPhoto = photos.find(photo => photo.file === 'photos/49.jpg');
const isRecloserPole = photo => photo === polePhoto || photo === insulatorPhoto;
const photoPosition = photo => photo === insulatorPhoto ? polePhoto.position : photo.position;
const photoCaption = photo => isSurveyCircuit
  ? 'รายการที่ ' + photo.id
  : 'รูปที่ ' + photo.id;
const coordinates = photo => photoPosition(photo).map(value => value.toFixed(6)).join(', ');
const streetViewLink = photo => {
  const params = new URLSearchParams({
    api: '1',
    map_action: 'pano',
    viewpoint: photoPosition(photo).join(',')
  });
  return 'https://www.google.com/maps/@?' + params;
};
const photoGroups = [];
for (const photo of photos) {
  const position = photoPosition(photo);
  const group = position.length && photoGroups.find(items =>
    photoPosition(items[0]).join(',') === position.join(','));
  if (group) group.push(photo);
  else photoGroups.push([photo]);
}

// A single marker opens every survey record at that coordinate.
const located = (isSurveyCircuit ? photoGroups.map(group => group[0]) : photos)
  .filter(photo => photo.position.length);

let showManualPins = false;
function showOverview(highlightManual) {
  showManualPins = highlightManual;
  const manualJobs = rows.filter(row => row[3] === 'เข้าไม่ถึง');
  const minutes = totalMinutes(rows);
  byId('job-total').textContent = rows.length + ' งาน';
  byId('job-total').disabled = photoGroups.length === 0;
  byId('time-total').textContent = rows.some(job => job[5])
    ? Math.floor(minutes / 60) + ' ชม. ' + (minutes % 60) + ' นาที'
    : '—';
  byId('manual-total').textContent = manualJobs.length + ' งาน';
  byId('manual-total').setAttribute('aria-pressed', String(highlightManual));
  activePhoto = null;
  dashboard.classList.add('map-overview');
  detailBody.replaceChildren();
  byId('photo-navigation').hidden = true;
  map?.stop();
  map?.invalidateSize({pan:false, animate:false});
  renderPins();
  fit(highlightManual);
  overviewAnimation?.cancel();
  if (!reducedMotion.matches) {
    overviewAnimation = byId('map').animate(
      [{opacity: .84}, {opacity: 1}],
      {duration: 180, easing: 'ease-out'}
    );
  }
}

function stepPhoto(offset) {
  const index = photoGroups.findIndex(group => group.includes(activePhoto));
  const next = photoGroups[index + offset];
  if (index >= 0 && next) photoDetail(next[0]);
}

function photoDescription(photo) {
  if (Object.hasOwn(descriptions, photo.id)) return descriptions[photo.id];
  if (isSurveyCircuit) return photo.description;
  if (isRecloserPole(photo)) {
    return photo === insulatorPhoto
      ? 'ลูกถ้วยก้านตรงรั่ว (Leak) · เฟส C'
      : 'กอไผ่ 1 กอ · ต้นแรกหลังรีโคลสเซอร์';
  }
  const filename = photo.filename.replace(/\.jpg$/i, '').replace(/^จุดที่\s+\d+(?:\.\d+)*\s*/, '').trim();
  return [filename, photo.description].filter(Boolean).join(' · ');
}

const editor = byId('photo-editor');
const editDescription = byId('edit-description');
const editMinutes = byId('edit-minutes');
const editAccess = byId('edit-access');
let editingPhoto;

function openPhotoEditor(photo) {
  const job = jobsByPhoto.get(photo.id);
  editingPhoto = photo;
  byId('editor-heading').textContent = 'แก้ไข ' + photoCaption(photo);
  editDescription.value = photoDescription(photo);
  editMinutes.value = job[5] ? totalMinutes([job]) : '';
  editAccess.value = job[3] ?? '';
  const count = photoCountByJob.get(job[0]);
  byId('editor-shared').textContent = count > 1 ? 'เวลาและสถานะรถใช้ร่วมกัน ' + count + ' รูปในงานนี้' : '';
  byId('editor-error').textContent = '';
  editor.showModal();
}

byId('cancel-edit').onclick = () => editor.close();
byId('edit-form').onsubmit = event => {
  event.preventDefault();
  const job = jobsByPhoto.get(editingPhoto.id);
  const minutes = editMinutes.valueAsNumber;
  const time = Number.isNaN(minutes) ? '' : minutes >= 60
    ? Math.floor(minutes / 60) + ' ชั่วโมง ' + (minutes % 60) + ' นาที'
    : minutes + ' นาที';
  const description = editDescription.value.trim();
  const edit = {time, access: editAccess.value};
  try {
    localStorage.setItem(editStorageKey, JSON.stringify({
      descriptions: {...descriptions, [editingPhoto.id]: description},
      jobs: {...jobEdits, [job[0]]: edit}
    }));
  } catch {
    byId('editor-error').textContent = 'บันทึกไม่ได้ กรุณาตรวจสอบการตั้งค่าพื้นที่จัดเก็บของเบราว์เซอร์';
    return;
  }
  descriptions[editingPhoto.id] = description;
  jobEdits[job[0]] = edit;
  applyJobEdit(job);
  editor.close();
  const photo = activePhoto;
  const onlyManual = byId('manual-total').getAttribute('aria-pressed') === 'true';
  showOverview(onlyManual);
  if (photoGroups.some(group => group.includes(photo))) {
    photoDetail(photo);
    detailBody.querySelector('[aria-label="แก้ไข ' + photoCaption(editingPhoto) + '"]')?.focus();
  }
};

function photoHeading(photo, description) {
  const heading = node('h2', photoCaption(photo));
  heading.className = 'photo-heading';
  if (description) heading.append(' : ' + description);
  return heading;
}

function appendWorkDetails(info, row) {
  const text = [workTimeLabel(row), vehicleAccess(row)].filter(Boolean).join(' · ');
  const details = node('p', text);
  details.className = 'work-details';
  info.append(details);
}

function createPhotoCard(photo) {
  const card = node('article');
  card.className = 'survey-photo';
  const info = node('div');
  info.className = 'survey-photo-info';
  const edit = node('button', 'แก้ไข');
  edit.type = 'button';
  edit.className = 'edit-photo';
  edit.setAttribute('aria-label', 'แก้ไข ' + photoCaption(photo));
  edit.onclick = () => openPhotoEditor(photo);
  appendWorkDetails(info, jobsByPhoto.get(photo.id));
  info.append(edit);
  if (isSurveyCircuit) {
    const images = node('div');
    images.className = 'record-images';
    for (const [index, file] of photo.images.entries()) {
      const image = node('img');
      image.src = file;
      image.alt = photoCaption(photo) + ' รูปที่ ' + (index + 1);
      images.append(image);
    }
    if (!photo.images.length) images.append(node('p', 'ไม่พบไฟล์ภาพใน ZIP'));
    card.append(photoHeading(photo, photoDescription(photo)), images, info);
    card.classList.add('survey-record');
    return card;
  }
  const image = node('img');
  image.src = photo.file;
  image.alt = photoCaption(photo);
  card.append(photoHeading(photo, photoDescription(photo)), image, info);
  return card;
}

function photoDetail(photo) {
  overviewAnimation?.cancel();
  activePhoto = photo;
  if (dashboard.classList.contains('map-overview')) {
    dashboard.classList.remove('map-overview');
    map?.invalidateSize({pan:false, animate:false});
  }
  const index = photoGroups.findIndex(group => group.includes(photo));
  const group = photoGroups[index];
  const previous = byId('previous-photo');
  const next = byId('next-photo');
  previous.disabled = index === 0;
  next.disabled = index === photoGroups.length - 1;
  byId('photo-position').textContent = (index + 1) + ' / ' + photoGroups.length + ' จุด';
  byId('photo-navigation').hidden = false;
  if (document.activeElement === previous && previous.disabled) next.focus();
  if (document.activeElement === next && next.disabled) previous.focus();
  const position = photoPosition(photo);
  if (map && position.length) {
    map.stop();
    const targetZoom = workDetailZoom;
    if (reducedMotion.matches) map.setView(position, targetZoom, {animate:false});
    else if (map.getZoom() === targetZoom) map.panTo(position, {animate:true,duration:.28});
    else map.flyTo(position, targetZoom, {duration:.42});
  }
  const gallery = node('div');
  gallery.className = group.length > 1 ? 'survey-gallery multiple' : 'survey-gallery';
  gallery.append(...group.map(createPhotoCard));
  const location = node('div');
  location.className = 'survey-location';
  if (position.length) {
    const coordinateLabel = node('span', 'พิกัด');
    coordinateLabel.className = 'coordinate-label';
    const coordinateValue = node('strong', coordinates(photo));
    coordinateValue.className = 'coordinate-value';
    location.append(coordinateLabel, coordinateValue);
  } else {
    location.append(node('span', 'รูปนี้ไม่มีพิกัดกำกับ'));
  }
  if (position.length) {
    const link = node('a', 'เปิด Google Street View');
    link.href = streetViewLink(photo);
    link.target = '_blank';
    link.rel = 'noopener';
    location.append(link);
  }
  detailBody.classList.add('photo-view');
  detailBody.replaceChildren(gallery, location);
  highlightPin();
}
function highlightPin() {
  const selected = activePhoto === insulatorPhoto ? polePhoto : activePhoto;
  markers?.eachLayer(marker => {
    const isSelected = marker.options.title === (selected && markerTitle(selected));
    const highlighted = showManualPins && isManualPin(marker.options.surveyPhoto);
    marker.getElement()?.classList.toggle('pin-selected', isSelected);
    marker.getElement()?.classList.toggle('pin-manual', highlighted);
    marker.setZIndexOffset(isSelected ? 1000 : highlighted ? 500 : 0);
  });
}
const isManualPin = photo => isSurveyCircuit
  ? photoGroups.find(group => group[0] === photo).some(isManualPhoto)
  : isManualPhoto(photo);
const fit = highlightManual => {
  if (map) {
    map.stop();
    if (!located.length) return;
    const bounds = L.latLngBounds(located.map(photo => photo.position));
    const manualPins = highlightManual ? located.filter(isManualPin) : [];
    if (manualPins.length) {
      map.fitBounds(manualPins.map(photo => photo.position), {padding:[35,35], maxZoom:17, animate:false});
    } else {
      map.setView(bounds.getCenter(), overviewZoom, {animate:false});
    }
  }
};
const markerTitle = photo => (isSurveyCircuit ? 'รายการที่ ' : 'รูปที่ ') + photo.id;
function renderPins() {
  if (!markers) return;
  markers.clearLayers();
  for (const photo of located) {
    L.marker(photo.position, {
      surveyPhoto: photo,
      title: markerTitle(photo),
      alt: markerTitle(photo),
      icon: L.divIcon({
        className: 'pin',
        html: '<span><b>' + photo.id + '</b></span>',
        iconSize: [34,40],
        iconAnchor: [17,36]
      })
    }).on('click', () => photoDetail(photo)).addTo(markers);
  }
  highlightPin();
}
byId('job-total').onclick = () => photoDetail(photoGroups[0][0]);
byId('fit').onclick = () => showOverview(false);
byId('manual-total').onclick = () => showOverview(true);
byId('previous-photo').onclick = () => stepPhoto(-1);
byId('next-photo').onclick = () => stepPhoto(1);
document.addEventListener('keydown', event => {
  if (editor.open || !activePhoto || event.altKey || event.ctrlKey || event.metaKey ||
      event.target.closest('input, textarea, select, [contenteditable]') ||
      !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
  event.preventDefault();
  stepPhoto(event.key === 'ArrowLeft' ? -1 : 1);
});
if (window.L) {
  byId('map-status').remove();
  map = L.map('map',{zoomControl:false});
  L.control.zoom({position:'topright'}).addTo(map);
  const imageryUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  L.tileLayer(imageryUrl, {
    maxZoom: 20,
    maxNativeZoom: 18,
    attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'
  }).addTo(map);
  L.control.scale({imperial:false}).addTo(map);
  markers = L.layerGroup().addTo(map);
} else {
  byId('map-status').textContent = 'โหลดแผนที่ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วโหลดหน้าใหม่';
}
showOverview(false);
