import { describe, it, expect } from 'vitest';
import {
  getShiurId,
  getShiurUrl,
  getSefariaUrl,
  getSefariaApiUrl,
  getShiurAudioUrl,
  getShiurVideoUrl,
  getShiurThumbnailUrl,
  shiurMapping,
  hebrewNames,
  kolHalashonBookIds,
} from '../../src/data/shiurMapping.js';

describe('getShiurId', () => {
  it('should return shiur ID for mapped chapter (Joshua 1)', () => {
    const id = getShiurId('Joshua', 1);
    expect(id).toBe(31470133);
  });

  it('should return shiur ID for Isaiah 1', () => {
    const id = getShiurId('Isaiah', 1);
    expect(id).toBe(32996326);
  });

  it('should return shiur ID for Psalms 1', () => {
    const id = getShiurId('Psalms', 1);
    expect(id).toBeTruthy();
    expect(typeof id).toBe('number');
  });

  it('should return null for unmapped chapter', () => {
    const id = getShiurId('Joshua', 999);
    expect(id).toBeNull();
  });

  it('should return null for invalid book name', () => {
    const id = getShiurId('InvalidBook', 1);
    expect(id).toBeNull();
  });

  it('should return null for chapter 0', () => {
    const id = getShiurId('Joshua', 0);
    expect(id).toBeNull();
  });
});

describe('getShiurUrl', () => {
  it('should return playShiur URL for mapped chapter', () => {
    const url = getShiurUrl('Joshua', 1);
    expect(url).toContain('playShiur');
    expect(url).toContain('31470133');
  });

  it('should return filtered rav page for unmapped chapter with known book', () => {
    const url = getShiurUrl('Joshua', 999);
    expect(url).toContain('kolhalashon.com');
    expect(url).toContain('ravs/9991');
  });

  it('should handle book names with spaces (Song of Songs)', () => {
    const url = getShiurUrl('Song of Songs', 1);
    expect(url).toContain('kolhalashon.com');
  });

  it('should handle Roman numerals in book names (II Kings)', () => {
    const url = getShiurUrl('II Kings', 1);
    expect(url).toContain('kolhalashon.com');
  });
});

describe('getSefariaUrl', () => {
  it('should replace spaces with underscores in book name', () => {
    const url = getSefariaUrl('Song of Songs', 3);
    expect(url).toBe('https://www.sefaria.org/Song_of_Songs.3');
  });

  it('should format URL correctly for Joshua 1', () => {
    const url = getSefariaUrl('Joshua', 1);
    expect(url).toBe('https://www.sefaria.org/Joshua.1');
  });

  it('should format URL correctly for II Samuel 5', () => {
    const url = getSefariaUrl('II Samuel', 5);
    expect(url).toBe('https://www.sefaria.org/II_Samuel.5');
  });
});

describe('getSefariaApiUrl', () => {
  it('should include context=0&pad=0 parameters', () => {
    const url = getSefariaApiUrl('Joshua', 1);
    expect(url).toContain('context=0');
    expect(url).toContain('pad=0');
  });

  it('should format book name correctly', () => {
    const url = getSefariaApiUrl('Song of Songs', 1);
    expect(url).toBe('https://www.sefaria.org/api/texts/Song_of_Songs.1?context=0&pad=0');
  });
});

describe('getShiurAudioUrl', () => {
  it('should return GetMp3FileToPlay endpoint with shiur ID', () => {
    const url = getShiurAudioUrl(31470133);
    expect(url).toBe('https://www2.kolhalashon.com/api/files/GetMp3FileToPlay/31470133');
  });

  it('should return null for null shiurId', () => {
    expect(getShiurAudioUrl(null)).toBeNull();
  });

  it('should return null for undefined shiurId', () => {
    expect(getShiurAudioUrl(undefined)).toBeNull();
  });
});

describe('getShiurVideoUrl', () => {
  it('should return HLS playlist URL with correct prefix', () => {
    const url = getShiurVideoUrl(31470133);
    expect(url).toContain('media2.kolhalashon.com');
    expect(url).toContain('playlist.m3u8');
    expect(url).toContain('31470');
  });

  it('should extract first 5 digits for prefix directory', () => {
    const url = getShiurVideoUrl(31470133);
    expect(url).toContain('/31470/');
  });

  it('should return null for null shiurId', () => {
    expect(getShiurVideoUrl(null)).toBeNull();
  });

  it('should return null for undefined shiurId', () => {
    expect(getShiurVideoUrl(undefined)).toBeNull();
  });
});

describe('getShiurThumbnailUrl', () => {
  it('should return thumbnail URL with correct path structure', () => {
    const url = getShiurThumbnailUrl(31470133);
    expect(url).toContain('VideoThumbNails');
    expect(url).toContain('31470');
    expect(url).toContain('31470133.jpg');
  });

  it('should return null for null shiurId', () => {
    expect(getShiurThumbnailUrl(null)).toBeNull();
  });

  it('should return null for undefined shiurId', () => {
    expect(getShiurThumbnailUrl(undefined)).toBeNull();
  });
});

describe('Data Integrity', () => {
  it('should have mappings for multiple books', () => {
    const books = Object.keys(shiurMapping);
    expect(books.length).toBeGreaterThan(10);
  });

  it('should have Joshua with 24 chapters', () => {
    const joshuaChapters = Object.keys(shiurMapping['Joshua']);
    expect(joshuaChapters.length).toBe(24);
  });

  it('should have hebrewNames for common books', () => {
    expect(hebrewNames['Joshua']).toBe('יהושע');
    expect(hebrewNames['Psalms']).toBe('תהלים');
    expect(hebrewNames['Isaiah']).toBe('ישעיהו');
  });

  it('should have kolHalashonBookIds for common books', () => {
    expect(kolHalashonBookIds['Joshua']).toBeTruthy();
    expect(kolHalashonBookIds['Psalms']).toBeTruthy();
  });

  it('should have all shiur IDs as numbers', () => {
    for (const chapters of Object.values(shiurMapping)) {
      for (const shiurId of Object.values(chapters)) {
        expect(typeof shiurId).toBe('number');
        expect(shiurId).toBeGreaterThan(0);
      }
    }
  });
});
