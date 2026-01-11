/**
 * Service type definitions tests
 */

import { describe, it, expect } from 'vitest';
import {
  ServiceType,
  type ServiceDef,
} from '@/core/data/services';

describe('ServiceTypes', () => {
  describe('ServiceType constants', () => {
    it('should define all service type constants', () => {
      expect(ServiceType.INN_EAT).toBe('inn_eat');
      expect(ServiceType.INN_REST).toBe('inn_rest');
      expect(ServiceType.HEALER_RESTORE).toBe('healer_restore');
      expect(ServiceType.LIBRARY_RESEARCH).toBe('library_research');
      expect(ServiceType.RECHARGE).toBe('recharge');
      expect(ServiceType.IDENTIFY_ALL).toBe('identify_all');
      expect(ServiceType.ENCHANT_WEAPON).toBe('enchant_weapon');
      expect(ServiceType.ENCHANT_ARMOR).toBe('enchant_armor');
      expect(ServiceType.QUEST_VIEW).toBe('quest_view');
    });

    it('should have 9 service types', () => {
      const typeCount = Object.keys(ServiceType).length;
      expect(typeCount).toBe(9);
    });
  });

  describe('ServiceDef interface', () => {
    it('should accept valid service definition', () => {
      const service: ServiceDef = {
        key: 'test_service',
        type: ServiceType.INN_EAT,
        name: 'Test Service',
        description: 'A test service',
        baseCost: 100,
        action: 'action:service_eat',
      };

      expect(service.key).toBe('test_service');
      expect(service.type).toBe(ServiceType.INN_EAT);
      expect(service.name).toBe('Test Service');
      expect(service.description).toBe('A test service');
      expect(service.baseCost).toBe(100);
      expect(service.action).toBe('action:service_eat');
    });

    it('should accept optional requiresItem field', () => {
      const service: ServiceDef = {
        key: 'recharge',
        type: ServiceType.RECHARGE,
        name: 'Recharge',
        description: 'Recharge an item',
        baseCost: 50,
        action: 'action:service_recharge',
        requiresItem: true,
      };

      expect(service.requiresItem).toBe(true);
    });

    it('should accept optional itemFilter field', () => {
      const service: ServiceDef = {
        key: 'recharge',
        type: ServiceType.RECHARGE,
        name: 'Recharge',
        description: 'Recharge an item',
        baseCost: 50,
        action: 'action:service_recharge',
        requiresItem: true,
        itemFilter: ['wand', 'staff', 'rod'],
      };

      expect(service.itemFilter).toEqual(['wand', 'staff', 'rod']);
    });

    it('should accept optional nightOnly field', () => {
      const service: ServiceDef = {
        key: 'rest',
        type: ServiceType.INN_REST,
        name: 'Rest',
        description: 'Rest overnight',
        baseCost: 50,
        action: 'action:service_rest',
        nightOnly: true,
      };

      expect(service.nightOnly).toBe(true);
    });
  });
});
