import { useGame } from '../../../context/GameContext';
import racesData from '@/data/races/races.json';
import classesData from '@/data/classes/classes.json';
import type { RaceDef } from '@/core/data/races';
import type { ClassDef } from '@/core/data/classes';

export function ConfirmStep() {
  const { state } = useGame();
  const creation = state.characterCreation;

  const race = creation?.raceKey
    ? (racesData[creation.raceKey as keyof typeof racesData] as RaceDef)
    : null;
  const cls = creation?.classKey
    ? (classesData[creation.classKey as keyof typeof classesData] as ClassDef)
    : null;

  if (!creation || !race || !cls) return null;

  return (
    <div className="step-content confirm-step-content">
      <p className="step-description">
        Review your character before starting the adventure.
      </p>

      <div className="confirm-grid">
        <div className="confirm-section">
          <h4>Identity</h4>
          <div className="confirm-row">
            <span className="confirm-label">Name:</span>
            <span className="confirm-value">{creation.name}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Sex:</span>
            <span className="confirm-value">{creation.sex === 'male' ? 'Male' : 'Female'}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Race:</span>
            <span className="confirm-value">{race.name}</span>
          </div>
          <div className="confirm-row">
            <span className="confirm-label">Class:</span>
            <span className="confirm-value">{cls.name}</span>
          </div>
          {creation.primaryRealm && (
            <div className="confirm-row">
              <span className="confirm-label">Magic:</span>
              <span className="confirm-value">
                {creation.primaryRealm.charAt(0).toUpperCase() + creation.primaryRealm.slice(1)}
                {creation.secondaryRealm && ` / ${creation.secondaryRealm.charAt(0).toUpperCase() + creation.secondaryRealm.slice(1)}`}
              </span>
            </div>
          )}
        </div>

        <div className="confirm-section">
          <h4>Final Stats</h4>
          <div className="confirm-stats">
            <div className="confirm-stat">
              <span className="stat-abbr">STR</span>
              <span className="stat-val">{creation.finalStats?.str}</span>
            </div>
            <div className="confirm-stat">
              <span className="stat-abbr">INT</span>
              <span className="stat-val">{creation.finalStats?.int}</span>
            </div>
            <div className="confirm-stat">
              <span className="stat-abbr">WIS</span>
              <span className="stat-val">{creation.finalStats?.wis}</span>
            </div>
            <div className="confirm-stat">
              <span className="stat-abbr">DEX</span>
              <span className="stat-val">{creation.finalStats?.dex}</span>
            </div>
            <div className="confirm-stat">
              <span className="stat-abbr">CON</span>
              <span className="stat-val">{creation.finalStats?.con}</span>
            </div>
            <div className="confirm-stat">
              <span className="stat-abbr">CHR</span>
              <span className="stat-val">{creation.finalStats?.chr}</span>
            </div>
          </div>
        </div>
      </div>

      <p className="confirm-hint">
        Click "Start Game" below to begin your adventure!
      </p>
    </div>
  );
}
