// Province centres are approximate map anchors, never incident coordinates.
export const provinces = [
  ['11', 'Aceh', 96.7, 4.3],
  ['12', 'Sumatera Utara', 99, 2.2],
  ['13', 'Sumatera Barat', 100.3, -0.7],
  ['14', 'Riau', 101.8, 0.6],
  ['15', 'Jambi', 103, -1.6],
  ['16', 'Sumatera Selatan', 104, -3.4],
  ['17', 'Bengkulu', 102.3, -3.8],
  ['18', 'Lampung', 105, -4.9],
  ['19', 'Kepulauan Bangka Belitung', 106.5, -2.8],
  ['21', 'Kepulauan Riau', 104.6, 1.1],
  ['31', 'DKI Jakarta', 106.85, -6.17],
  ['32', 'Jawa Barat', 107.6, -6.95],
  ['33', 'Jawa Tengah', 110, -7.2],
  ['34', 'DI Yogyakarta', 110.4, -7.85],
  ['35', 'Jawa Timur', 112.6, -7.6],
  ['36', 'Banten', 106.1, -6.4],
  ['51', 'Bali', 115.2, -8.35],
  ['52', 'Nusa Tenggara Barat', 117.2, -8.5],
  ['53', 'Nusa Tenggara Timur', 121.3, -8.65],
  ['61', 'Kalimantan Barat', 111, -0.2],
  ['62', 'Kalimantan Tengah', 113.5, -1.7],
  ['63', 'Kalimantan Selatan', 115.4, -3],
  ['64', 'Kalimantan Timur', 116.8, 0.3],
  ['65', 'Kalimantan Utara', 116.5, 3],
  ['71', 'Sulawesi Utara', 124.8, 1.1],
  ['72', 'Sulawesi Tengah', 121, -1],
  ['73', 'Sulawesi Selatan', 119.9, -4],
  ['74', 'Sulawesi Tenggara', 122.3, -4.1],
  ['75', 'Gorontalo', 123, 0.7],
  ['76', 'Sulawesi Barat', 119.3, -2.4],
  ['81', 'Maluku', 129, -3.5],
  ['82', 'Maluku Utara', 127.8, 0.7],
  ['91', 'Papua Barat', 133, -1.5],
  ['92', 'Papua Barat Daya', 131.5, -0.9],
  ['94', 'Papua', 139.8, -2.8],
  ['95', 'Papua Selatan', 139.3, -7],
  ['96', 'Papua Tengah', 136.5, -3.9],
  ['97', 'Papua Pegunungan', 139, -4.2],
].map(([id, name, lon, lat]) => ({
  id: String(id),
  name: String(name),
  lon: Number(lon),
  lat: Number(lat),
}));
export function provinceName(id?: string) {
  return provinces.find((p) => p.id === id)?.name || 'Lokasi belum dilengkapi';
}
export function validateLocation(provinceId: unknown, city: unknown) {
  if (typeof provinceId !== 'string' || !provinces.some((p) => p.id === provinceId))
    throw new Error('Pilih provinsi asal kejadian fraud.');
  if (typeof city !== 'string' || city.trim().length < 3 || city.length > 100)
    throw new Error('Isi kabupaten/kota asal kejadian (3–100 karakter).');
  return { provinceId, city: city.trim() };
}
