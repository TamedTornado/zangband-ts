/**
 * Game Actions - inputs to the FSM
 */

import type { Direction } from '../types';
import type { Sex } from '../data/characterCreation';
import type { Stats } from '../entities/Player';

/**
 * Action type constants - use these instead of string literals
 */
export const ActionType = {
  Move: 'move',
  Run: 'run',
  GoDownStairs: 'goDownStairs',
  GoUpStairs: 'goUpStairs',
  Pickup: 'pickup',
  TakeOff: 'takeOff',
  Rest: 'rest',
  Restart: 'restart',
  Wield: 'wield',
  Drop: 'drop',
  Quaff: 'quaff',
  Read: 'read',
  Eat: 'eat',
  Zap: 'zap',
  Cast: 'cast',
  Study: 'study',
  ToggleInventory: 'toggleInventory',
  ToggleEquipment: 'toggleEquipment',
  ToggleCharacter: 'toggleCharacter',
  Look: 'look',
  Target: 'target',
  MoveCursor: 'moveCursor',
  CycleTarget: 'cycleTarget',
  ConfirmTarget: 'confirmTarget',
  CancelTarget: 'cancelTarget',
  EnterTargetMode: 'enterTargetMode',
  SelectTargetItem: 'selectTargetItem',
  SelectTargetSymbol: 'selectTargetSymbol',
  SelectTargetDirection: 'selectTargetDirection',
  LetterSelect: 'letterSelect',
  ShowList: 'showList',
  RepeatLastCommand: 'repeatLastCommand',
  SelectSex: 'selectSex',
  SelectRace: 'selectRace',
  SelectClass: 'selectClass',
  SelectRealm: 'selectRealm',
  RollStats: 'rollStats',
  SetMinimum: 'setMinimum',
  Autoroll: 'autoroll',
  AcceptStats: 'acceptStats',
  SetName: 'setName',
  ConfirmCharacter: 'confirmCharacter',
  CreationBack: 'creationBack',
  CreationNext: 'creationNext',
  QuickStart: 'quickStart',
  EnterStore: 'enterStore',
  ExitStore: 'exitStore',
  StorePurchase: 'storePurchase',
  StoreSell: 'storeSell',
  StoreExamine: 'storeExamine',
  BuyItem: 'buyItem',
  SellItem: 'sellItem',
  ToggleStorePage: 'toggleStorePage',
  EnterWilderness: 'enterWilderness',
  ExitWilderness: 'exitWilderness',
  EnterPlace: 'enterPlace',
  EnterBuilding: 'enterBuilding',
  SelectServiceItem: 'selectServiceItem',
  ExitBuilding: 'exitBuilding',
  Search: 'search',
  ToggleSearchMode: 'toggleSearchMode',
} as const;

export type GameAction =
  | { type: 'move'; dir: Direction }
  | { type: 'run'; dir: Direction }
  | { type: 'goDownStairs' }
  | { type: 'goUpStairs' }
  | { type: 'pickup' }
  | { type: 'takeOff'; slot: string }
  | { type: 'rest'; mode: 'full' | 'hp' | { turns: number } }
  | { type: 'restart' }
  // Item actions (trigger FSM state transitions for item selection)
  | { type: 'wield' }
  | { type: 'drop' }
  | { type: 'quaff' }
  | { type: 'read' }
  | { type: 'eat' }
  | { type: 'zap' }
  // Magic actions
  | { type: 'cast' }
  | { type: 'study' }
  // Modal/view actions (trigger FSM state transitions)
  | { type: 'toggleInventory' }
  | { type: 'toggleEquipment' }
  | { type: 'toggleCharacter' }
  // Look/Target mode (cursor-based)
  | { type: 'look' }
  | { type: 'target' }
  | { type: 'moveCursor'; dir: Direction }
  | { type: 'cycleTarget' }
  | { type: 'confirmTarget' }
  | { type: 'cancelTarget' }
  | { type: 'enterTargetMode' }  // '*' to enter cursor targeting from direction mode
  // Effect targeting (item selection, symbol input, direction)
  | { type: 'selectTargetItem'; itemIndex: number }
  | { type: 'selectTargetSymbol'; symbol: string }
  | { type: 'selectTargetDirection'; dir: Direction }
  // Generic inputs (states interpret contextually)
  | { type: 'letterSelect'; letter: string }
  | { type: 'showList' }
  // Repeat last command
  | { type: 'repeatLastCommand' }
  // Character creation actions
  | { type: 'selectSex'; sex: Sex }
  | { type: 'selectRace'; raceKey: string }
  | { type: 'selectClass'; classKey: string }
  | { type: 'selectRealm'; realm: string }
  | { type: 'rollStats' }
  | { type: 'setMinimum'; stat: keyof Stats; value: number }
  | { type: 'autoroll' }
  | { type: 'acceptStats' }
  | { type: 'setName'; name: string }
  | { type: 'confirmCharacter' }
  | { type: 'creationBack' }
  | { type: 'creationNext' }
  | { type: 'quickStart' }  // Reuse previous character parameters
  // Store/shopping actions
  | { type: 'enterStore' }
  | { type: 'exitStore' }
  | { type: 'storePurchase' }
  | { type: 'storeSell' }
  | { type: 'storeExamine' }
  | { type: 'buyItem'; itemIndex: number; quantity?: number }
  | { type: 'sellItem'; inventoryIndex: number; quantity?: number }
  | { type: 'toggleStorePage' }
  // Wilderness actions
  | { type: 'enterWilderness' }
  | { type: 'exitWilderness' }
  | { type: 'enterPlace' }
  // Service building actions
  | { type: 'enterBuilding' }
  | { type: 'selectServiceItem'; itemIndex: number }
  | { type: 'exitBuilding' }
  // Search actions
  | { type: 'search' }           // Manual single search ('s')
  | { type: 'toggleSearchMode' }; // Toggle continuous search ('S')
