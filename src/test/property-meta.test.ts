import { describe, expect, it } from 'vitest';
import { isDuplicateSerial, isStoredVideoUrl, licenseWatch } from '@/durrat/lib/property-meta';

describe('listing number and license watch', () => {
  it('treats the same listing number on another property as a duplicate', () => {
    expect(isDuplicateSerial([{ id: 'a', serial_number: 12 }, { id: 'b', serial_number: 7 }], 12, 'b')).toBe(true);
    expect(isDuplicateSerial([{ id: 'a', serial_number: 12 }], 12, 'a')).toBe(false);
  });

  it('flags expired and soon licenses', () => {
    expect(licenseWatch('2020-01-01', new Date('2026-11-16T12:00:00'))).toBe('expired');
    expect(licenseWatch('2026-11-20', new Date('2026-11-16T12:00:00'))).toBe('soon');
    expect(licenseWatch('2027-01-01', new Date('2026-11-16T12:00:00'))).toBe('ok');
    expect(licenseWatch('')).toBe('none');
  });

  it('accepts only http video links for the player', () => {
    expect(isStoredVideoUrl('https://firebasestorage.googleapis.com/v0/b/x/o/v.mp4')).toBe(true);
    expect(isStoredVideoUrl('data:video/mp4;base64,AAAA')).toBe(false);
  });
});
