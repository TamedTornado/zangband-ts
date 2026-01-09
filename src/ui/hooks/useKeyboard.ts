import { useEffect } from 'react';
import { Direction } from '@/core/types';
import { useGame } from '../context/GameContext';

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
  Zap: 'action:zap',
  // Magic
  Cast: 'action:cast',
  Study: 'action:study',
  // Modals
  ToggleInventory: 'action:toggle_inventory',
  ToggleEquipment: 'action:toggle_equipment',
  ToggleCharacter: 'action:toggle_character',
  // Other
  Rest: 'action:rest',
  RepeatLastCommand: 'action:repeat_last_command',
  // Targeting
  Look: 'action:look',
  Target: 'action:target',
  CycleTarget: 'action:cycle_target',
  ConfirmTarget: 'action:confirm_target',
  CancelTarget: 'action:cancel_target',
  ShowList: 'action:show_list',
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
  { key: 'z', modifiers: [], action: Action.Zap },
  { key: 'a', modifiers: [], action: Action.Zap }, // Alias: aim wand
  // Magic
  { key: 'm', modifiers: [], action: Action.Cast },
  { key: 'G', modifiers: ['shift'], action: Action.Study },
  // Modals
  { key: 'i', modifiers: [], action: Action.ToggleInventory },
  { key: 'e', modifiers: [], action: Action.ToggleEquipment },
  { key: 'C', modifiers: ['shift'], action: Action.ToggleCharacter },
  // Other
  { key: 'R', modifiers: ['shift'], action: Action.Rest },
  { key: 'n', modifiers: [], action: Action.RepeatLastCommand },
  // Targeting
  { key: 'x', modifiers: [], action: Action.Look },
  { key: '*', modifiers: [], action: Action.Target },
  { key: 'Tab', modifiers: [], action: Action.CycleTarget },
  { key: 'Enter', modifiers: [], action: Action.ConfirmTarget },
  { key: '5', modifiers: [], action: Action.ConfirmTarget },  // Numpad 5 = use last target
  { key: '.', modifiers: [], action: Action.ConfirmTarget },  // '.' = use last target
  { key: 'Escape', modifiers: [], action: Action.CancelTarget },
  { key: '?', modifiers: [], action: Action.ShowList },
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

/** Axis event handlers */
const AXIS_HANDLERS: Record<Axis, (dir: Direction, actions: GameActions) => void> = {
  [Axis.Move]: (dir, actions) => actions.movePlayer(dir),
  [Axis.Run]: (dir, actions) => actions.runInDirection(dir),
};

/** Action event handlers */
const ACTION_HANDLERS: Record<Action, (actions: GameActions) => void> = {
  [Action.GoDownStairs]: (a) => a.goDownStairs(),
  [Action.GoUpStairs]: (a) => a.goUpStairs(),
  [Action.Pickup]: (a) => a.pickupItem(),
  [Action.Wield]: (a) => a.wieldItem(),
  [Action.Drop]: (a) => a.dropItem(),
  [Action.Takeoff]: (a) => a.toggleEquipment(), // Opens equipment view, user can then take off
  [Action.Quaff]: (a) => a.quaffPotion(),
  [Action.Read]: (a) => a.readScroll(),
  [Action.Eat]: (a) => a.eatFood(),
  [Action.Zap]: (a) => a.zapDevice(),
  [Action.Cast]: (a) => a.castSpell(),
  [Action.Study]: (a) => a.studySpell(),
  [Action.ToggleInventory]: (a) => a.toggleInventory(),
  [Action.ToggleEquipment]: (a) => a.toggleEquipment(),
  [Action.ToggleCharacter]: (a) => a.toggleCharacter(),
  [Action.Rest]: (a) => a.promptRest(),
  [Action.RepeatLastCommand]: (a) => a.repeatLastCommand(),
  // Targeting
  [Action.Look]: (a) => a.look(),
  [Action.Target]: (a) => a.target(),
  [Action.CycleTarget]: (a) => a.cycleTarget(),
  [Action.ConfirmTarget]: (a) => a.confirmTarget(),
  [Action.CancelTarget]: (a) => a.cancelTarget(),
  [Action.ShowList]: (a) => a.showList(),
};

export function useKeyboard() {
  const { state, actions } = useGame();

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

      // Handle item selection mode - route a-z to letterSelect, Escape to cancel
      if (state.stateName === 'itemSelection') {
        e.preventDefault();
        if (e.key >= 'a' && e.key <= 'z' && !e.ctrlKey && !e.altKey) {
          actions.letterSelect(e.key);
        } else if (e.key === 'Escape') {
          actions.cancelTarget();
        } else if (e.key === '?') {
          actions.showList();
        }
        return;
      }

      // Handle spell casting mode - route a-z to letterSelect, Escape to cancel
      if (state.stateName === 'cast' || state.stateName === 'study') {
        e.preventDefault();
        if (e.key >= 'a' && e.key <= 'z' && !e.ctrlKey && !e.altKey) {
          actions.letterSelect(e.key);
        } else if (e.key === 'Escape') {
          actions.cancelTarget();
        } else if (e.key === '?') {
          actions.showList();
        }
        return;
      }

      // Handle symbol targeting - route a-z to letterSelect
      if (state.stateName === 'symbolTargeting') {
        e.preventDefault();
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
          actions.letterSelect(e.key);
        } else if (e.key === 'Escape') {
          actions.cancelTarget();
        }
        return;
      }

      // Handle direction targeting - route direction keys
      if (state.stateName === 'directionTargeting') {
        e.preventDefault();
        if (binding?.type === 'axis') {
          // Direction keys - dispatch the direction via moveCursor for now
          // DirectionTargetingState will interpret this
          actions.moveCursor(binding.direction);
        } else if (e.key === 'Escape') {
          actions.cancelTarget();
        }
        return;
      }

      // No binding - check for letter (a-z) to dispatch letterSelect
      if (!binding) {
        if (e.key.length === 1 && e.key >= 'a' && e.key <= 'z' && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          actions.letterSelect(e.key);
        }
        return;
      }

      // Handle inventory/equipment/character FSM states
      if (state.stateName === 'inventory' || state.stateName === 'equipment' || state.stateName === 'character') {
        e.preventDefault();
        // Allow toggle actions to close the view
        if (binding.type === 'action') {
          if (binding.action === Action.ToggleInventory && state.stateName === 'inventory') {
            ACTION_HANDLERS[binding.action](actions);
          } else if (binding.action === Action.ToggleEquipment && state.stateName === 'equipment') {
            ACTION_HANDLERS[binding.action](actions);
          } else if (binding.action === Action.ToggleCharacter && state.stateName === 'character') {
            ACTION_HANDLERS[binding.action](actions);
          } else if (binding.action === Action.CancelTarget) {
            actions.cancelTarget();
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
                   binding.action === Action.CancelTarget ||
                   binding.action === Action.Target) {  // '*' to enter cursor mode
          ACTION_HANDLERS[binding.action](actions);
        }
        return;
      }

      // Execute the binding
      e.preventDefault();
      if (binding.type === 'axis') {
        AXIS_HANDLERS[binding.axis](binding.direction, actions);
      } else {
        ACTION_HANDLERS[binding.action](actions);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, state.prompt, state.stateName]);
}
