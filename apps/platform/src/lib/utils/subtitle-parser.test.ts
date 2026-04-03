import { describe, it, expect } from 'vitest';
import { parseVTT } from './subtitle-parser';

describe('subtitle-parser', () => {

  describe('parseVTT', () => {
    it('should parse a standard translated VTT file', () => {
      const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:04.000
Hola mundo!
Hello world!

2
00:00:05.000 --> 00:00:09.500
Esto es una prueba.
This is a test.
`;
      const result = parseVTT(vtt);
      expect(result).toHaveLength(2);
      expect(result[0].text).toBe('Hola mundo!');
      expect(result[0].translation).toBe('Hello world!');
      expect(result[0].start).toBe(1);
      expect(result[0].end).toBe(4);
      expect(result[0].words).toHaveLength(2);
      
      expect(result[1].text).toBe('Esto es una prueba.');
      expect(result[1].translation).toBe('This is a test.');
      expect(result[1].start).toBe(5);
      expect(result[1].end).toBe(9.5);
    });

    it('should currently drop subtitles without translations due to MIN_SUBTITLE_PARTS', () => {
      const vtt = `WEBVTT

00:00:01.000 --> 00:00:04.000
Solo español
`;
      const result = parseVTT(vtt);
      expect(result).toHaveLength(0); // Known issue/feature depending on design
    });
    
    it('should parse timestamps accurately over an hour', () => {
      const vtt = `WEBVTT

01:05:30.500 --> 01:05:32.000
Línea uno
Line one
`;
      const result = parseVTT(vtt);
      const expectedStart = 1 * 3600 + 5 * 60 + 30.5;
      const expectedEnd = 1 * 3600 + 5 * 60 + 32.0;

      expect(result[0].start).toBe(expectedStart);
      expect(result[0].end).toBe(expectedEnd);
    });
    
    it('should return empty array for invalid vtt strings', () => {
      const result = parseVTT("INVALID FORMAT");
      expect(result).toHaveLength(0);
    });
  });
});
