/**
 * ServiceInteractionState - Service building interaction state
 *
 * Implements Zangband-style service building flow:
 * 1. Browse mode (default): See available services with hotkeys
 * 2. Item-requiring services enter item_select mode
 * 3. ESC in browse mode exits building, ESC in submode returns to browse
 */

import type { State } from '../State';
import type { GameAction } from '../Actions';
import type { GameFSM } from '../GameFSM';
import { PlayingState } from './PlayingState';
import type { Store } from '@/core/systems/Store';
import type { ServiceDef } from '@/core/data/services';
import { ServiceSystem, type ServiceContext } from '@/core/systems/ServiceSystem';
import { getGameStore } from '@/core/store/gameStore';

export type ServiceMode = 'browse' | 'item_select' | 'confirm';

export class ServiceInteractionState implements State {
  readonly name = 'serviceInteraction';
  readonly buildingKey: string;
  private _mode: ServiceMode = 'browse';
  private _building: Store | undefined;
  private _selectedServiceKey: string | undefined;
  private _validItemIndices: number[] = [];

  constructor(buildingKey: string) {
    this.buildingKey = buildingKey;
  }

  get mode(): ServiceMode {
    return this._mode;
  }

  get building(): Store | undefined {
    return this._building;
  }

  onEnter(fsm: GameFSM): void {
    this._building = fsm.storeManager.getStore(this.buildingKey);
    if (this._building) {
      fsm.addMessage(`Welcome to ${this._building.definition.name}!`, 'info');
      this.updateBuildingState(fsm);
    }
  }

  onExit(_fsm: GameFSM): void {
    this._building = undefined;
    getGameStore().setServiceBuilding(null);
  }

  handleAction(fsm: GameFSM, action: GameAction): boolean {
    switch (action.type) {
      case 'exitBuilding':
        // ESC behavior depends on mode
        if (this._mode === 'browse') {
          this.handleExit(fsm);
        } else {
          // Return to browse mode
          this._mode = 'browse';
          this._selectedServiceKey = undefined;
          this._validItemIndices = [];
          fsm.addMessage('Cancelled.', 'info');
          this.updateBuildingState(fsm);
        }
        return true;

      case 'selectServiceItem':
        return this.handleSelectItem(fsm, action.itemIndex);

      case 'letterSelect':
        return this.handleLetterSelect(fsm, action.letter);

      default:
        return false;
    }
  }

  private handleServiceCommand(fsm: GameFSM, serviceKey: string): boolean {
    if (!this._building) return false;

    const store = getGameStore();
    const player = store.player;
    if (!player) return false;

    // Find the service
    const service = this._building.services.find(s => s.key === serviceKey);
    if (!service) {
      fsm.addMessage('Unknown service.', 'info');
      return true;
    }

    // Check if player can afford it
    const cost = ServiceSystem.getServiceCost(service.baseCost, player.stats.chr);
    if (player.gold < cost) {
      fsm.addMessage(`You can't afford that! (${cost} gold)`, 'info');
      return true;
    }

    // Check service availability
    const context = this.createServiceContext(player);
    if (!ServiceSystem.canUseService(player, service, context)) {
      if (service.nightOnly) {
        fsm.addMessage('This service is only available at night.', 'info');
      } else {
        fsm.addMessage('You cannot use this service right now.', 'info');
      }
      return true;
    }

    // If service requires item, enter item_select mode
    if (service.requiresItem && service.itemFilter) {
      const validIndices = this.getValidItemIndices(player.inventory, service.itemFilter);
      if (validIndices.length === 0) {
        fsm.addMessage(`You have no items that can be used for this service.`, 'info');
        return true;
      }

      this._mode = 'item_select';
      this._selectedServiceKey = serviceKey;
      this._validItemIndices = validIndices;
      fsm.addMessage(`Select an item (a-${String.fromCharCode('a'.charCodeAt(0) + validIndices.length - 1)}):`, 'info');
      this.updateBuildingState(fsm);
      return true;
    }

    // Execute immediate service
    this.executeService(fsm, service, undefined);
    return true;
  }

