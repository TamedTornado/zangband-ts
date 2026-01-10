import { useGame } from '../../../context/GameContext';
import racesData from '@/data/races/races.json';
import classesData from '@/data/classes/classes.json';
import type { RaceDef } from '@/core/data/races';
import type { ClassDef } from '@/core/data/classes';
import type { Stats } from '@/core/entities/Player';

const STAT_NAMES: (keyof Stats)[] = ['str', 'int', 'wis', 'dex', 'con', 'chr'];
const STAT_LABELS: Record<keyof Stats, string> = {
  str: 'Strength',
  int: 'Intelligence',
  wis: 'Wisdom',
  dex: 'Dexterity',
  con: 'Constitution',
  chr: 'Charisma',
};

export function StatsStep() {
  const { state, actions } = useGame();
  const creation = state.characterCreation;

  const raceKey = creation?.raceKey;
  const classKey = creation?.classKey;
  const race = raceKey ? (racesData[raceKey as keyof typeof racesData] as RaceDef) : null;
  const cls = classKey ? (classesData[classKey as keyof typeof classesData] as ClassDef) : null;

  if (!creation || !race || !cls) return null;

  const handleMinimumChange = (stat: keyof Stats, value: number) => {
    actions.dispatch({ type: 'setMinimum', stat, value });
  };

  const handleRoll = () => {
    actions.dispatch({ type: 'rollStats' });
  };

  const handleAutoroll = () => {
    actions.dispatch({ type: 'autoroll' });
  };

  const handleAccept = () => {
    actions.dispatch({ type: 'acceptStats' });
  };

  const formatMod = (val: number) => (val >= 0 ? `+${val}` : `${val}`);

  return (
    <div className="step-content stats-step-content">
      <div className="stats-header">
        <p className="step-description">
          Roll your character's base stats. Use the autoroller to find stats matching your minimums.
        </p>
        <div className="roll-count">Roll #{creation.rollCount}</div>
      </div>

      <table className="stats-table">
        <thead>
          <tr>
            <th>Stat</th>
            <th>Base</th>
            <th>Race</th>
            <th>Class</th>
            <th>Total</th>
            <th>Max</th>
            <th>Minimum</th>
          </tr>
        </thead>
        <tbody>
          {STAT_NAMES.map(stat => {
            const baseVal = creation.baseStats?.[stat] ?? 0;
            const raceBonus = race.stats[stat];
            const classBonus = cls.stats[stat];
            const finalVal = creation.finalStats?.[stat] ?? 0;
            const maxVal = 17 + raceBonus + classBonus;
            const minVal = creation.autorollerMinimums[stat];

            return (
              <tr key={stat}>
                <td className="stat-name-cell">{STAT_LABELS[stat]}</td>
                <td className="stat-base-cell">{baseVal || '—'}</td>
                <td className={`stat-mod-cell ${raceBonus > 0 ? 'positive' : raceBonus < 0 ? 'negative' : ''}`}>
                  {formatMod(raceBonus)}
                </td>
                <td className={`stat-mod-cell ${classBonus > 0 ? 'positive' : classBonus < 0 ? 'negative' : ''}`}>
                  {formatMod(classBonus)}
                </td>
                <td className="stat-total-cell">{finalVal || '—'}</td>
                <td className="stat-max-cell">{maxVal}</td>
                <td className="stat-min-cell">
                  <input
                    type="number"
                    min={3}
                    max={maxVal}
                    defaultValue={minVal > maxVal ? maxVal : minVal}
                    onBlur={e => {
                      const num = parseInt(e.target.value);
                      if (!isNaN(num) && num >= 3 && num <= maxVal) {
                        handleMinimumChange(stat, num);
                      } else {
                        e.target.value = String(Math.min(minVal, maxVal));
                      }
                    }}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="stats-actions">
        <button
          className="creation-btn creation-btn-secondary"
          onClick={handleRoll}
          disabled={creation.isAutorolling}
        >
          Roll Once
        </button>
        <button
          className="creation-btn creation-btn-secondary"
          onClick={handleAutoroll}
          disabled={creation.isAutorolling}
        >
          {creation.isAutorolling ? 'Rolling...' : 'Autoroll'}
        </button>
        <button
          className="creation-btn creation-btn-primary"
          onClick={handleAccept}
          disabled={!creation.finalStats}
        >
          Accept Stats
        </button>
      </div>
    </div>
  );
}
