import { useState } from 'react';
import { Modal } from './Modal';
import { useGame } from '../../context/GameContext';

/**
 * Tab configuration - matches Zangband TCL/TK character-window.tcl
 * Priv(hook): HookInfo, HookFlags, HookMutations, HookVirtues, HookNotes
 */
type TabId = 'info' | 'flags' | 'mutations' | 'virtues' | 'notes';

const TABS: Array<{ id: TabId; label: string }> = [
  { id: 'info', label: 'Info' },
  { id: 'flags', label: 'Flags' },
  { id: 'mutations', label: 'Mutations' },
  { id: 'virtues', label: 'Virtues' },
  { id: 'notes', label: 'Notes' },
];

/**
 * Character modal - displays player stats and info
 *
 * Inspired by Zangband TCL/TK character-window.tcl:
 * - Tabbed interface with Info, Flags, Mutations, Virtues, Notes
 * - Uses NSTabs widget pattern
 */
export function CharacterModal() {
  const { state, actions } = useGame();
  const [activeTab, setActiveTab] = useState<TabId>('info');
  const { player } = state;

  if (!player) return null;

  return (
    <Modal
      title="Character"
      onClose={() => actions.cancelTarget()}
      width={500}
    >
      <div className="char-tabs">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`char-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="char-tab-content">
        {activeTab === 'info' && <InfoTab player={player} depth={state.depth} turn={state.turn} />}
        {activeTab === 'flags' && <FlagsTab player={player} />}
        {activeTab === 'mutations' && <MutationsTab />}
        {activeTab === 'virtues' && <VirtuesTab />}
        {activeTab === 'notes' && <NotesTab />}
      </div>
    </Modal>
  );
}

interface TabProps {
  player: NonNullable<ReturnType<typeof useGame>['state']['player']>;
  depth?: number;
  turn?: number;
}

/**
 * Info tab - basic character info
 */
function InfoTab({ player, depth, turn }: TabProps) {
  const stats = player.stats;

  return (
    <div className="char-info">
      <div className="char-header">
        <div className="char-row">
          <span className="char-label">Name:</span>
          <span className="char-value">Player</span>
        </div>
        <div className="char-row">
          <span className="char-label">Race:</span>
          <span className="char-value">Human</span>
        </div>
        <div className="char-row">
          <span className="char-label">Class:</span>
          <span className="char-value">{player.className}</span>
        </div>
        <div className="char-row">
          <span className="char-label">Level:</span>
          <span className="char-value">{player.level}</span>
        </div>
        <div className="char-row">
          <span className="char-label">Experience:</span>
          <span className="char-value">{player.experience}</span>
        </div>
        <div className="char-row">
          <span className="char-label">Next Level:</span>
          <span className="char-value">{player.experienceToNextLevel === Infinity ? 'Max' : player.experienceToNextLevel}</span>
        </div>
      </div>

      <div className="char-divider" />

      <div className="char-stats">
        <h4>Stats</h4>
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-name">STR:</span>
            <span className="stat-val">{stats.str}</span>
          </div>
          <div className="stat-item">
            <span className="stat-name">INT:</span>
            <span className="stat-val">{stats.int}</span>
          </div>
          <div className="stat-item">
            <span className="stat-name">WIS:</span>
            <span className="stat-val">{stats.wis}</span>
          </div>
          <div className="stat-item">
            <span className="stat-name">DEX:</span>
            <span className="stat-val">{stats.dex}</span>
          </div>
          <div className="stat-item">
            <span className="stat-name">CON:</span>
            <span className="stat-val">{stats.con}</span>
          </div>
          <div className="stat-item">
            <span className="stat-name">CHR:</span>
            <span className="stat-val">{stats.chr}</span>
          </div>
        </div>
      </div>

      <div className="char-divider" />

      <div className="char-combat">
        <h4>Combat</h4>
        <div className="char-row">
          <span className="char-label">HP:</span>
          <span className="char-value">{player.hp} / {player.maxHp}</span>
        </div>
        <div className="char-row">
          <span className="char-label">AC:</span>
          <span className="char-value">{player.totalAc}</span>
        </div>
        <div className="char-row">
          <span className="char-label">Melee:</span>
          <span className="char-value">
            {player.weaponDamage} ({player.weaponToHit >= 0 ? '+' : ''}{player.weaponToHit},{player.weaponToDam >= 0 ? '+' : ''}{player.weaponToDam})
          </span>
        </div>
        <div className="char-row">
          <span className="char-label">Speed:</span>
          <span className="char-value">{player.speed > 110 ? '+' : ''}{player.speed - 110}</span>
        </div>
      </div>

      <div className="char-divider" />

      <div className="char-misc">
        <div className="char-row">
          <span className="char-label">Depth:</span>
          <span className="char-value">{(depth ?? 1) * 50}ft (Level {depth ?? 1})</span>
        </div>
        <div className="char-row">
          <span className="char-label">Turn:</span>
          <span className="char-value">{turn ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Flags tab - resistances and abilities
 */
function FlagsTab({ player: _player }: TabProps) {
  // TODO: Implement resistance/ability flags from equipment
  return (
    <div className="char-flags">
      <h4>Resistances</h4>
      <div className="flags-grid">
        <span className="flag-item dim">Acid: -</span>
        <span className="flag-item dim">Elec: -</span>
        <span className="flag-item dim">Fire: -</span>
        <span className="flag-item dim">Cold: -</span>
        <span className="flag-item dim">Poison: -</span>
        <span className="flag-item dim">Light: -</span>
        <span className="flag-item dim">Dark: -</span>
        <span className="flag-item dim">Sound: -</span>
        <span className="flag-item dim">Shards: -</span>
        <span className="flag-item dim">Nether: -</span>
        <span className="flag-item dim">Nexus: -</span>
        <span className="flag-item dim">Chaos: -</span>
        <span className="flag-item dim">Disenchant: -</span>
        <span className="flag-item dim">Fear: -</span>
        <span className="flag-item dim">Blindness: -</span>
        <span className="flag-item dim">Confusion: -</span>
      </div>

      <h4>Abilities</h4>
      <div className="flags-grid">
        <span className="flag-item dim">Free Action: -</span>
        <span className="flag-item dim">See Invisible: -</span>
        <span className="flag-item dim">Telepathy: -</span>
        <span className="flag-item dim">Slow Digest: -</span>
        <span className="flag-item dim">Regeneration: -</span>
        <span className="flag-item dim">Feather Fall: -</span>
        <span className="flag-item dim">Hold Life: -</span>
        <span className="flag-item dim">Light: -</span>
      </div>
    </div>
  );
}

/**
 * Mutations tab - character mutations (Zangband feature)
 */
function MutationsTab() {
  return (
    <div className="char-mutations">
      <p className="empty-text">You have no mutations.</p>
    </div>
  );
}

/**
 * Virtues tab - virtue scores (Zangband feature)
 */
function VirtuesTab() {
  // TODO: Implement virtue system
  const virtues = [
    'Compassion', 'Honour', 'Justice', 'Sacrifice',
    'Knowledge', 'Faith', 'Enlightenment', 'Mysticism',
    'Chance', 'Nature', 'Harmony', 'Vitality',
    'Unlife', 'Patience', 'Temperance', 'Diligence', 'Valour',
  ];

  return (
    <div className="char-virtues">
      <div className="virtues-grid">
        {virtues.map(virtue => (
          <div key={virtue} className="virtue-item">
            <span className="virtue-name">{virtue}:</span>
            <span className="virtue-val dim">Neutral</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Notes tab - player notes
 */
function NotesTab() {
  return (
    <div className="char-notes">
      <textarea
        className="notes-input"
        placeholder="Enter notes here..."
        rows={10}
      />
    </div>
  );
}
