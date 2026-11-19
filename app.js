const {photos, rows} = patrolData;
const byId = id => document.getElementById(id);
const detailBody = byId('detail-body');
const dashboard = byId('dashboard');
const located = photos.filter(photo => photo.position.length);
const totalMinutes = jobs => jobs.reduce((total, row) => {
  const estimate = String(row[5] ?? '');
  const hours = Number(estimate.match(/(\d+)\s*ชั่[วง]โมง/)?.[1] ?? 0);
  const minutes = Number(estimate.match(/(\d+)\s*นาที/)?.[1] ?? 0);
  return total + hours * 60 + minutes;
}, 0);
const manualJobs = rows.filter(row => row[3] === 'เข้าไม่ถึง');
const manualPhotoByJob = new Map([[11,10],[22,22],[28,28],[37,37],[39,39]]);
const manualJobsByPhoto = new Map(manualJobs.map(row => [manualPhotoByJob.get(row[0]), row]));
const bambooSurvey = rows.find(row => row[0] === 1);
const insulatorSurvey = rows.find(row => row[0] === 2);
const estimatedTime = row => row?.[5]?.replace('ชั่งโมง', 'ชั่วโมง');
const vehicleAccess = row => ({
  'เข้าถึง': 'รถเข้าถึงได้',
  'เข้าไม่ถึง': 'รถเข้าถึงไม่ได้ ต้องใช้กำลังคนเข้าปฏิบัติงาน'
})[row?.[3]];
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let map;
let markers;
let activePhoto = null;
const node = (tag, value) => {
  const element = document.createElement(tag);
  if (value != null) element.textContent = value;
  return element;
};
const polePhoto = photos.find(photo => photo.file === 'photos/50.jpg');
const insulatorPhoto = photos.find(photo => photo.file === 'photos/49.jpg');
const isRecloserPole = photo => photo === polePhoto || photo === insulatorPhoto;
const photoPosition = photo => photo === insulatorPhoto ? polePhoto.position : photo.position;
const photoCaption = photo => photo.filename.replace(/\.jpg$/i, '');
const coordinates = photo => photoPosition(photo).map(value => value.toFixed(6)).join(', ');
const mapsLink = photo => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(coordinates(photo));
const photoGroups = [];
for (const photo of photos) {
  const position = photoPosition(photo);
  const group = position.length && photoGroups.find(items =>
    photoPosition(items[0]).join(',') === position.join(','));
  if (group) group.push(photo);
  else photoGroups.push([photo]);
}

let visibleGroups = photoGroups;
let visiblePins = located;
function setWorkFilter(onlyManual) {
  const jobs = onlyManual ? manualJobs : rows;
  const minutes = totalMinutes(jobs);
  visibleGroups = onlyManual ? photoGroups.filter(group => group.some(photo => manualJobsByPhoto.has(photo.id))) : photoGroups;
  visiblePins = onlyManual ? located.filter(photo => manualJobsByPhoto.has(photo.id)) : located;
  byId('job-total').textContent = jobs.length + ' งาน';
  byId('time-total').textContent = Math.floor(minutes / 60) + ' ชม. ' + (minutes % 60) + ' นาที';
  byId('manual-total').textContent = manualJobs.length + ' งาน';
  byId('manual-total').setAttribute('aria-pressed', String(onlyManual));
  activePhoto = null;
  dashboard.classList.add('map-overview');
  detailBody.replaceChildren();
  byId('photo-navigation').hidden = true;
  map?.stop();
  map?.invalidateSize({pan:false, animate:false});
  renderPins();
  fit();
}

function stepPhoto(offset) {
  const index = visibleGroups.findIndex(group => group.includes(activePhoto));
  const next = visibleGroups[index + offset];
  if (index >= 0 && next) photoDetail(next[0]);
}

function createPhotoCard(photo) {
  const card = node('article');
  card.className = 'survey-photo';
  const image = node('img');
  image.src = photo.file;
  image.alt = photoCaption(photo);
  const info = node('div');
  info.className = 'survey-photo-info';
  const manualJob = manualJobsByPhoto.get(photo.id);
  if (manualJob) {
    info.append(node('p', 'งานที่ ' + manualJob[0] + ' · ' + [manualJob[2],manualJob[6],estimatedTime(manualJob)].filter(Boolean).join(' · ')));
    info.append(node('p', vehicleAccess(manualJob)));
  } else if (isRecloserPole(photo)) {
    const isInsert = photo === insulatorPhoto;
    const survey = isInsert ? insulatorSurvey : bambooSurvey;
    info.append(node('p', isInsert ? 'ลูกถ้วยก้านตรงรั่ว (Leak) · เฟส C' : 'กอไผ่ 1 กอ · ต้นแรกหลังรีโคลสเซอร์'));
    info.append(node('p', [estimatedTime(survey), vehicleAccess(survey)].filter(Boolean).join(' · ')));
  } else if (photo.description) {
    info.append(node('p', photo.description));
  }
  card.append(node('h2', photoCaption(photo)), image);
  if (info.childElementCount) card.append(info);
  return card;
}

