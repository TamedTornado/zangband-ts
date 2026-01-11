import { useGame } from '../context/GameContext';

export function StatsPanel() {
  const { state } = useGame();
  const { player, turn, depth } = state;

  if (!player) return null;

  const hpPercent = Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100));
  const mpPercent = player.maxMana > 0
    ? Math.max(0, Math.min(100, (player.currentMana / player.maxMana) * 100))
    : 0;
  const xpPercent = player.experienceToNextLevel === Infinity
    ? 100
    : Math.max(0, Math.min(100, (player.experience / player.experienceToNextLevel) * 100));
  const stats = player.stats;

  return (
    <div className="stats-panel">
      <h3>{player.name}</h3>

      <div className="hp-bar">
        <div className="fill" style={{ width: `${hpPercent}%` }} />
      </div>
      <div className="bar-text">HP: {player.hp}/{player.maxHp}</div>

      {player.maxMana > 0 && (
        <>
          <div className="mp-bar">
            <div className="fill" style={{ width: `${mpPercent}%` }} />
          </div>
          <div className="bar-text">MP: {player.currentMana}/{player.maxMana}</div>
        </>
      )}

      <div style={{ marginTop: 16 }}>
        <div className="stat-row">
          <span className="stat-label">STR</span>
          <span className="stat-value">{stats.str}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">INT</span>
          <span className="stat-value">{stats.int}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">WIS</span>
          <span className="stat-value">{stats.wis}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">DEX</span>
          <span className="stat-value">{stats.dex}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">CON</span>
          <span className="stat-value">{stats.con}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">CHR</span>
          <span className="stat-value">{stats.chr}</span>
        </div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="stat-row">
          <span className="stat-label">Level</span>
          <span className="stat-value">{player.level}</span>
        </div>
        <div className="xp-bar">
          <div className="fill" style={{ width: `${xpPercent}%` }} />
        </div>
        <div className="bar-text">XP: {player.experience}/{player.experienceToNextLevel === Infinity ? 'Max' : player.experienceToNextLevel}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <div className="stat-row">
          <span className="stat-label">Turn</span>
          <span className="stat-value">{turn}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Depth</span>
          <span className="stat-value">{depth === 0 ? 'Town' : `${depth * 50}ft`}</span>
        </div>
      </div>
    </div>
  );
}
