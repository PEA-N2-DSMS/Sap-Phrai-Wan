const {photos, rows} = patrolData;
const byId = id => document.getElementById(id);
const photoTab = byId('photo-tab');
const rowTab = byId('row-tab');
const search = byId('search');
const detail = byId('detail');
const detailBody = byId('detail-body');
const located = photos.filter(photo => photo.position.length);
const rowLabels = ['ลำดับ','บริเวณ','สิ่งที่ตรวจพบ','รถเข้าถึง','ความรุนแรง','เวลา','หมายเหตุ','ทีมงาน'];
let mode = 'photos';
let map;
let markers;
const node = (tag, value) => {
  const element = document.createElement(tag);
  if (value != null) element.textContent = value;
  return element;
};
const coordinates = photo => photo.position.map(value => value.toFixed(6)).join(', ');
const mapsLink = photo => 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(coordinates(photo));
function photoDetail(photo) {
  if (map && photo.position.length) map.setView(photo.position, Math.max(map.getZoom(), 17));
  const image = node('img');
  image.src = photo.file;
  image.alt = 'ภาพลาดตระเวนที่ ' + photo.id;
  detailBody.replaceChildren(node('h2', 'รูปที่ ' + photo.id), image,
    node('p', photo.position.length ? coordinates(photo) : 'รูปนี้ไม่มีพิกัดกำกับ'));
  if (photo.position.length) {
    const link = node('a', 'เปิดตำแหน่งใน Google Maps');
    link.href = mapsLink(photo);
    link.target = '_blank';
    link.rel = 'noopener';
    detailBody.append(link);
  }
  detailBody.append(node('p', photo.source));
  detail.showModal();
}
function rowDetail(row) {
  detailBody.replaceChildren(node('h2', 'รายการสำรวจที่ ' + row[0]));
  row.slice(1).forEach((value, index) => {
    if (!value) return;
    const line = node('p');
    line.append(node('strong', rowLabels[index + 1] + ' '), document.createTextNode(value));
    detailBody.append(line);
  });
  detail.showModal();
}
const fit = () => {
  if (map) map.fitBounds(located.map(photo => photo.position), {padding:[35,35], maxZoom:17});
};
function render() {
  const query = search.value.trim().toLowerCase();
  const isPhoto = mode === 'photos';
  const items = (isPhoto ? photos : rows).filter(item => {
    const value = isPhoto ? ['รูปที่ ' + item.id, coordinates(item), item.source, item.position.length ? '' : 'ไม่มีพิกัด'] : item;
    return value.join(' ').toLowerCase().includes(query);
  });
  byId('summary').textContent = isPhoto
    ? `แสดง ${items.length} จาก ${photos.length} รูป · มีพิกัด ${located.length} รูป`
    : `แสดง ${items.length} จาก ${rows.length} รายการ · ตามแบบฟอร์มต้นฉบับ`;
  byId('results').replaceChildren(...items.map(item => {
    const card = node('button');
    card.className = 'entry';
    const text = node('span', isPhoto ? 'รูปที่ ' + item.id : item[0] + ' · ' + item[2]);
    text.append(node('small', isPhoto ? coordinates(item) || 'ไม่มีพิกัด' : [item[1], item[4], item[5]].filter(Boolean).join(' · ')));
    if (isPhoto) {
      const image = node('img');
      image.src = item.file;
      image.alt = '';
      image.loading = 'lazy';
      card.append(image);
    }
    card.append(text);
    card.onclick = () => isPhoto ? photoDetail(item) : rowDetail(item);
    return card;
  }));
  if (!items.length) byId('results').append(node('p','ไม่พบรายการ'));
  if (markers) {
    markers.clearLayers();
    (isPhoto ? items.filter(photo => photo.position.length) : located).forEach(photo => {
      L.marker(photo.position,{title:'รูปที่ '+photo.id, icon:L.divIcon({
        className:'pin',html:String(photo.id),iconSize:[30,30],iconAnchor:[15,15]
      })}).on('click',()=>photoDetail(photo)).addTo(markers);
    });
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
byId('close').onclick = () => detail.close();
detail.addEventListener('click', event => { if (event.target === detail) detail.close(); });
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
