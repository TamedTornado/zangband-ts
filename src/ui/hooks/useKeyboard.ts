import { useEffect } from 'react';
import { Direction } from '@/core/types';
import { useGame } from '../context/GameContext';
import { useModal } from '../context/ModalContext';

/**
 * Axis inputs - directional discrete events
 */
export const Axis = {
  Move: 'axis:move',
  Run: 'axis:run',
} as const;

export type Axis = (typeof Axis)[keyof typeof Axis];

/**
 * Action inputs - discrete non-directional events
 */
export const Action = {
  // Stairs
  GoDownStairs: 'action:go_down_stairs',
  GoUpStairs: 'action:go_up_stairs',
  // Items
  Pickup: 'action:pickup',
  Wield: 'action:wield',
  Drop: 'action:drop',
  Takeoff: 'action:takeoff',
  Quaff: 'action:quaff',
  Read: 'action:read',
  Eat: 'action:eat',
  // Modals
  ToggleInventory: 'action:toggle_inventory',
  ToggleEquipment: 'action:toggle_equipment',
  ToggleCharacter: 'action:toggle_character',
  // Other
  Rest: 'action:rest',
  // Targeting
  Look: 'action:look',
  Target: 'action:target',
  CycleTarget: 'action:cycle_target',
  ConfirmTarget: 'action:confirm_target',
  CancelTarget: 'action:cancel_target',
} as const;

export type Action = (typeof Action)[keyof typeof Action];

/**
 * Resolved input - either axis+direction or action
 */
type ResolvedInput =
  | { type: 'axis'; axis: Axis; direction: Direction }
  | { type: 'action'; action: Action };

/**
 * Direction key sets - each maps keys to directions
 */
const DIRECTION_KEYS: Record<string, Direction>[] = [
  // vi keys
  {
    k: Direction.North,
    j: Direction.South,
    h: Direction.West,
    l: Direction.East,
    y: Direction.NorthWest,
    u: Direction.NorthEast,
    b: Direction.SouthWest,
    n: Direction.SouthEast,
  },
  // arrow keys
  {
    ArrowUp: Direction.North,
    ArrowDown: Direction.South,
    ArrowLeft: Direction.West,
    ArrowRight: Direction.East,
  },
  // numpad
  {
    '8': Direction.North,
    '2': Direction.South,
    '4': Direction.West,
    '6': Direction.East,
    '7': Direction.NorthWest,
    '9': Direction.NorthEast,
    '1': Direction.SouthWest,
    '3': Direction.SouthEast,
  },
];

/**
 * Axis bindings - define which modifiers trigger which axis
 */
const AXIS_BINDINGS: { axis: Axis; modifiers: string[] }[] = [
  { axis: Axis.Move, modifiers: [] },
  { axis: Axis.Run, modifiers: ['shift'] },
];

/**
 * Action bindings - non-directional inputs
 */
const ACTION_BINDINGS: { key: string; modifiers: string[]; action: Action }[] = [
  // Stairs
  { key: '>', modifiers: [], action: Action.GoDownStairs },
  { key: '<', modifiers: [], action: Action.GoUpStairs },
  // Items
  { key: 'g', modifiers: [], action: Action.Pickup },
  { key: 'w', modifiers: [], action: Action.Wield },
  { key: 'd', modifiers: [], action: Action.Drop },
  { key: 't', modifiers: [], action: Action.Takeoff },
  { key: 'q', modifiers: [], action: Action.Quaff },
  { key: 'r', modifiers: [], action: Action.Read },
  { key: 'E', modifiers: ['shift'], action: Action.Eat },
  // Modals
  { key: 'i', modifiers: [], action: Action.ToggleInventory },
  { key: 'e', modifiers: [], action: Action.ToggleEquipment },
  { key: 'C', modifiers: ['shift'], action: Action.ToggleCharacter },
  // Other
  { key: 'R', modifiers: ['shift'], action: Action.Rest },
  // Targeting
  { key: 'x', modifiers: [], action: Action.Look },
  { key: '*', modifiers: [], action: Action.Target },
  { key: 'Tab', modifiers: [], action: Action.CycleTarget },
  { key: 'Enter', modifiers: [], action: Action.ConfirmTarget },
  { key: 'Escape', modifiers: [], action: Action.CancelTarget },
];

/**
 * Build lookup key from modifiers and key
 */
function buildLookupKey(modifiers: string[], key: string): string {
  if (modifiers.length === 0) return key;
  return [...modifiers, key].join('+');
}

/**
 * Build the complete key binding map from axis and action bindings
 */
