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
  EnterStore: 'action:enter_store',
  // Targeting
  Look: 'action:look',
  Target: 'action:target',
  CycleTarget: 'action:cycle_target',
  ConfirmTarget: 'action:confirm_target',
  CancelTarget: 'action:cancel_target',
  ShowList: 'action:show_list',
  // Store commands
  StorePurchase: 'action:store_purchase',
  StoreSell: 'action:store_sell',
  StoreExamine: 'action:store_examine',
  ExitStore: 'action:exit_store',
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
  // numpad (with NumLock on)
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
  // numpad navigation keys (Shift+numpad reports these instead of digits)
  // Note: Arrow keys are NOT included here as they're already in the first set
  {
    Home: Direction.NorthWest,    // Shift+Numpad7
    PageUp: Direction.NorthEast,  // Shift+Numpad9
    End: Direction.SouthWest,     // Shift+Numpad1
    PageDown: Direction.SouthEast, // Shift+Numpad3
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
 * Action key bindings - maps actions to their trigger keys.
 * Modifiers are encoded in the string (e.g., "shift+E").
 * Multiple actions can share the same key - all are dispatched.
 */
const ACTION_KEYS: Partial<Record<Action, string | string[]>> = {
  // Stairs
  [Action.GoDownStairs]: '>',
  [Action.GoUpStairs]: '<',
  // Items
  [Action.Pickup]: 'g',
  [Action.Wield]: 'w',
  [Action.Drop]: 'd',
  [Action.Takeoff]: 't',
  [Action.Quaff]: 'q',
  [Action.Read]: 'r',
  [Action.Eat]: 'shift+E',
  [Action.Zap]: ['z', 'a'],  // z = zap, a = aim (alias)
  // Magic
  [Action.Cast]: 'm',
  [Action.Study]: 'shift+G',
  // Modals
  [Action.ToggleInventory]: 'i',
  [Action.ToggleEquipment]: 'e',
  [Action.ToggleCharacter]: 'shift+C',
  // Other
  [Action.Rest]: 'shift+R',
  [Action.RepeatLastCommand]: 'n',
  [Action.EnterStore]: 'Enter',
  // Targeting
  [Action.Look]: 'x',
  [Action.Target]: '*',
  [Action.CycleTarget]: 'Tab',
  [Action.ConfirmTarget]: ['5', '.'],  // Numpad 5 or period
  [Action.CancelTarget]: 'Escape',
  [Action.ShowList]: '?',
  // Store commands (x overlaps with Look, Escape overlaps with CancelTarget)
  [Action.StorePurchase]: 'p',
  [Action.StoreSell]: 's',
  [Action.StoreExamine]: 'x',
  [Action.ExitStore]: 'Escape',
};

/**
 * Build the complete key binding map.
 * Returns an array of inputs per key to support overlapping bindings.
 */
function buildKeyBindings(): Record<string, ResolvedInput[]> {
  const bindings: Record<string, ResolvedInput[]> = {};

  function addBinding(lookupKey: string, input: ResolvedInput) {
    if (!bindings[lookupKey]) {
      bindings[lookupKey] = [];
    }
    bindings[lookupKey].push(input);
  }

  // Compose axis bindings with direction keys
  for (const axisBinding of AXIS_BINDINGS) {
    for (const directionSet of DIRECTION_KEYS) {
      for (const [key, direction] of Object.entries(directionSet)) {
        // For shifted single-char keys, the browser reports uppercase (k -> K)
        // Multi-char keys like ArrowUp stay as-is
        const hasShift = axisBinding.modifiers.includes('shift');
        const actualKey = hasShift && key.length === 1 ? key.toUpperCase() : key;
        const lookupKey = hasShift ? `shift+${actualKey}` : actualKey;
        addBinding(lookupKey, { type: 'axis', axis: axisBinding.axis, direction });
      }
    }
  }

  // Add action bindings from ACTION_KEYS
  for (const [action, keys] of Object.entries(ACTION_KEYS)) {
    const keyList = Array.isArray(keys) ? keys : [keys];
    for (const key of keyList) {
      addBinding(key, { type: 'action', action: action as Action });
    }
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
  [Action.EnterStore]: (a) => a.enterCurrentStore(),
  // Targeting
  [Action.Look]: (a) => a.look(),
  [Action.Target]: (a) => a.target(),
  [Action.CycleTarget]: (a) => a.cycleTarget(),
  [Action.ConfirmTarget]: (a) => a.confirmTarget(),
  [Action.CancelTarget]: (a) => a.cancelTarget(),
  [Action.ShowList]: (a) => a.showList(),
  // Store commands
  [Action.StorePurchase]: (a) => a.dispatch({ type: 'storeCommand', command: 'purchase' }),
  [Action.StoreSell]: (a) => a.dispatch({ type: 'storeCommand', command: 'sell' }),
  [Action.StoreExamine]: (a) => a.dispatch({ type: 'storeCommand', command: 'examine' }),
  [Action.ExitStore]: (a) => a.dispatch({ type: 'exitStore' }),
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

      // Handle character creation - 'q' for quick start
      if (state.stateName === 'sexSelection') {
        if (e.key === 'q' || e.key === 'Q') {
          e.preventDefault();
          actions.dispatch({ type: 'quickStart' });
          return;
        }
        // Let other keys fall through for normal UI handling
        return;
      }

      // Look up bindings - try with modifiers first, then plain key
      const keyWithMods = getKeyWithModifiers(e);
      const bindings = KEY_BINDINGS[keyWithMods] ?? KEY_BINDINGS[e.key] ?? [];

      // Helper to find first binding of a type
      const findAxis = () => bindings.find((b): b is Extract<ResolvedInput, { type: 'axis' }> => b.type === 'axis');
      const hasAction = (action: Action) => bindings.some(b => b.type === 'action' && b.action === action);

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
        const axis = findAxis();
        if (axis) {
          actions.moveCursor(axis.direction);
        } else if (e.key === 'Escape') {
          actions.cancelTarget();
        }
        return;
      }

      // No bindings - check for letter (a-z) to dispatch letterSelect
      if (bindings.length === 0) {
        if (e.key.length === 1 && e.key >= 'a' && e.key <= 'z' && !e.ctrlKey && !e.altKey) {
          e.preventDefault();
          actions.letterSelect(e.key);
        }
        return;
      }

      // Handle inventory/equipment/character FSM states
      if (state.stateName === 'inventory' || state.stateName === 'equipment' || state.stateName === 'character') {
        e.preventDefault();
        if (hasAction(Action.ToggleInventory) && state.stateName === 'inventory') {
          ACTION_HANDLERS[Action.ToggleInventory](actions);
        } else if (hasAction(Action.ToggleEquipment) && state.stateName === 'equipment') {
          ACTION_HANDLERS[Action.ToggleEquipment](actions);
        } else if (hasAction(Action.ToggleCharacter) && state.stateName === 'character') {
          ACTION_HANDLERS[Action.ToggleCharacter](actions);
        } else if (hasAction(Action.CancelTarget)) {
          actions.cancelTarget();
        }
        return;
      }

      // Handle targeting mode - route movement to cursor, allow targeting actions
      if (state.stateName === 'targeting') {
        e.preventDefault();
        const axis = findAxis();
        if (axis) {
          actions.moveCursor(axis.direction);
        } else if (hasAction(Action.CycleTarget)) {
          ACTION_HANDLERS[Action.CycleTarget](actions);
        } else if (hasAction(Action.ConfirmTarget) || hasAction(Action.EnterStore)) {
          actions.confirmTarget();
        } else if (hasAction(Action.CancelTarget)) {
          actions.cancelTarget();
        } else if (hasAction(Action.Target)) {
          ACTION_HANDLERS[Action.Target](actions);
        }
        return;
      }

      // Execute all bindings - states will handle what they care about
      e.preventDefault();
      for (const binding of bindings) {
        if (binding.type === 'axis') {
          AXIS_HANDLERS[binding.axis](binding.direction, actions);
        } else {
          ACTION_HANDLERS[binding.action](actions);
        }
      }

      // Also dispatch letterSelect for letter keys (even if they have bindings)
      // This allows states like shopping to handle letter selection
      if (e.key.length === 1 && e.key >= 'a' && e.key <= 'z' && !e.ctrlKey && !e.altKey) {
        actions.letterSelect(e.key);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, state.prompt, state.stateName]);
}
