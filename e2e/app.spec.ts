/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from '@playwright/test'

// Reset database helper
async function resetDatabase(page: any) {
  await page.evaluate(() => {
    const dbs = indexedDB.databases ? indexedDB.databases() : Promise.resolve([])
    return dbs.then((databases: any) => {
      databases.forEach((db: any) => indexedDB.deleteDatabase(db.name))
    })
  })
}

// Helper to setup app with clean database
async function setupApp(page: any) {
  await page.goto('/')
  await resetDatabase(page)
  await page.reload()
  await page.waitForSelector('.app-layout', { timeout: 10000 })
}

// Helper to add a test card
async function addCard(page: any, name: string, barcodeData: string) {
  await page.goto('/#/add')
  await page.waitForLoadState('domcontentloaded')
  await page.fill('input[placeholder*="Starbucks"]', name)
  await page.locator('.input-label:has-text("Barcode Data") + input').fill(barcodeData)
  await page.click('.color-preset')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/#\/$/, { timeout: 10000 })
  await page.waitForSelector('.card-item-wrapper', { timeout: 5000 })
}

test.describe('Loyalty Card Vault E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await setupApp(page)
  })

  test('1. App loads directly to home', async ({ page }) => {
    // App should be on home page (already navigated in setupApp)
    await expect(page.locator('.app-layout')).toBeVisible()
    await expect(page.getByText('No cards yet')).toBeVisible()
  })

  test('2. Add a new card', async ({ page }) => {
    await addCard(page, 'Starbucks', '123456789012')
    await expect(page.getByText('Starbucks')).toBeVisible()
  })

  test('3. View card details', async ({ page }) => {
    await addCard(page, 'Target', '987654321098')
    await page.click('.card-item-wrapper')
    await expect(page.getByText('Target')).toBeVisible()
    await expect(page.getByText('987654321098')).toBeVisible()
  })

  test('4. Edit a card', async ({ page }) => {
    await addCard(page, 'Old Name', '111111111111')
    await page.click('.card-item-wrapper')
    await page.click('button:has-text("Edit")')

    await page.fill('input[value="Old Name"]', 'New Name')
    await page.click('button[type="submit"]')

    await page.waitForTimeout(1000)
    await page.goto('/#/')
    await page.waitForSelector('.card-item-wrapper', { timeout: 5000 })
    await expect(page.getByText('New Name')).toBeVisible()
  })

  test('5. Delete a card', async ({ page }) => {
    await addCard(page, 'To Delete', '222222222222')
    await page.click('.card-item-wrapper')
    await page.click('button:has-text("Edit"):first-child >> .. >> button:has-text("Delete")')
    await page.waitForSelector('.modal')
    await page.click('.modal .btn--danger:has-text("Delete")')

    await page.waitForURL(/\/#\/$/, { timeout: 5000 })
    await expect(page.getByText('To Delete')).not.toBeVisible()
  })

  test('6. Navigate between pages', async ({ page }) => {
    await page.click('.nav-item:has-text("Settings")')
    await expect(page).toHaveURL(/\/#\/settings/)

    await page.click('.nav-item:has-text("Add")')
    await expect(page).toHaveURL(/\/#\/add/)

    await page.click('.nav-item:has-text("Cards")')
    await expect(page).toHaveURL(/\/#\/$/)
  })

  test('7. Change theme', async ({ page }) => {
    await page.goto('/#/settings')

    await page.click('button:has-text("Dark")')
    await expect(page.locator('.settings-theme-option:has-text("Dark")')).toHaveClass(/settings-theme-option--active/)

    await page.click('button:has-text("Light")')
    await expect(page.locator('.settings-theme-option:has-text("Light")')).toHaveClass(/settings-theme-option--active/)
  })

  test('8. Export backup', async ({ page }) => {
    await addCard(page, 'Backup Test', '333333333333')

    await page.goto('/#/settings')
    const downloadPromise = page.waitForEvent('download')
    await page.click('button:has-text("Export Backup")')

    const download = await downloadPromise
    await expect(download.suggestedFilename()).toContain('loyalty-cards-backup')
  })

  test('9. Share a single card', async ({ page }) => {
    await addCard(page, 'Share Test', '444444444444')
    await page.click('.card-item-wrapper')

    await page.click('button:has-text("Share Card")')
    await expect(page.getByText('Share Cards')).toBeVisible()
    await expect(page.locator('.share-url-modal-label:has-text("Password")')).toBeVisible()
    await expect(page.locator('.share-url-modal-qr-canvas')).toBeVisible()
  })

  test('10. Share all cards from settings', async ({ page }) => {
    await addCard(page, 'Card 1', '111111111111')
    await addCard(page, 'Card 2', '222222222222')

    await page.goto('/#/settings')
    await page.click('button:has-text("Share All Cards")')

    await expect(page.getByText('Share Cards')).toBeVisible()
    await expect(page.locator('.share-url-modal-qr-canvas')).toBeVisible()
  })
})