function buildKeyBindings(): Record<string, ResolvedInput> {
  const bindings: Record<string, ResolvedInput> = {};

  // Compose axis bindings with direction keys
  for (const axisBinding of AXIS_BINDINGS) {
    for (const directionSet of DIRECTION_KEYS) {
      for (const [key, direction] of Object.entries(directionSet)) {
        // For shifted single-char keys, the browser reports uppercase (k -> K)
        // Multi-char keys like ArrowUp stay as-is
        const actualKey = axisBinding.modifiers.includes('shift') && key.length === 1
          ? key.toUpperCase()
          : key;
        const lookupKey = buildLookupKey(axisBinding.modifiers, actualKey);
        bindings[lookupKey] = { type: 'axis', axis: axisBinding.axis, direction };
      }
    }
  }

  // Add action bindings
  for (const actionBinding of ACTION_BINDINGS) {
    const lookupKey = buildLookupKey(actionBinding.modifiers, actionBinding.key);
    bindings[lookupKey] = { type: 'action', action: actionBinding.action };
  }

  return bindings;
}

const KEY_BINDINGS = buildKeyBindings();

/**
 * Normalize a keyboard event to a lookup key
 */
function getKeyWithModifiers(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('ctrl');
  if (e.altKey) parts.push('alt');
  if (e.shiftKey) parts.push('shift');
  parts.push(e.key);
  return parts.join('+');
}

type GameActions = ReturnType<typeof useGame>['actions'];
type ModalActions = ReturnType<typeof useModal>['modalActions'];

/** Axis event handlers */
const AXIS_HANDLERS: Record<Axis, (dir: Direction, actions: GameActions) => void> = {
  [Axis.Move]: (dir, actions) => actions.movePlayer(dir),
  [Axis.Run]: (dir, actions) => actions.runInDirection(dir),
};

/** Action event handlers */
const ACTION_HANDLERS: Record<Action, (actions: GameActions, modalActions: ModalActions) => void> = {
  [Action.GoDownStairs]: (a) => a.goDownStairs(),
  [Action.GoUpStairs]: (a) => a.goUpStairs(),
  [Action.Pickup]: (a) => a.pickupItem(),
  [Action.Wield]: (_a, m) => m.openInventory('wield'),
  [Action.Drop]: (_a, m) => m.openInventory('drop'),
  [Action.Takeoff]: (_a, m) => m.openModal('equipment'),
  [Action.Quaff]: (_a, m) => m.openInventory('quaff'),
  [Action.Read]: (_a, m) => m.openInventory('read'),
  [Action.Eat]: (_a, m) => m.openInventory('eat'),
  [Action.ToggleInventory]: (_a, m) => m.toggleModal('inventory'),
  [Action.ToggleEquipment]: (_a, m) => m.toggleModal('equipment'),
  [Action.ToggleCharacter]: (_a, m) => m.toggleModal('character'),
  [Action.Rest]: (a) => a.promptRest(),
  // Targeting
  [Action.Look]: (a) => a.look(),
  [Action.Target]: (a) => a.target(),
  [Action.CycleTarget]: (a) => a.cycleTarget(),
  [Action.ConfirmTarget]: (a) => a.confirmTarget(),
  [Action.CancelTarget]: (a) => a.cancelTarget(),
};

export function useKeyboard() {
  const { state, actions } = useGame();
  const { activeModal, modalActions } = useModal();

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle prompt mode - capture all keys for prompt input
      if (state.prompt) {
        e.preventDefault();
        if (e.key === 'Escape') {
          actions.cancelPrompt();
        } else if (e.key === 'Enter') {
          actions.submitPrompt();
        } else if (e.key === 'Backspace') {
          actions.updatePrompt(state.prompt.value.slice(0, -1));
        } else if (e.key.length === 1) {
          actions.updatePrompt(state.prompt.value + e.key);
        }
        return;
      }

      // Look up binding - try with modifiers first, then plain key
      const keyWithMods = getKeyWithModifiers(e);
      const binding = KEY_BINDINGS[keyWithMods] ?? KEY_BINDINGS[e.key];
      if (!binding) return;

      // If a modal is open, only allow toggle for the active modal
      if (activeModal) {
        if (binding.type === 'action' && binding.action.startsWith('action:toggle_')) {
          const modal = binding.action.replace('action:toggle_', '');
          if (modal === activeModal) {
            e.preventDefault();
            ACTION_HANDLERS[binding.action](actions, modalActions);
          }
        }
        return;
      }

      // Handle targeting mode - route movement to cursor, allow targeting actions
      if (state.stateName === 'targeting') {
        e.preventDefault();
        if (binding.type === 'axis') {
          actions.moveCursor(binding.direction);
        } else if (binding.action === Action.CycleTarget ||
                   binding.action === Action.ConfirmTarget ||
                   binding.action === Action.CancelTarget) {
          ACTION_HANDLERS[binding.action](actions, modalActions);
        }
        return;
      }

      // Execute the binding
      e.preventDefault();
      if (binding.type === 'axis') {
        AXIS_HANDLERS[binding.axis](binding.direction, actions);
      } else {
        ACTION_HANDLERS[binding.action](actions, modalActions);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, activeModal, modalActions, state.prompt, state.stateName]);
}
