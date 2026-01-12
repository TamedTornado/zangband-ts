import { useEffect } from 'react';
import { Direction } from '@/core/types';
import { ActionType } from '@/core/fsm/Actions';
import { useGame } from '../context/GameContext';
import { useSettingsStore } from '@/core/store/settingsStore';

// DO NOT PUT STATE-SPECIFIC LOGIC IN HERE. THINK TWICE ABOUT MAKING THIS ANY MORE COMPLICATED.

/**
 * Axis inputs - directional discrete events
 */
export const Axis = {
  Move: 'axis:move',
  Run: 'axis:run',
} as const;

export type Axis = (typeof Axis)[keyof typeof Axis];

type ActionTypeValue = (typeof ActionType)[keyof typeof ActionType];

/**
 * Resolved input - either axis+direction or action
 */
type ResolvedInput =
  | { type: 'axis'; axis: Axis; direction: Direction }
  | { type: 'action'; action: ActionTypeValue };

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
 * Action key bindings - maps action types to their trigger keys.
 * Modifiers are encoded in the string (e.g., "shift+E").
 * Multiple actions can share the same key - all are dispatched.
 */
const ACTION_KEYS: Partial<Record<ActionTypeValue, string | string[]>> = {
  // Stairs
  [ActionType.GoDownStairs]: '>',
  [ActionType.GoUpStairs]: '<',
  // Items
  [ActionType.Pickup]: 'g',
  [ActionType.Wield]: 'w',
  [ActionType.Drop]: 'd',
  [ActionType.TakeOff]: 't',
  [ActionType.Quaff]: 'q',
  [ActionType.Read]: 'r',
  [ActionType.Eat]: 'shift+E',
  [ActionType.Zap]: ['z', 'a'],  // z = zap, a = aim (alias)
  // Magic
  [ActionType.Cast]: 'm',
  [ActionType.Study]: 'shift+G',
  // Modals
  [ActionType.ToggleInventory]: 'i',
  [ActionType.ToggleEquipment]: 'e',
  [ActionType.ToggleCharacter]: 'shift+C',
  // Other
  [ActionType.Rest]: 'shift+R',
  [ActionType.RepeatLastCommand]: 'n',
  [ActionType.EnterStore]: 'Enter',
  [ActionType.QuickStart]: 'q',
  // Targeting
  [ActionType.Look]: 'x',
  [ActionType.Target]: '*',
  [ActionType.CycleTarget]: 'Tab',
  [ActionType.ConfirmTarget]: ['5', '.'],  // Numpad 5 or period
  [ActionType.CancelTarget]: 'Escape',
  [ActionType.ShowList]: '?',
  // Store commands (x overlaps with Look, Escape overlaps with CancelTarget)
  [ActionType.StorePurchase]: 'p',
  [ActionType.StoreSell]: 's',
  [ActionType.StoreExamine]: 'x',
  [ActionType.ExitStore]: 'Escape',
  // Service building
  [ActionType.ExitBuilding]: 'Escape',
  // Search (s overlaps with StoreSell, states handle appropriately)
  [ActionType.Search]: 's',
  [ActionType.ToggleSearchMode]: 'shift+S',
  // Display
  [ActionType.ToggleTiles]: '%',  // Shift+5
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
      addBinding(key, { type: 'action', action: action as ActionTypeValue });
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
  [Axis.Move]: (dir, actions) => actions.dispatch({ type: ActionType.Move, dir }),
  [Axis.Run]: (dir, actions) => actions.dispatch({ type: ActionType.Run, dir }),
};

export function useKeyboard() {
  const { state, actions } = useGame();
  const toggleTiles = useSettingsStore((s) => s.toggleTiles);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Handle prompt mode - capture all keys for text input (UI concern, not game state)
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

      // Look up bindings - try with modifiers first, then plain key
      const keyWithMods = getKeyWithModifiers(e);
      const bindings = KEY_BINDINGS[keyWithMods] ?? KEY_BINDINGS[e.key] ?? [];

      e.preventDefault();

      // Execute all matching bindings - states handle what they care about
      for (const binding of bindings) {
        if (binding.type === 'axis') {
          AXIS_HANDLERS[binding.axis](binding.direction, actions);
        } else if (binding.action === ActionType.ToggleTiles) {
          // Handle tile toggle directly (UI-only action)
          toggleTiles();
        } else {
          // Dispatch the action type directly - no handler map needed
          actions.dispatch({ type: binding.action } as any);
        }
      }

      // Always dispatch letterSelect for letter keys (states use this for menus)
      if (e.key.length === 1 && e.key >= 'a' && e.key <= 'z' && !e.ctrlKey && !e.altKey) {
        actions.dispatch({ type: ActionType.LetterSelect, letter: e.key });
      }

      // Dispatch selectTargetSymbol for any printable character (for symbol targeting)
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
        actions.dispatch({ type: ActionType.SelectTargetSymbol, symbol: e.key });
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, state.prompt, toggleTiles]);
}