  private handleSelectItem(fsm: GameFSM, itemIndex: number): boolean {
    if (this._mode !== 'item_select' || !this._selectedServiceKey || !this._building) {
      return false;
    }

    // Check if the index is valid
    if (!this._validItemIndices.includes(itemIndex)) {
      fsm.addMessage('Invalid selection.', 'info');
      return true;
    }

    // Find the service and execute
    const service = this._building.services.find(s => s.key === this._selectedServiceKey);
    if (service) {
      this.executeService(fsm, service, itemIndex);
    }

    return true;
  }

  private handleLetterSelect(fsm: GameFSM, letter: string): boolean {
    // Convert letter to index
    const index = letter.toLowerCase().charCodeAt(0) - 'a'.charCodeAt(0);
    if (index < 0 || index > 25) {
      return true;
    }

    if (this._mode === 'browse') {
      // In browse mode, letter selects a service
      if (!this._building) return true;
      const services = this._building.services;
      if (index < services.length) {
        return this.handleServiceCommand(fsm, services[index].key);
      }
      return true;
    }

    if (this._mode === 'item_select') {
      // Map the selection index to actual inventory index
      if (index < this._validItemIndices.length) {
        const actualIndex = this._validItemIndices[index];
        return this.handleSelectItem(fsm, actualIndex);
      }
    }

    return true;
  }

  private executeService(fsm: GameFSM, service: ServiceDef, itemIndex: number | undefined): void {
    const store = getGameStore();
    const player = store.player;
    if (!player) return;

    const context = this.createServiceContext(player, itemIndex);
    const result = ServiceSystem.executeService(player, service, context);

    fsm.addMessage(result.message, result.success ? 'info' : 'danger');

    // Return to browse mode after service
    this._mode = 'browse';
    this._selectedServiceKey = undefined;
    this._validItemIndices = [];
    this.updateBuildingState(fsm);
  }

  private handleExit(fsm: GameFSM): void {
    fsm.addMessage('You leave the building.', 'info');
    fsm.transition(new PlayingState());
  }

  private getValidItemIndices(inventory: any[], itemFilter: string[]): number[] {
    const indices: number[] = [];
    for (let i = 0; i < inventory.length; i++) {
      const item = inventory[i];
      const itemType = item?.generated?.baseItem?.type;
      if (itemType && itemFilter.includes(itemType)) {
        indices.push(i);
      }
    }
    return indices;
  }

  private createServiceContext(_player: any, itemIndex?: number): ServiceContext {
    const ctx: ServiceContext = {
      isNight: false, // TODO: Implement day/night cycle
    };
    if (itemIndex !== undefined) {
      ctx.selectedItemIndex = itemIndex;
    }
    return ctx;
  }

  private updateBuildingState(_fsm: GameFSM): void {
    if (!this._building) return;

    const store = getGameStore();
    const player = store.player;
    if (!player) return;

    const context = this.createServiceContext(player);

    // Build service list with availability
    const services = this._building.services.map(service => {
      const cost = ServiceSystem.getServiceCost(service.baseCost, player.stats.chr);
      let available = true;
      let reason: string | undefined;

      // Check gold
      if (player.gold < cost) {
        available = false;
        reason = 'Not enough gold';
      }

      // Check night-only
      if (service.nightOnly && !context.isNight) {
        available = false;
        reason = 'Only available at night';
      }

      // Check canUseService for other conditions
      if (available && !ServiceSystem.canUseService(player, service, context)) {
        available = false;
        reason = 'Cannot use this service';
      }

      const result: {
        key: string;
        name: string;
        description: string;
        cost: number;
        available: boolean;
        reason?: string;
      } = {
        key: service.key,
        name: service.name,
        description: service.description,
        cost,
        available,
      };
      if (reason) {
        result.reason = reason;
      }
      return result;
    });

    const serviceBuildingState: Parameters<typeof store.setServiceBuilding>[0] = {
      buildingKey: this.buildingKey,
      mode: this._mode,
      buildingName: this._building.definition.name,
      services,
    };
    if (this._selectedServiceKey) {
      serviceBuildingState!.selectedServiceKey = this._selectedServiceKey;
    }
    if (this._mode === 'item_select') {
      serviceBuildingState!.itemPrompt = 'Select an item:';
      serviceBuildingState!.validItemIndices = this._validItemIndices;
    }
    store.setServiceBuilding(serviceBuildingState);
  }
}
