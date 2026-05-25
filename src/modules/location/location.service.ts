import { BadRequestException, Injectable } from '@nestjs/common';
import { haversineKm } from './utils/distance.util';

@Injectable()
export class LocationService {
  isValidLatLon(lat: number, lon: number): boolean {
    return (
      typeof lat === 'number' &&
      typeof lon === 'number' &&
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  }

  distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    if (!this.isValidLatLon(lat1, lon1) || !this.isValidLatLon(lat2, lon2)) {
      throw new BadRequestException('Invalid coordinates provided');
    }
    return haversineKm(lat1, lon1, lat2, lon2);
  }
}
