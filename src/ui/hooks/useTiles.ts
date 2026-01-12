import { useState, useEffect, useMemo } from 'react';
import { TileManager } from '@/core/systems/TileManager';
import { useSettingsStore } from '@/core/store/settingsStore';
import tilesets from '@/data/tiles/tilesets.json';
import adamBoltMappings from '@/data/tiles/adam-bolt-mappings.json';

interface TileResources {
  tileManager: TileManager | null;
  tileImage: HTMLImageElement | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to manage tile resources - loads tileset image and creates TileManager
 */
export function useTiles(): TileResources {
  const { useTiles, tilesetKey } = useSettingsStore();
  const [tileImage, setTileImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get tileset config
  const tilesetConfig = useMemo(() => {
    const config = tilesets.tilesets[tilesetKey as keyof typeof tilesets.tilesets];
    if (!config) {
      return tilesets.tilesets[tilesets.default as keyof typeof tilesets.tilesets];
    }
    return config;
  }, [tilesetKey]);

  // Create TileManager (mappings are static for now)
  const tileManager = useMemo(() => {
    if (!tilesetConfig) return null;
    return new TileManager(tilesetConfig, adamBoltMappings);
  }, [tilesetConfig]);

  // Load tile image when tiles are enabled
  useEffect(() => {
    console.log('[useTiles] Effect running, useTiles:', useTiles, 'tilesetConfig:', tilesetConfig);
    if (!useTiles || !tilesetConfig) {
      setTileImage(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    const img = new Image();
    img.onload = () => {
      console.log('[useTiles] Image loaded successfully:', img.width, 'x', img.height);
      setTileImage(img);
      setIsLoading(false);
    };
    img.onerror = (e) => {
      console.error('[useTiles] Image load error:', e);
      setError(`Failed to load tileset: ${tilesetConfig.file}`);
      setIsLoading(false);
    };
    const imgSrc = `/tiles/${tilesetConfig.file}`;
    console.log('[useTiles] Loading image from:', imgSrc);
    img.src = imgSrc;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [useTiles, tilesetConfig]);

  return {
    tileManager: useTiles ? tileManager : null,
    tileImage: useTiles ? tileImage : null,
    isLoading,
    error,
  };
}
