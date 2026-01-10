/**
 * Pricing System - calculates buy/sell prices for stores
 *
 * Based on Zangband's store.c price_item() function.
 *
 * Key concepts:
 * - Charisma factor: affects all prices (80-130 range, higher = worse for player)
 * - Greed: store owner personality (100 = neutral, higher = greedier)
 * - Buy price: what store pays player when player sells
 * - Sell price: what player pays store when player buys
 */
export class PricingSystem {
  /**
   * Get charisma adjustment factor.
   *
   * From Zangband: charisma 3 = 130 (worst), charisma 18 = 80 (best)
   * Linear interpolation between these points.
   *
   * Lower factor = better prices for the player.
   *
   * @param charisma Player's charisma stat (typically 3-18+)
   * @returns Factor from ~60 to 130
   */
  static getCharismaFactor(charisma: number): number {
    // Zangband formula: adj_chr_gold table lookup
    // Simplified: linear interpolation
    // CHR 3 = 130, CHR 18 = 80
    // slope = (80 - 130) / (18 - 3) = -50/15 = -3.33...

    // Clamp minimum charisma to 3
    const chr = Math.max(3, charisma);

    // Calculate factor: 130 - (chr - 3) * 50 / 15
    const factor = Math.round(130 - ((chr - 3) * 50) / 15);

    // Minimum factor is around 50-60 for very high charisma
    return Math.max(50, factor);
  }

  /**
   * Calculate sell price (player buys from store).
   *
   * Formula: baseValue * greed / 100 * charismaFactor / 100
   * Black market: price * 2
   *
   * @param baseValue Item's base value
   * @param greed Store owner's greed (100 = neutral)
   * @param charismaFactor Player's charisma factor (from getCharismaFactor)
   * @param isBlackMarket Whether this is a black market store
   * @returns Price player must pay
   */
  static calculateSellPrice(
    baseValue: number,
    greed: number,
    charismaFactor: number,
    isBlackMarket: boolean = false
  ): number {
    // Apply greed (higher greed = higher price)
    let price = (baseValue * greed) / 100;

    // Apply charisma factor (lower factor = lower price, benefits player)
    price = (price * charismaFactor) / 100;

    // Black market markup
    if (isBlackMarket) {
      price *= 2;
    }

    // Round and ensure minimum 1 gold
    return Math.max(1, Math.round(price));
  }

  /**
   * Calculate buy price (player sells to store).
   *
   * Formula: baseValue * 100 / greed * 100 / charismaFactor
   * Capped at owner's purse limit.
   * Black market: price / 2
   *
   * @param baseValue Item's base value
   * @param greed Store owner's greed (100 = neutral)
   * @param charismaFactor Player's charisma factor (from getCharismaFactor)
   * @param maxPurse Maximum gold the store owner will pay
   * @param isBlackMarket Whether this is a black market store
   * @returns Price player receives
   */
  static calculateBuyPrice(
    baseValue: number,
    greed: number,
    charismaFactor: number,
    maxPurse: number,
    isBlackMarket: boolean = false
  ): number {
    // Apply greed (higher greed = lower price for player)
    let price = (baseValue * 100) / greed;

    // Apply charisma factor (lower factor = higher price, benefits player)
    price = (price * 100) / charismaFactor;

    // Black market pays half
    if (isBlackMarket) {
      price = Math.floor(price / 2);
    }

    // Cap at owner's purse limit
    price = Math.min(price, maxPurse);

    // Round and ensure minimum 1 gold
    return Math.max(1, Math.round(price));
  }

  /**
   * Convenience method to calculate sell price using player charisma.
   */
  static getSellPrice(
    baseValue: number,
    greed: number,
    playerCharisma: number,
    isBlackMarket: boolean = false
  ): number {
    const charismaFactor = this.getCharismaFactor(playerCharisma);
    return this.calculateSellPrice(baseValue, greed, charismaFactor, isBlackMarket);
  }

  /**
   * Convenience method to calculate buy price using player charisma.
   */
  static getBuyPrice(
    baseValue: number,
    greed: number,
    playerCharisma: number,
    maxPurse: number,
    isBlackMarket: boolean = false
  ): number {
    const charismaFactor = this.getCharismaFactor(playerCharisma);
    return this.calculateBuyPrice(baseValue, greed, charismaFactor, maxPurse, isBlackMarket);
  }
}
