import { test, expect, Page } from '@playwright/test'

// All 10 factions with their expected signature data
const FACTIONS = [
  { id: 'usa', name: 'United States', sigName: 'Global Policeman', sigDesc: 'Force any Regional War to end', needsTarget: false, hasModifier: false },
  { id: 'china', name: 'China', sigName: 'Debt Diplomacy', sigDesc: 'Convert enemy Trade Deal into Influence drain', needsTarget: true, hasModifier: false },
  { id: 'eu', name: 'European Union', sigName: 'Enlargement', sigDesc: 'Recruit to coalition at half relationship cost', needsTarget: false, hasModifier: true, modifierLabel: 'ENLARGEMENT (3T)' },
  { id: 'india', name: 'India', sigName: 'Strategic Autonomy', sigDesc: 'Immune to counter-coalition for 5 turns', needsTarget: false, hasModifier: true, modifierLabel: 'AUTONOMY (5T)' },
  { id: 'uk', name: 'United Kingdom', sigName: 'Soft Power', sigDesc: 'Info War generates INF instead of costing it', needsTarget: false, hasModifier: true, modifierLabel: 'SOFT POWER (3T)' },
  { id: 'russia', name: 'Russia', sigName: 'Hybrid Warfare', sigDesc: 'Info War + Intel Op combined in one action', needsTarget: true, hasModifier: false },
  { id: 'middleeast', name: 'Middle East', sigName: 'Oil Shock', sigDesc: 'All non-allied factions -10 ECO', needsTarget: false, hasModifier: false },
  { id: 'asean', name: 'ASEAN', sigName: 'Quiet Diplomacy', sigDesc: 'All DIP actions +25% effectiveness', needsTarget: false, hasModifier: true, modifierLabel: 'QUIET DIPLOMACY (3T)' },
  { id: 'latam', name: 'Latin America', sigName: 'Monroe Doctrine Reversal', sigDesc: 'USA cannot target LA for 5 turns', needsTarget: false, hasModifier: true, modifierLabel: 'MONROE REVERSAL (5T)' },
  { id: 'africa', name: 'African Union', sigName: 'Resource Nationalism', sigDesc: 'Economic crashes hit AU at half strength', needsTarget: false, hasModifier: true, modifierLabel: 'RESOURCE NATIONALISM' },
]

/**
 * Helper: Set a fake API key in localStorage so the game does not show the
 * API key modal and allows starting a game directly.
 */
async function setFakeApiKey(page: Page): Promise<void> {
  await page.addInitScript(() => {
    localStorage.setItem('geocmd_api_key', 'sk-ant-test-fake-key-for-e2e')
  })
}

/**
 * Helper: Dismiss the tutorial overlay by clicking SKIP.
 * The tutorial shows automatically on game start.
 */
async function dismissTutorial(page: Page): Promise<void> {
  // Wait for the tutorial tooltip to appear
  const skipBtn = page.getByText('SKIP', { exact: true })
  try {
    await skipBtn.waitFor({ state: 'visible', timeout: 3000 })
    await skipBtn.click()
    // Wait for the tutorial to fade out (1.5s delay + 0.3s transition)
    await page.waitForTimeout(2000)
  } catch {
    // Tutorial might not appear (already dismissed) — that's fine
  }
}

/**
 * Helper: Navigate to the app, start a game as `factionId`, dismiss tutorial.
 * Returns once the GameBoard is loaded and tutorial is dismissed.
 */
async function startGameAs(page: Page, factionId: string): Promise<void> {
  await page.goto('/')
  // Wait for faction select screen -- use exact match to avoid multiple hits
  await page.getByText('GEOPOLITICAL COMMAND', { exact: true }).waitFor({ timeout: 10000 })
  // Wait for faction cards to appear
  await page.waitForSelector('.faction-card', { timeout: 5000 })

  // Click the faction card that matches
  const factionData = FACTIONS.find(f => f.id === factionId)!
  const cards = page.locator('.faction-card')
  const count = await cards.count()
  let clicked = false
  for (let i = 0; i < count; i++) {
    const text = await cards.nth(i).textContent()
    if (text && text.includes(factionData.name.toUpperCase())) {
      await cards.nth(i).click()
      clicked = true
      break
    }
  }
  if (!clicked) {
    const factionIndex = FACTIONS.findIndex(f => f.id === factionId)
    await cards.nth(factionIndex).click()
  }

  // Wait for the game board to load
  await page.getByText('SIGNATURE ABILITY', { exact: false }).first().waitFor({ timeout: 8000 })

  // Dismiss the tutorial overlay so we can interact with the game
  await dismissTutorial(page)
}

