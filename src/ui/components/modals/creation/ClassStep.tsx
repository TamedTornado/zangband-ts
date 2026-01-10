import { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import { canSelectClass } from '@/core/systems/StatRoller';
import racesData from '@/data/races/races.json';
import classesData from '@/data/classes/classes.json';
import classDescriptions from '@/data/descriptions/classes.json';
import type { RaceDef } from '@/core/data/races';
import type { ClassDef } from '@/core/data/classes';

const classes = Object.entries(classesData) as [string, ClassDef][];

export function ClassStep() {
  const { state, actions } = useGame();
  const [hoveredClass, setHoveredClass] = useState<string | null>(null);

  const raceKey = state.characterCreation?.raceKey;
  const race = raceKey ? (racesData[raceKey as keyof typeof racesData] as RaceDef) : null;
  const selectedClass = state.characterCreation?.classKey;

  const handleSelect = (classKey: string) => {
    actions.dispatch({ type: 'selectClass', classKey });
  };

  // Show details for hovered class, or selected class, or first class
  const displayKey = hoveredClass ?? selectedClass ?? classes[0]?.[0];
  const displayClass = displayKey
    ? (classesData[displayKey as keyof typeof classesData] as ClassDef)
    : null;
  const displayDesc = displayKey
    ? (classDescriptions[displayKey as keyof typeof classDescriptions] ?? null)
    : null;

  return (
    <div className="step-content step-with-details">
      <div className="step-list-panel">
        <div className="option-list">
          {classes.map(([key, cls]) => {
            const isRecommended = race ? canSelectClass(race, cls) : true;
            return (
              <label
                key={key}
                className={`option-list-item ${selectedClass === key ? 'selected' : ''} ${!isRecommended ? 'not-recommended' : ''}`}
                onMouseEnter={() => setHoveredClass(key)}
                onMouseLeave={() => setHoveredClass(null)}
              >
                <input
                  type="radio"
                  name="class"
                  checked={selectedClass === key}
                  onChange={() => handleSelect(key)}
                />
                <span className="option-name">{cls.name}</span>
                {!isRecommended && <span className="option-warning">!</span>}
              </label>
            );
          })}
        </div>
      </div>

      <div className="step-details-panel">
        {displayClass && <ClassDetails cls={displayClass} description={displayDesc} />}
      </div>
    </div>
  );
}

function ClassDetails({ cls, description }: { cls: ClassDef; description: string | null }) {
  const stats = cls.stats;
  const skills = cls.skills;

  const formatMod = (val: number) => (val >= 0 ? `+${val}` : `${val}`);
  const modClass = (val: number) => (val > 0 ? 'positive' : val < 0 ? 'negative' : 'neutral');

  return (
    <div className="details-card">
      <h3 className="details-title">{cls.name}</h3>

      {description && (
        <p className="details-description">{description}</p>
      )}

      <div className="details-section">
        <h4>Stat Modifiers</h4>
        <div className="stat-mods">
          <div className={`stat-mod ${modClass(stats.str)}`}>
            <span className="stat-abbr">STR</span>
            <span className="stat-val">{formatMod(stats.str)}</span>
          </div>
          <div className={`stat-mod ${modClass(stats.int)}`}>
            <span className="stat-abbr">INT</span>
            <span className="stat-val">{formatMod(stats.int)}</span>
          </div>
          <div className={`stat-mod ${modClass(stats.wis)}`}>
            <span className="stat-abbr">WIS</span>
            <span className="stat-val">{formatMod(stats.wis)}</span>
          </div>
          <div className={`stat-mod ${modClass(stats.dex)}`}>
            <span className="stat-abbr">DEX</span>
            <span className="stat-val">{formatMod(stats.dex)}</span>
          </div>
          <div className={`stat-mod ${modClass(stats.con)}`}>
            <span className="stat-abbr">CON</span>
            <span className="stat-val">{formatMod(stats.con)}</span>
          </div>
          <div className={`stat-mod ${modClass(stats.chr)}`}>
            <span className="stat-abbr">CHR</span>
            <span className="stat-val">{formatMod(stats.chr)}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Skills</h4>
        <div className="skill-mods">
          <div className={`skill-mod ${modClass(skills.disarm)}`}>
            <span className="skill-abbr">Disarm</span>
            <span className="skill-val">{formatMod(skills.disarm)}</span>
          </div>
          <div className={`skill-mod ${modClass(skills.device)}`}>
            <span className="skill-abbr">Device</span>
            <span className="skill-val">{formatMod(skills.device)}</span>
          </div>
          <div className={`skill-mod ${modClass(skills.save)}`}>
            <span className="skill-abbr">Save</span>
            <span className="skill-val">{formatMod(skills.save)}</span>
          </div>
          <div className={`skill-mod ${modClass(skills.stealth)}`}>
            <span className="skill-abbr">Stealth</span>
            <span className="skill-val">{formatMod(skills.stealth)}</span>
          </div>
          <div className={`skill-mod ${modClass(skills.melee)}`}>
            <span className="skill-abbr">Melee</span>
            <span className="skill-val">{formatMod(skills.melee)}</span>
          </div>
          <div className={`skill-mod ${modClass(skills.ranged)}`}>
            <span className="skill-abbr">Ranged</span>
            <span className="skill-val">{formatMod(skills.ranged)}</span>
          </div>
        </div>
      </div>

      <div className="details-section">
        <h4>Traits</h4>
        <div className="traits-list">
          <div className="trait">
            <span className="trait-label">Hit Die Bonus:</span>
            <span className="trait-value">+{cls.hitDie}</span>
          </div>
          <div className="trait">
            <span className="trait-label">XP Modifier:</span>
            <span className="trait-value">+{cls.expMod}%</span>
          </div>
          {cls.spellStat && (
            <div className="trait">
              <span className="trait-label">Spell Stat:</span>
              <span className="trait-value">{cls.spellStat.toUpperCase()}</span>
            </div>
          )}
          {cls.realms.length > 0 && (
            <div className="trait">
              <span className="trait-label">Magic Realms:</span>
              <span className="trait-value">{cls.realms.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
