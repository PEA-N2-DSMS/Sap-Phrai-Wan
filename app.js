const {photos, rows} = patrolData;
const byId = id => document.getElementById(id);
const photoTab = byId('photo-tab');
const rowTab = byId('row-tab');
const search = byId('search');
const browse = byId('browse');
const detailBody = byId('detail-body');
const located = photos.filter(photo => photo.position.length);
const insulatorSurvey = rows.find(row => row[0] === 2);
const estimatedTime = row => row?.[5]?.replace('ชั่งโมง', 'ชั่วโมง');
const vehicleAccess = row => ({
  'เข้าถึง': 'รถเข้าถึงได้',
  'เข้าไม่ถึง': 'รถเข้าถึงไม่ได้ ต้องใช้กำลังคนเข้าปฏิบัติงาน'
})[row?.[3]];
let mode = 'photos';
let map;
let markers;
let activePhoto = null;
const photoObservations = new Map([
  [
    "photos/50.jpg",
    "แนวสายและเสาไฟฟ้าอยู่ข้างต้นไม้สูง"
  ],
  [
    "photos/49.jpg",
    "ภาพระยะใกล้ของลูกถ้วยบนคอนเสา"
  ],
  [
    "photos/48.jpg",
    "ต้นไม้ใหญ่ริมทาง มองเห็นแนวสายด้านข้าง"
  ],
  [
    "photos/47.jpg",
    "ต้นไม้ใหญ่กลางพื้นที่โล่งใกล้แนวสาย"
  ],
  [
    "photos/46.jpg",
    "ภาพหัวเสาและอุปกรณ์บนแนวสายไฟฟ้า"
  ],
  [
    "photos/45.jpg",
    "ภาพหัวเสาและสายไฟฟ้าหลายแนว"
  ],
  [
    "photos/44.jpg",
    "เรือนยอดต้นไม้อยู่ข้างแนวสาย"
  ],
  [
    "photos/43.jpg",
    "พุ่มไม้และต้นไม้ขึ้นข้างเสาไฟฟ้า"
  ],
  [
    "photos/42.jpg",
    "แนวต้นไม้สองฝั่งทางและเสาไฟฟ้าด้านหน้า"
  ],
  [
    "photos/39.jpg",
    "ต้นไม้สูงอยู่ข้างเสาและแนวสาย"
  ],
  [
    "photos/38.jpg",
    "เสาไฟฟ้าอยู่ชิดแนวต้นไม้ริมทาง"
  ],
  [
    "photos/37.jpg",
    "แนวต้นไม้หนาแน่นสองฝั่งทาง"
  ],
  [
    "photos/36.jpg",
    "เสาและคอนอยู่หน้าเรือนยอดไม้"
  ],
  [
    "photos/35.jpg",
    "เสาไฟฟ้าอยู่ระหว่างเรือนยอดไม้สองฝั่ง"
  ],
  [
    "photos/34.jpg",
    "แนวสายผ่านด้านข้างเรือนยอดไม้"
  ],
  [
    "photos/33.jpg",
    "แนวต้นไม้หนาแน่นบริเวณป้ายริมทาง"
  ],
  [
    "photos/32.jpg",
    "กิ่งไม้ยื่นเข้ามาบริเวณแนวสาย"
  ],
  [
    "photos/31.jpg",
    "เรือนยอดไม้ขนาดใหญ่อยู่ข้างแนวสาย"
  ],
  [
    "photos/30.jpg",
    "ต้นไม้สูงอยู่ด้านข้างแนวสาย"
  ],
  [
    "photos/29.jpg",
    "เรือนยอดไม้สูงอยู่เหนือระดับคอนเสาในภาพ"
  ],
  [
    "photos/28.jpg",
    "เสาพร้อมอุปกรณ์ไฟฟ้าและต้นไม้ข้างแนวสาย"
  ],
  [
    "photos/27.jpg",
    "ต้นไม้ทรงพุ่มกว้างอยู่ข้างแนวสาย"
  ],
  [
    "photos/26.jpg",
    "กลุ่มต้นไม้สูงบริเวณเสาไฟฟ้า"
  ],
  [
    "photos/25.jpg",
    "ต้นไม้สูงอยู่ชิดเสาไฟฟ้า"
  ],
  [
    "photos/24.jpg",
    "ต้นไม้สูงเป็นกลุ่มอยู่ด้านข้างแนวสาย"
  ],
  [
    "photos/23.jpg",
    "แนวต้นไม้หนาแน่นตามขอบถนน"
  ],
  [
    "photos/22.jpg",
    "กิ่งไม้ยื่นจากแนวป่าริมทาง"
  ],
  [
    "photos/21.jpg",
    "มองเห็นแนวเสาไฟฟ้าหลังกลุ่มพุ่มไม้"
  ],
  [
    "photos/20.jpg",
    "แนวต้นไม้สูงอยู่ด้านหลังเสาไฟฟ้า"
  ],
  [
    "photos/19.jpg",
    "ภาพสายเหนือศีรษะและเรือนยอดไม้ด้านข้าง"
  ],
  [
    "photos/18.jpg",
    "ต้นไม้สูงและพืชใบกว้างริมทาง"
  ],
  [
    "photos/17.jpg",
    "แนวต้นไม้และพืชใบกว้างข้างทาง"
  ],
  [
    "photos/16.jpg",
    "เสาไฟฟ้าอยู่หน้าเรือนยอดต้นไม้ใหญ่"
  ],
  [
    "photos/15.jpg",
    "แนวสายผ่านข้างลำต้นและเรือนยอดต้นไม้"
  ],
  [
    "photos/14.jpg",
    "แนวต้นไม้ขึ้นต่อเนื่องตามไหล่ทาง"
  ],
  [
    "photos/13.jpg",
    "ต้นไม้และพุ่มไม้ขึ้นตามแนวถนน"
  ],
  [
    "photos/12.jpg",
    "เรือนยอดไม้แผ่เหนือพื้นที่ริมทาง"
  ],
  [
    "photos/11.jpg",
    "ต้นไม้และพุ่มไม้ด้านล่างแนวสายหลายเส้น"
  ],
  [
    "photos/10.jpg",
    "กลุ่มต้นไม้สูงอยู่ในบริเวณริมทาง"
  ],
  [
    "photos/9.jpg",
    "กิ่งของต้นไม้ใหญ่แผ่เหนือกลุ่มพุ่มไม้"
  ],
  [
    "photos/8.jpg",
    "ต้นไม้หนาแน่นข้างแนวสายและเสาไฟฟ้า"
  ],
  [
    "photos/7.jpg",
    "เรือนยอดไม้ชิดบริเวณคอนเสาในภาพ"
  ],
  [
    "photos/6.jpg",
    "แนวต้นไม้หนาแน่นข้างแนวสาย"
  ],
  [
    "photos/5.jpg",
    "ต้นไม้ขึ้นเรียงข้างแนวเสาไฟฟ้า"
  ],
  [
    "photos/4.jpg",
    "เสาและอุปกรณ์อยู่หน้าเรือนยอดไม้"
  ],
  [
    "photos/3.jpg",
    "แนวต้นไม้สูงล้อมเสาไฟฟ้าในภาพ"
  ],
  [
    "photos/2.jpg",
    "แนวต้นไม้สองข้างถนนดิน"
  ],
  [
    "photos/1.jpg",
    "กลุ่มต้นไม้และพืชใบกว้างอยู่ใต้แนวสายที่เห็นในภาพ"
  ]
]);
const node = (tag, value) => {
  const element = document.createElement(tag);
  if (value != null) element.textContent = value;
  return element;
};
const polePhoto = photos.find(photo => photo.file === 'photos/50.jpg');
const insulatorPhoto = photos.find(photo => photo.file === 'photos/49.jpg');
const isRecloserPole = photo => photo === polePhoto || photo === insulatorPhoto;
const photoPosition = photo => photo === insulatorPhoto ? polePhoto.position : photo.position;
const coordinates = photo => photoPosition(photo).map(value => value.toFixed(6)).join(', ');
const mapsLink = photo => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(coordinates(photo));
function stepPhoto(offset) {
  const index = photos.indexOf(activePhoto);
  const next = photos[index + offset];
  if (index >= 0 && next) photoDetail(next);
}
function photoDetail(photo, zoom = true) {
  activePhoto = photo;
  const index = photos.indexOf(photo);
  const previous = byId('previous-photo');
  const next = byId('next-photo');
  previous.disabled = index === 0;
  next.disabled = index === photos.length - 1;
  byId('photo-position').textContent = (index + 1) + ' / ' + photos.length;
  byId('photo-navigation').hidden = false;
  if (document.activeElement === previous && previous.disabled) next.focus();
  if (document.activeElement === next && next.disabled) previous.focus();
  const position = photoPosition(photo);
  if (map && position.length && zoom) map.setView(position, Math.max(map.getZoom(), 17));
  const image = node('img');
  image.src = photo.file;
  image.alt = 'ภาพลาดตระเวนที่ ' + photo.id;
  detailBody.replaceChildren(node('h2', 'รูปที่ ' + photo.id), image,
    node('p', position.length ? coordinates(photo) : 'รูปนี้ไม่มีพิกัดกำกับ'));
  if (isRecloserPole(photo)) {
    const isInsert = photo === insulatorPhoto;
    detailBody.append(node('h3', 'จุดที่ 1 · ต้นหลังรีโคลสเซอร์'),
      node('p', 'สิ่งที่ตรวจพบ: ลูกถ้วยก้านตรงรั่ว (Leak)'),
      node('p', isInsert ? 'ภาพแทรกแสดงลูกถ้วย ใช้พิกัดเดียวกับรูปที่ 1' : 'รูปที่ 2 เป็นภาพแทรกของลูกถ้วยที่จุดนี้'));
    appendSurveyFields([
      ['เวลาประมาณการต่อเหตุ', estimatedTime(insulatorSurvey)],
      ['การเข้าถึงหน้างาน', vehicleAccess(insulatorSurvey)],
      ['หมายเหตุ', insulatorSurvey?.[6]]
    ]);
    const related = node('button', isInsert ? 'กลับไปดูรูปที่ 1' : 'ดูภาพแทรกลูกถ้วย (รูปที่ 2)');
    related.onclick = () => {
      photoDetail(isInsert ? polePhoto : insulatorPhoto);
      byId('next-photo').focus();
    };
    detailBody.append(related);
  } else {
  detailBody.append(node('h3', 'สิ่งที่เห็นจากภาพ'),
    node('p', photoObservations.get(photo.file) || 'ยังไม่มีรายละเอียดจากภาพ'),
    node('small', 'สาเหตุและรายการในแบบฟอร์มยังไม่ได้ยืนยันกับภาพนี้'));
  }
  if (position.length) {
    const link = node('a', 'เปิดตำแหน่งใน Google Maps');
    link.href = mapsLink(photo);
    link.target = '_blank';
    link.rel = 'noopener';
    detailBody.append(link);
  }
  detailBody.append(node('p', photo.source));
  highlightPin();
}
function appendSurveyFields(fields) {
  for (const [label, value] of fields) {
    if (!value) continue;
    const line = node('p');
    line.append(node('strong', label + ' '), document.createTextNode(value));
    detailBody.append(line);
  }
}
function rowDetail(row) {
  activePhoto = null;
  byId('photo-navigation').hidden = true;
  detailBody.replaceChildren(node('h2', 'รายการสำรวจที่ ' + row[0]));
  appendSurveyFields([
    ['บริเวณ', row[1]],
    ['คำบรรยาย', [row[2], row[6]].filter(Boolean).join(' · ')],
    ['เวลาประมาณการต่อเหตุ', estimatedTime(row)],
    ['การเข้าถึงหน้างาน', vehicleAccess(row)],
    ['ความรุนแรง', row[4]],
    ['ทีมงาน', row[7]]
  ]);
  highlightPin();
}
function highlightPin() {
  const selected = activePhoto === insulatorPhoto ? polePhoto : activePhoto;
  markers?.eachLayer(marker => {
    marker.getElement()?.classList.toggle('pin-selected', marker.options.title === 'รูปที่ ' + selected?.id);
  });
}
const fit = () => {
  if (map) map.fitBounds(located.map(photo => photo.position), {padding:[35,35], maxZoom:17});
};
function render() {
  const query = search.value.trim().toLowerCase();
  const isPhoto = mode === 'photos';
  const items = (isPhoto ? photos : rows).filter(item => {
    const value = isPhoto ? ['รูปที่ ' + item.id, coordinates(item), item.source, isRecloserPole(item) ? 'ต้นหลังรีโคลสเซอร์ ลูกถ้วยรั่ว Leak' : (item.position.length ? '' : 'ไม่มีพิกัด')] : item;
    return value.join(' ').toLowerCase().includes(query);
  });
  byId('summary').textContent = isPhoto
    ? `แสดง ${items.length} จาก ${photos.length} รูป · ${located.length} จุดบนแผนที่`
    : `แสดง ${items.length} จาก ${rows.length} รายการ · ตามแบบฟอร์มต้นฉบับ`;
  byId('results').replaceChildren(...items.map(item => {
    const card = node('button');
    card.className = 'entry';
    const text = node('span', isPhoto ? 'รูปที่ ' + item.id : item[0] + ' · ' + item[2]);
    text.append(node('small', isPhoto ? (item === insulatorPhoto ? 'ภาพแทรกของจุดที่ 1 · ' + coordinates(item) : coordinates(item) || 'ไม่มีพิกัด') : [item[1], estimatedTime(item), vehicleAccess(item)].filter(Boolean).join(' · ')));
    if (isPhoto) {
      const image = node('img');
      image.src = item.file;
      image.alt = '';
      image.loading = 'lazy';
      card.append(image);
    }
    card.append(text);
    card.onclick = () => {
      if (isPhoto) photoDetail(item);
      else rowDetail(item);
      browse.open = false;
      byId('detail-body').querySelector('h2').scrollIntoView({block:'nearest'});
    };
    return card;
  }));
  if (!items.length) byId('results').append(node('p','ไม่พบรายการ'));
  if (markers) {
    markers.clearLayers();
    const visiblePins = isPhoto
      ? located.filter(photo => items.includes(photo) || (photo === polePhoto && items.includes(insulatorPhoto)))
      : located;
    visiblePins.forEach(photo => {
      L.marker(photo.position,{title:'รูปที่ '+photo.id, icon:L.divIcon({
        className:'pin',html:'<span><b>' + photo.id + '</b></span>',iconSize:[34,40],iconAnchor:[17,38]
      })}).on('click',()=>photoDetail(photo)).addTo(markers);
    });
    highlightPin();
  }
}
function switchTab(next) {
  mode = next;
  const isPhoto = mode === 'photos';
  photoTab.setAttribute('aria-pressed',isPhoto);
  rowTab.setAttribute('aria-pressed',!isPhoto);
  search.value = '';
  search.placeholder = isPhoto ? 'ค้นหาเลขรูปหรือพิกัด' : 'ค้นหาลำดับ บริเวณ หรือสิ่งที่ตรวจพบ';
  render();
}
photoTab.onclick = () => switchTab('photos');
rowTab.onclick = () => switchTab('rows');
search.oninput = render;
byId('fit').onclick = fit;
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
  const imagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    {maxZoom:20,maxNativeZoom:18,attribution:'Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community'}).addTo(map);
  const streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    {maxZoom:20,maxNativeZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'});
  L.control.layers({'ภาพดาวเทียม Esri':imagery,'แผนที่ถนน':streets},null,{position:'topright'}).addTo(map);
  L.control.scale({imperial:false}).addTo(map);
  markers = L.layerGroup().addTo(map);
  fit();
} else {
  byId('map-status').textContent = 'โหลดแผนที่ไม่สำเร็จ ยังเปิดพิกัดแต่ละรูปใน Google Maps ได้จากรายการ';
  byId('fit').disabled = true;
}
render();
photoDetail(photos[0], false);
