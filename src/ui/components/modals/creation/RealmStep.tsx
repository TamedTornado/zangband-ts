import { useGame } from '../../../context/GameContext';
import classesData from '@/data/classes/classes.json';
import type { ClassDef } from '@/core/data/classes';

const REALM_INFO: Record<string, { description: string }> = {
  life: { description: 'Protective magic, healing, and holy power against evil.' },
  sorcery: { description: 'Utility spells: detection, identification, teleportation.' },
  nature: { description: 'Elemental magic and nature-based offensive/defensive spells.' },
  chaos: { description: 'Destructive and unpredictable offensive magic.' },
  death: { description: 'Dark necromantic powers and life-draining attacks.' },
  trump: { description: 'Teleportation mastery and summoning creatures.' },
  arcane: { description: 'General-purpose utility and minor combat magic.' },
};

export function RealmStep() {
  const { state, actions } = useGame();
  const creation = state.characterCreation;

  const classKey = creation?.classKey;
  const classDef = classKey ? (classesData[classKey as keyof typeof classesData] as ClassDef) : null;
  const isPrimary = creation?.isSelectingPrimaryRealm ?? true;
  const selectedRealm = isPrimary ? creation?.primaryRealm : creation?.secondaryRealm;

  // Filter realms - can't pick same realm twice
  const availableRealms = classDef?.realms.filter(r =>
    isPrimary ? true : r !== creation?.primaryRealm
  ) ?? [];

  const handleSelect = (realm: string) => {
    actions.dispatch({ type: 'selectRealm', realm });
  };

  return (
    <div className="step-content">
      <p className="step-description">
        {isPrimary
          ? 'Choose your primary magic realm. This determines your main spellbook.'
          : 'Choose your secondary magic realm for additional spells.'}
      </p>

      <div className="realm-cards">
        {availableRealms.map((realm) => {
          const info = REALM_INFO[realm];
          return (
            <label
              key={realm}
              className={`realm-card ${selectedRealm === realm ? 'selected' : ''}`}
            >
              <input
                type="radio"
                name="realm"
                checked={selectedRealm === realm}
                onChange={() => handleSelect(realm)}
              />
              <div className="realm-card-content">
                <span className="realm-name">{realm.charAt(0).toUpperCase() + realm.slice(1)}</span>
                <span className="realm-desc">{info?.description ?? ''}</span>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
