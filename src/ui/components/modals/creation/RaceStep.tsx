import { useState } from 'react';
import { useGame } from '../../../context/GameContext';
import racesData from '@/data/races/races.json';
import raceDescriptions from '@/data/descriptions/races.json';
import type { RaceDef } from '@/core/data/races';

const races = Object.entries(racesData) as [string, RaceDef][];

export function RaceStep() {
  const { state, actions } = useGame();
  const [hoveredRace, setHoveredRace] = useState<string | null>(null);
  const selectedRace = state.characterCreation?.raceKey;

  const handleSelect = (raceKey: string) => {
    actions.dispatch({ type: 'selectRace', raceKey });
  };

  // Show details for hovered race, or selected race, or first race
  const displayKey = hoveredRace ?? selectedRace ?? races[0]?.[0];
  const displayRace = displayKey
    ? (racesData[displayKey as keyof typeof racesData] as RaceDef)
    : null;
  const displayDesc = displayKey
    ? (raceDescriptions[displayKey as keyof typeof raceDescriptions] ?? null)
    : null;

  return (
    <div className="step-content step-with-details">
      <div className="step-list-panel">
        <div className="option-list">
          {races.map(([key, race]) => (
            <label
              key={key}
              className={`option-list-item ${selectedRace === key ? 'selected' : ''}`}
              onMouseEnter={() => setHoveredRace(key)}
              onMouseLeave={() => setHoveredRace(null)}
            >
              <input
                type="radio"
                name="race"
                checked={selectedRace === key}
                onChange={() => handleSelect(key)}
              />
              <span className="option-name">{race.name}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="step-details-panel">
        {displayRace && <RaceDetails race={displayRace} description={displayDesc} />}
      </div>
    </div>
  );
}

function RaceDetails({ race, description }: { race: RaceDef; description: string | null }) {
  const stats = race.stats;
  const skills = race.skills;

  const formatMod = (val: number) => (val >= 0 ? `+${val}` : `${val}`);
  const modClass = (val: number) => (val > 0 ? 'positive' : val < 0 ? 'negative' : 'neutral');

  return (
    <div className="details-card">
      <h3 className="details-title">{race.name}</h3>

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
            <span className="trait-label">Hit Die:</span>
            <span className="trait-value">{race.hitDie}</span>
          </div>
          <div className="trait">
            <span className="trait-label">XP Modifier:</span>
            <span className="trait-value">{race.expMod}%</span>
          </div>
          <div className="trait">
            <span className="trait-label">Infravision:</span>
            <span className="trait-value">{race.infravision * 10} ft</span>
          </div>
        </div>
      </div>
    </div>
  );
}