function photoDetail(photo) {
  activePhoto = photo;
  if (dashboard.classList.contains('map-overview')) {
    dashboard.classList.remove('map-overview');
    map?.invalidateSize({pan:false, animate:false});
  }
  const index = visibleGroups.findIndex(group => group.includes(photo));
  const group = visibleGroups[index];
  const previous = byId('previous-photo');
  const next = byId('next-photo');
  previous.disabled = index === 0;
  next.disabled = index === visibleGroups.length - 1;
  byId('photo-position').textContent = (index + 1) + ' / ' + visibleGroups.length + ' จุด';
  byId('photo-navigation').hidden = false;
  if (document.activeElement === previous && previous.disabled) next.focus();
  if (document.activeElement === next && next.disabled) previous.focus();
  const position = photoPosition(photo);
  if (map && position.length) {
    map.stop();
    const targetZoom = Math.max(map.getZoom(), 17);
    if (reducedMotion.matches) map.setView(position, targetZoom, {animate:false});
    else if (map.getZoom() === targetZoom) map.panTo(position, {animate:true,duration:.45});
    else map.flyTo(position, targetZoom, {duration:.65});
  }
  const gallery = node('div');
  gallery.className = group.length > 1 ? 'survey-gallery multiple' : 'survey-gallery';
  gallery.append(...group.map(createPhotoCard));
  const location = node('div');
  location.className = 'survey-location';
  location.append(node('span', position.length ? coordinates(photo) : 'รูปนี้ไม่มีพิกัดกำกับ'));
  if (position.length) {
    const link = node('a', 'เปิดใน Google Maps');
    link.href = mapsLink(photo);
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
    const isSelected = marker.options.title === 'รูปที่ ' + selected?.id;
    marker.getElement()?.classList.toggle('pin-selected', isSelected);
    marker.setZIndexOffset(isSelected ? 1000 : 0);
  });
}
const fit = () => {
  if (map) {
    map.stop();
    map.fitBounds(visiblePins.map(photo => photo.position), {padding:[35,35], maxZoom:17, animate:false});
  }
};
function renderPins() {
  if (!markers) return;
  markers.clearLayers();
  for (const photo of visiblePins) {
    L.marker(photo.position, {
      title: 'รูปที่ ' + photo.id,
      icon: L.divIcon({
        className: 'pin',
        html: '<span><b>' + photo.id + '</b></span>',
        iconSize: [34,40],
        iconAnchor: [17,38]
      })
    }).on('click', () => photoDetail(photo)).addTo(markers);
  }
}
byId('fit').onclick = () => setWorkFilter(false);
byId('manual-total').onclick = () => setWorkFilter(true);
byId('previous-photo').onclick = () => stepPhoto(-1);
byId('next-photo').onclick = () => stepPhoto(1);
document.addEventListener('keydown', event => {
  if (!activePhoto || event.altKey || event.ctrlKey || event.metaKey ||
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
  const imageryOptions = {maxZoom:20,maxNativeZoom:18,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'};
  const imagery = L.tileLayer(imageryUrl, imageryOptions);
  const reference = 'https://services.arcgisonline.com/arcgis/rest/services/Reference/';
  const highways = L.tileLayer(reference + 'World_Transportation/MapServer/tile/{z}/{y}/{x}',
    {maxZoom:20,maxNativeZoom:19,zIndex:2,attribution:'Roads © Esri, HERE, Garmin'});
  const places = L.tileLayer(reference + 'World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    {maxZoom:20,maxNativeZoom:19,zIndex:3,attribution:'Place names © Esri and contributors'});
  const hybrid = L.layerGroup([L.tileLayer(imageryUrl, imageryOptions), highways, places]).addTo(map);
  const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:20,maxNativeZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'});
  L.control.layers({'ดาวเทียม + ชื่อสถานที่และถนน':hybrid,'ภาพดาวเทียม Esri':imagery,'แผนที่ถนน':streets},null,{position:'topright'}).addTo(map);
  L.control.scale({imperial:false}).addTo(map);
  markers = L.layerGroup().addTo(map);
} else {
  byId('map-status').textContent = 'โหลดแผนที่ไม่สำเร็จ กรุณาตรวจการเชื่อมต่อแล้วโหลดหน้าใหม่';
}
setWorkFilter(false);
