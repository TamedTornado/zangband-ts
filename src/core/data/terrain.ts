export interface TerrainDef {
  id: number;
  name: string;
  symbol: string;
  color: string;
  flags: string[];
}

export function parseTerrain(text: string): TerrainDef[] {
  const lines = text.split('\n');
  const terrain: TerrainDef[] = [];
  let current: TerrainDef | null = null;

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, comments, and version
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('V:')) {
      continue;
    }

    const [prefix, ...rest] = trimmed.split(':');
    const value = rest.join(':'); // Rejoin in case value contains colons

    switch (prefix) {
      case 'N': {
        // Save previous entry
        if (current) {
          terrain.push(current);
        }
        const [idStr, name] = value.split(':');
        current = {
          id: parseInt(idStr ?? '0', 10),
          name: name ?? '',
          symbol: ' ',
          color: 'w',
          flags: [],
        };
        break;
      }
      case 'G': {
        if (current) {
          const [symbol, color] = value.split(':');
          current.symbol = symbol ?? ' ';
          current.color = color ?? 'w';
        }
        break;
      }
      case 'F': {
        if (current) {
          const newFlags = value
            .split('|')
            .map((f) => f.trim())
            .filter((f) => f.length > 0);
          current.flags.push(...newFlags);
        }
        break;
      }
    }
  }

  // Don't forget the last entry
  if (current) {
    terrain.push(current);
  }

  return terrain;
}