/**
 * Helper: Select a target faction in the FactionList panel.
 */
async function selectTarget(page: Page, targetName: string): Promise<void> {
  const factionRows = page.locator('.faction-row')
  const count = await factionRows.count()
  for (let i = 0; i < count; i++) {
    const text = await factionRows.nth(i).textContent()
    if (text && text.includes(targetName)) {
      await factionRows.nth(i).click()
      await page.waitForTimeout(300)
      return
    }
  }
  throw new Error(`Could not find target faction: ${targetName}`)
}

/**
 * Helper: Get the signature badge text (ACTIVATE / USED / SELECT TARGET).
 * Returns the locator for the badge span inside the signature card.
 * The signature section is identified by the "SIGNATURE ABILITY" label.
 */
function getSignatureBadge(page: Page, badgeText: string) {
  // The signature ability section is a container div right after the
  // "SIGNATURE ABILITY" header. Use the parent container approach.
  // Badge texts: "ACTIVATE", "USED", "SELECT TARGET"
  return page.getByText(badgeText, { exact: true })
}


// ============================================================================
// TEST SUITE: Signature Abilities
// ============================================================================

test.describe('Signature Abilities', () => {

  test.beforeEach(async ({ page }) => {
    await setFakeApiKey(page)
  })

  // --------------------------------------------------------------------------
  // 1. App loads and shows faction select screen with 10 factions
  // --------------------------------------------------------------------------
  test('app loads and shows faction select screen', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('GEOPOLITICAL COMMAND', { exact: true })).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.faction-card').first()).toBeVisible({ timeout: 5000 })
    const cardCount = await page.locator('.faction-card').count()
    expect(cardCount).toBe(10)
  })

  // --------------------------------------------------------------------------
  // 2. Signature panel visibility for USA
  // --------------------------------------------------------------------------
  test('signature panel appears with correct name for USA (Global Policeman)', async ({ page }) => {
    await startGameAs(page, 'usa')

    // The "SIGNATURE ABILITY" header should be visible
    await expect(page.getByText('SIGNATURE ABILITY')).toBeVisible()

    // The signature name should be visible (rendered as "diamond Global Policeman")
    await expect(page.getByText('Global Policeman')).toBeVisible()

    // The description should be visible
    await expect(page.getByText('Force any Regional War to end')).toBeVisible()

    await page.screenshot({ path: 'tests/e2e/screenshots/usa-signature-panel.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 3. China shows SELECT TARGET when no target
  // --------------------------------------------------------------------------
  test('China shows SELECT TARGET badge when no target is selected', async ({ page }) => {
    await startGameAs(page, 'china')

    await expect(page.getByText('Debt Diplomacy')).toBeVisible()

    // The signature badge should say "SELECT TARGET" (exact match avoids
    // the faction list header which says "① SELECT TARGET")
    await expect(getSignatureBadge(page, 'SELECT TARGET')).toBeVisible()

    // ACTIVATE should not be present as exact text
    await expect(getSignatureBadge(page, 'ACTIVATE')).not.toBeVisible()

    await page.screenshot({ path: 'tests/e2e/screenshots/china-select-target.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 3b. Russia also shows SELECT TARGET when no target
  // --------------------------------------------------------------------------
  test('Russia shows SELECT TARGET badge when no target is selected', async ({ page }) => {
    await startGameAs(page, 'russia')

    await expect(page.getByText('Hybrid Warfare')).toBeVisible()
    await expect(getSignatureBadge(page, 'SELECT TARGET')).toBeVisible()

    await page.screenshot({ path: 'tests/e2e/screenshots/russia-select-target.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 4. USA: ACTIVATE fires signature, shows USED
  // --------------------------------------------------------------------------
  test('USA: ACTIVATE fires Global Policeman, USED badge appears', async ({ page }) => {
    await startGameAs(page, 'usa')

    // USA does not need a target - should show ACTIVATE
    const activateBtn = getSignatureBadge(page, 'ACTIVATE')
    await expect(activateBtn).toBeVisible()

    // Click ACTIVATE
    await activateBtn.click()

    // After activation, USED badge appears
    await expect(getSignatureBadge(page, 'USED')).toBeVisible({ timeout: 3000 })

    // ACTIVATE badge is gone
    await expect(getSignatureBadge(page, 'ACTIVATE')).not.toBeVisible()

    await page.screenshot({ path: 'tests/e2e/screenshots/usa-signature-used.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 5. China: select target then ACTIVATE
  // --------------------------------------------------------------------------
  test('China: select target then ACTIVATE fires Debt Diplomacy', async ({ page }) => {
    await startGameAs(page, 'china')

    // Initially shows SELECT TARGET
    await expect(getSignatureBadge(page, 'SELECT TARGET')).toBeVisible()

    // Select USA as target
    await selectTarget(page, 'United States')

    // Now ACTIVATE should appear
    const activateBtn = getSignatureBadge(page, 'ACTIVATE')
    await expect(activateBtn).toBeVisible({ timeout: 3000 })

    // Click ACTIVATE
    await activateBtn.click()

    // USED badge appears
    await expect(getSignatureBadge(page, 'USED')).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'tests/e2e/screenshots/china-debt-diplomacy-used.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 6. UK: Soft Power modifier badge
  // --------------------------------------------------------------------------
  test('UK: Soft Power activation shows modifier badge with turn counter', async ({ page }) => {
    await startGameAs(page, 'uk')

    await expect(page.getByText('Soft Power')).toBeVisible()

    const activateBtn = getSignatureBadge(page, 'ACTIVATE')
    await expect(activateBtn).toBeVisible()
    await activateBtn.click()

    await expect(getSignatureBadge(page, 'USED')).toBeVisible({ timeout: 3000 })

    // Modifier badge with turn counter
    await expect(page.getByText('SOFT POWER (3T)')).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'tests/e2e/screenshots/uk-soft-power-modifier.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 7. Used state is permanent (EU Enlargement)
  // --------------------------------------------------------------------------
  test('signature cannot be activated twice (USED state is permanent)', async ({ page }) => {
    await startGameAs(page, 'eu')

    await expect(page.getByText('Enlargement')).toBeVisible()
    const activateBtn = getSignatureBadge(page, 'ACTIVATE')
    await expect(activateBtn).toBeVisible()

    // Activate
    await activateBtn.click()
    await expect(getSignatureBadge(page, 'USED')).toBeVisible({ timeout: 3000 })

    // Verify modifier badge
    await expect(page.getByText('ENLARGEMENT (3T)')).toBeVisible({ timeout: 3000 })

    // Click the signature card area again - should do nothing
    // Use the diamond-prefixed name to target only the signature card text
    await page.getByText('◆ Enlargement').click()
    await page.waitForTimeout(500)

    // Still shows USED
    await expect(getSignatureBadge(page, 'USED')).toBeVisible()

    // Modifier count should still be 1
    const modBadges = page.getByText('ENLARGEMENT (3T)')
    expect(await modBadges.count()).toBe(1)

    await page.screenshot({ path: 'tests/e2e/screenshots/eu-used-permanent.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 8. All 10 factions: signature name appears correctly
  // --------------------------------------------------------------------------
  for (const faction of FACTIONS) {
    test(`faction ${faction.id}: signature name "${faction.sigName}" is correct`, async ({ page }) => {
      await startGameAs(page, faction.id)

      await expect(page.getByText('SIGNATURE ABILITY')).toBeVisible()
      await expect(page.getByText(faction.sigName)).toBeVisible({ timeout: 3000 })

      await page.screenshot({
        path: `tests/e2e/screenshots/${faction.id}-signature.png`,
        fullPage: false,
      })
    })
  }

  // --------------------------------------------------------------------------
  // 9. India: Strategic Autonomy modifier
  // --------------------------------------------------------------------------
  test('India: Strategic Autonomy shows AUTONOMY (5T) modifier', async ({ page }) => {
    await startGameAs(page, 'india')
    await expect(page.getByText('Strategic Autonomy')).toBeVisible()

    await getSignatureBadge(page, 'ACTIVATE').click()
    await expect(getSignatureBadge(page, 'USED')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('AUTONOMY (5T)')).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'tests/e2e/screenshots/india-autonomy-modifier.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 10. Russia with target: Hybrid Warfare
  // --------------------------------------------------------------------------
  test('Russia: select target then Hybrid Warfare activates', async ({ page }) => {
    await startGameAs(page, 'russia')
    await expect(page.getByText('Hybrid Warfare')).toBeVisible()
    await expect(getSignatureBadge(page, 'SELECT TARGET')).toBeVisible()

    // Select China as target
    await selectTarget(page, 'China')

    const activateBtn = getSignatureBadge(page, 'ACTIVATE')
    await expect(activateBtn).toBeVisible({ timeout: 3000 })
    await activateBtn.click()

    await expect(getSignatureBadge(page, 'USED')).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'tests/e2e/screenshots/russia-hybrid-warfare-used.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 11. Middle East: Oil Shock (instant, no modifier)
  // --------------------------------------------------------------------------
  test('Middle East: Oil Shock activates without needing target', async ({ page }) => {
    await startGameAs(page, 'middleeast')
    await expect(page.getByText('Oil Shock')).toBeVisible()

    await getSignatureBadge(page, 'ACTIVATE').click()
    await expect(getSignatureBadge(page, 'USED')).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'tests/e2e/screenshots/middleeast-oil-shock-used.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 12. ASEAN: Quiet Diplomacy modifier
  // --------------------------------------------------------------------------
  test('ASEAN: Quiet Diplomacy shows modifier badge', async ({ page }) => {
    await startGameAs(page, 'asean')
    await expect(page.getByText('Quiet Diplomacy')).toBeVisible()

    await getSignatureBadge(page, 'ACTIVATE').click()
    await expect(getSignatureBadge(page, 'USED')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('QUIET DIPLOMACY (3T)')).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'tests/e2e/screenshots/asean-quiet-diplomacy-modifier.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 13. Latin America: Monroe Doctrine Reversal modifier
  // --------------------------------------------------------------------------
  test('Latin America: Monroe Doctrine Reversal shows modifier badge', async ({ page }) => {
    await startGameAs(page, 'latam')
    await expect(page.getByText('Monroe Doctrine Reversal')).toBeVisible()

    await getSignatureBadge(page, 'ACTIVATE').click()
    await expect(getSignatureBadge(page, 'USED')).toBeVisible({ timeout: 3000 })
    await expect(page.getByText('MONROE REVERSAL (5T)')).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'tests/e2e/screenshots/latam-monroe-reversal-modifier.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 14. Africa: Resource Nationalism permanent modifier
  // --------------------------------------------------------------------------
  test('Africa: Resource Nationalism shows permanent modifier badge', async ({ page }) => {
    await startGameAs(page, 'africa')
    await expect(page.getByText('Resource Nationalism')).toBeVisible()

    await getSignatureBadge(page, 'ACTIVATE').click()
    await expect(getSignatureBadge(page, 'USED')).toBeVisible({ timeout: 3000 })
    // Permanent modifier (turnsRemaining=999) shows infinity symbol
    // Use exact modifier badge text to avoid matching signature name and news feed
    await expect(page.getByText('RESOURCE NATIONALISM', { exact: false }).filter({ hasText: '∞' })).toBeVisible({ timeout: 3000 })

    await page.screenshot({ path: 'tests/e2e/screenshots/africa-resource-nationalism-modifier.png', fullPage: false })
  })

  // --------------------------------------------------------------------------
  // 15. Non-target factions show ACTIVATE immediately
  // --------------------------------------------------------------------------
  test('non-target factions show ACTIVATE without needing target selection', async ({ page }) => {
    await startGameAs(page, 'usa')
    await expect(getSignatureBadge(page, 'ACTIVATE')).toBeVisible()
    // "SELECT TARGET" badge should NOT appear in the signature section
    // (It exists in faction list header but not in signature area)
    await expect(getSignatureBadge(page, 'SELECT TARGET')).not.toBeVisible()
  })

  // --------------------------------------------------------------------------
  // 16. Signature card cursor changes based on state
  // --------------------------------------------------------------------------
  test('signature card shows pointer cursor when activatable, not-allowed when used', async ({ page }) => {
    await startGameAs(page, 'usa')

    // Before activation: cursor should be pointer
    // Target the specific diamond-prefixed signature name to find the card
    const sigNameLocator = page.getByText('◆ Global Policeman')
    const card = sigNameLocator.locator('..')
    const cursorBefore = await card.evaluate(el => getComputedStyle(el).cursor)
    expect(cursorBefore).toBe('pointer')

    // Activate
    await getSignatureBadge(page, 'ACTIVATE').click()
    await expect(getSignatureBadge(page, 'USED')).toBeVisible({ timeout: 3000 })

    // After activation: cursor should be not-allowed
    const cursorAfter = await card.evaluate(el => getComputedStyle(el).cursor)
    expect(cursorAfter).toBe('not-allowed')
  })

  // --------------------------------------------------------------------------
  // 17. China: ACTIVATE badge transitions after target selection
  // --------------------------------------------------------------------------
  test('China: ACTIVATE badge transitions from SELECT TARGET to ACTIVATE on target pick', async ({ page }) => {
    await startGameAs(page, 'china')

    // Initially: SELECT TARGET visible
    await expect(getSignatureBadge(page, 'SELECT TARGET')).toBeVisible()

    // Select a target
    await selectTarget(page, 'European Union')

    // Now: ACTIVATE visible
    await expect(getSignatureBadge(page, 'ACTIVATE')).toBeVisible({ timeout: 3000 })
  })
})
