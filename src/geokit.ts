import {LatLngLiteral} from './definitions';
import {
  BASE32,
  base32,
  decimalChunk,
  getBit,
  toRad,
  validateCoordinates,
} from './helpers';

/**
 * A class for the Geokit.
 */
export class Geokit {
  /**
   * Get the distance between two coordinates.
   * @param start Starting coordinates.
   * @param end Ending coordinates.
   * @param unit Unit of distance returned, defaults to Km.
   * @returns The distance between two coordinates.
   */
  static distance(
    start: LatLngLiteral,
    end: LatLngLiteral,
    unit = 'km'
  ): number {
    const startValid: Error | void = validateCoordinates(start);
    if (startValid instanceof Error) {
      throw new Error('Start coordinates: ' + startValid.message);
    }
    const endValid: Error | void = validateCoordinates(end);
    if (endValid instanceof Error) {
      throw new Error('End coordinates: ' + endValid.message);
    }

    const radius: number = unit.toLowerCase() === 'miles' ? 3963 : 6371;
    const dLat: number = toRad(end.lat - start.lat);
    const dLon: number = toRad(end.lng - start.lng);
    const lat1: number = toRad(start.lat);
    const lat2: number = toRad(end.lat);
    const a: number =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    const c: number = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radius * c;
  }

  /**
   * Get the geohash of a point.
   * @param coordinates Coordinates to hash.
   * @param precision Precision of hash desired, defaults to 10.
   * @returns Geohash of point.
   */
  static hash(coordinates: LatLngLiteral, precision = 10): string {
    const valid: Error | void = validateCoordinates(coordinates);
    if (valid instanceof Error) {
      throw valid;
    }

    let hash = '';
    const latRng: number[] = [-90, 90];
    const lngRng: number[] = [-180, 180];

    while (hash.length < precision) {
      let temp = 0;
      for (let i = 0; i < 5; i++) {
        const even: boolean = (hash.length * 5 + i) % 2 === 0;
        const coord: number = even ? coordinates.lng : coordinates.lat;
        const range: number[] = even ? lngRng : latRng;
        const middle: number = (range[0] + range[1]) / 2;
        temp = (temp << 1) + getBit(coord, range);
        coord > middle ? (range[0] = middle) : (range[1] = middle);
      }
      hash += base32(temp);
    }

    return hash;
  }

  /**
   * Decodes a Geohash into a LatLngLiteral.
   * @param hash Geohash string.
   * @returns Coordinates to hash.
   */
  static decodeHash(hash: string): LatLngLiteral {
    this.validateHash(hash);
    let even = true;
    const latRng: number[] = [-90, 90];
    const lngRng: number[] = [-180, 180];
    const hashChars: string[] = hash.split('');

    while (hashChars.length) {
      const chunk: number = decimalChunk(hashChars.shift() as string);
      for (let i = 0; i < 5; i++) {
        const mask = [16, 8, 4, 2, 1][i];
        const range: number[] = even ? lngRng : latRng;
        const middle: number = (range[0] + range[1]) / 2;
        range[chunk & mask ? 0 : 1] = middle;
        even = !even;
      }
    }

    return {lat: (latRng[0] + latRng[1]) / 2, lng: (lngRng[0] + lngRng[1]) / 2};
  }

  /**
   * Validates a Geohash and returns a boolean if valid, or throws an error if invalid.
   *
   * @param geohash The geohash to be validated.
   * @param flag Tells function to send up boolean if valid instead of throwing an error.
   * @returns Boolean if Geohash is valid.
   */
  static validateHash(geohash: string, flag = false): boolean {
    let error;

    if (typeof geohash !== 'string') {
      error = 'geohash must be a string';
    } else if (geohash.length === 0) {
      error = 'geohash cannot be the empty string';
    } else {
      for (const letter of geohash) {
        if (BASE32.indexOf(letter) === -1) {
          error = "geohash cannot contain '" + letter + "'";
        }
      }
    }

    if (typeof error !== 'undefined' && !flag) {
      throw new Error("Invalid geohash '" + geohash + "': " + error);
    } else {
      return !error;
    }
  }
}
