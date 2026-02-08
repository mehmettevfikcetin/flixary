import axios from 'axios';

const API_KEY = import.meta.env.VITE_TMDB_API_KEY;

if (!API_KEY) {
  console.error('TMDB API key is missing! Please add VITE_TMDB_API_KEY to your .env file.');
}

/**
 * TMDB API'den hem tr-TR hem en-US sonuçları çeker,
 * İngilizce başlıkları (en_title / en_name) her item'a ekler.
 * Böylece Japonca/Korece animeler için İngilizce başlık kullanılabilir.
 */
export const fetchWithEnglishTitles = async (url, params = {}) => {
  const [trRes, enRes] = await Promise.all([
    axios.get(url, { params: { ...params, api_key: API_KEY, language: 'tr-TR' } }),
    axios.get(url, { params: { ...params, api_key: API_KEY, language: 'en-US' } })
  ]);

  // en-US sonuçlarından id → başlık haritası oluştur
  const enMap = {};
  if (enRes.data.results) {
    enRes.data.results.forEach(item => {
      enMap[item.id] = {
        en_title: item.title,       // filmler için
        en_name: item.name          // diziler için
      };
    });
  }

  // tr-TR sonuçlarına İngilizce başlıkları enjekte et
  const mergedResults = trRes.data.results.map(item => ({
    ...item,
    en_title: enMap[item.id]?.en_title || null,
    en_name: enMap[item.id]?.en_name || null
  }));

  return {
    ...trRes.data,
    results: mergedResults
  };
};

/**
 * Tek bir medya detayı için İngilizce başlığı çeker.
 * (recommendations / similar listeler için)
 */
export const fetchDetailWithEnglishTitle = async (url, params = {}) => {
  const [trRes, enRes] = await Promise.all([
    axios.get(url, { params: { ...params, api_key: API_KEY, language: 'tr-TR' } }),
    axios.get(url, { params: { ...params, api_key: API_KEY, language: 'en-US' } })
  ]);

  return {
    trData: trRes.data,
    enData: enRes.data
  };
};

/**
 * Başlık seçim yardımcısı: İngilizce > Türkçe > Orijinal
 * Latin harfi olmayan isimleri engeller.
 */
const isLatin = (str) => /^[\u0000-\u024F\u1E00-\u1EFF\u2C60-\u2C7F\s\d\W]+$/.test(str);

export const getTitle = (item, mediaType) => {
  const enTitle = mediaType === 'movie' ? item.en_title : item.en_name;
  const trTitle = mediaType === 'movie' ? item.title : item.name;
  const origTitle = mediaType === 'movie' ? item.original_title : item.original_name;

  // 1. İngilizce başlık varsa ve Latin ise onu kullan
  if (enTitle && isLatin(enTitle)) return enTitle;
  // 2. Orijinal başlık Latin ise onu kullan
  if (origTitle && isLatin(origTitle)) return origTitle;
  // 3. Türkçe başlık Latin ise onu kullan
  if (trTitle && isLatin(trTitle)) return trTitle;
  // 4. Son çare: ne varsa
  return enTitle || trTitle || origTitle;
};

export { API_KEY };
