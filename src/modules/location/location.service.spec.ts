import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocationService],
    }).compile();

    service = module.get<LocationService>(LocationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('isValidLatLon', () => {
    it('should return true for valid latitude and longitude', () => {
      // Valid cases (e.g., Jakarta)
      expect(service.isValidLatLon(-6.2, 106.816666)).toBe(true);

      // Edge cases - boundaries
      expect(service.isValidLatLon(90, 180)).toBe(true);
      expect(service.isValidLatLon(-90, -180)).toBe(true);
      expect(service.isValidLatLon(0, 0)).toBe(true);
    });

    it('should return false for invalid latitude', () => {
      // Positive out of bounds
      expect(service.isValidLatLon(91, 100)).toBe(false);

      // Negative out of bounds
      expect(service.isValidLatLon(-91, 100)).toBe(false);
    });

    it('should return false for invalid longitude', () => {
      // Positive out of bounds
      expect(service.isValidLatLon(10, 181)).toBe(false);

      // Negative out of bounds
      expect(service.isValidLatLon(10, -181)).toBe(false);
    });

    it('should return false for both invalid latitude and longitude', () => {
      expect(service.isValidLatLon(91, 181)).toBe(false);
      expect(service.isValidLatLon(-100, -200)).toBe(false);
    });
  });

  describe('distanceKm', () => {
    it('should return 0 when comparing the exact same location', () => {
      const distance = service.distanceKm(-6.2, 106.816666, -6.2, 106.816666);
      expect(distance).toBe(0);
    });

    it('should calculate the correct distance between two cities (Jakarta to Bandung)', () => {
      // Jakarta: -6.2088, 106.8456
      // Bandung: -6.9175, 107.6191
      // Distance is roughly ~115-120 km
      const distance = service.distanceKm(-6.2088, 106.8456, -6.9175, 107.6191);

      expect(distance).toBeGreaterThan(110);
      expect(distance).toBeLessThan(125);
    });

    it('should calculate the correct distance between North and South Pole', () => {
      // Distance is roughly semi-circumference of earth ~ 20015 km (PI * 6371)
      const distance = service.distanceKm(90, 0, -90, 0);

      // Allow minor variation due to floating point and standard sphere radius
      const expectedDistance = Math.PI * 6371;
      expect(Math.abs(distance - expectedDistance)).toBeLessThan(1);
    });

    it('should throw BadRequestException when coordinates are invalid', () => {
      expect(() => service.distanceKm(91, 0, -90, 0)).toThrow();
      expect(() => service.distanceKm(90, 0, -90, 181)).toThrow();
    });
  });
});
