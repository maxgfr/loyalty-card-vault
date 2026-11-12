import { test, expect, type Page } from '@playwright/test'

const PASSWORD = 'Secret123'

async function freshStart(page: Page) {
  await page.goto('/')
  await page.evaluate(async () => {
    const dbs = indexedDB.databases ? await indexedDB.databases() : []
    await Promise.all(
      dbs.map(
        (db) =>
          new Promise<void>((resolve) => {
            const req = indexedDB.deleteDatabase(db.name!)
            req.onsuccess = req.onerror = req.onblocked = () => resolve()
          })
      )
    )
  })
}

async function setPassword(page: Page, password: string, confirm = password) {
  await page.locator('input[type="password"]').nth(0).fill(password)
  await page.locator('input[type="password"]').nth(1).fill(confirm)
  await page.locator('[data-testid="setup-form"] button[type="submit"]').click()
}

async function unlock(page: Page, password: string) {
  await page.locator('[data-testid="unlock-form"] input[type="password"]').fill(password)
  await page.locator('[data-testid="unlock-form"] button[type="submit"]').click()
}

/** A platform authenticator (Touch ID, Face ID…) that always verifies the user, with PRF support. */
async function addAuthenticator(page: Page) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('WebAuthn.enable')
  await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      ctap2Version: 'ctap2_1',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
      hasPrf: true,
    },
  })
}

async function openSettings(page: Page) {
  await page.evaluate(() => { location.hash = '/settings' })
  await expect(page.getByRole('heading', { name: '👆 Unlock' })).toBeVisible()
}

async function addCard(page: Page, name: string, barcodeData: string) {
  await page.evaluate(() => { location.hash = '/add' })
  await page.fill('input[placeholder*="Starbucks"]', name)
  await page.locator('.input-label:has-text("Barcode Data") + input').fill(barcodeData)
  await page.click('.color-preset')
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/#\/$/, { timeout: 10000 })
  await page.waitForSelector('.card-item-wrapper', { timeout: 5000 })
}

/** Everything the app's IndexedDB holds, as any other site of the origin could read it. */
function dumpDatabase(page: Page): Promise<string> {
  return page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open('loyalty-card-vault')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(['cards', 'settings'], 'readonly')
          const cards = tx.objectStore('cards').getAll()
          const settings = tx.objectStore('settings').getAll()
          tx.oncomplete = () => {
            db.close()
            resolve(JSON.stringify({ cards: cards.result, settings: settings.result }))
          }
        }
      })
  )
}

test.describe('Vault encryption', () => {
  test('first launch: a password is required, mismatches and weak ones are refused', async ({ page }) => {
    await freshStart(page)
    await page.reload()
    await expect(page.getByTestId('setup-form')).toBeVisible()
    await expect(page.getByText('There is no way to recover a forgotten password.')).toBeVisible()

    await setPassword(page, PASSWORD, 'Secret124')
    await expect(page.getByRole('alert')).toHaveText('Passwords do not match')
    await setPassword(page, 'short')
    await expect(page.getByRole('alert')).toContainText('at least 8 characters')

    await setPassword(page, PASSWORD)
    await expect(page.locator('.app-layout')).toBeVisible()
  })

  test('cards are stored encrypted, and a reload asks for the password', async ({ page }) => {
    await freshStart(page)
    await page.reload()
    await setPassword(page, PASSWORD)
    await addCard(page, 'Grocery Club', '4006381333931')

    const dump = await dumpDatabase(page)
    expect(dump).not.toContain('4006381333931')
    expect(dump).not.toContain('Grocery Club')
    expect(dump).not.toContain(PASSWORD)

    await page.reload()
    await expect(page.getByTestId('unlock-form')).toBeVisible()
    await expect(page.getByText('Grocery Club')).toHaveCount(0)

    await unlock(page, 'Wrong1234')
    await expect(page.getByRole('alert')).toHaveText('Wrong password')
    await expect(page.locator('.app-layout')).toHaveCount(0)

    await unlock(page, PASSWORD)
    await expect(page.getByText('Grocery Club')).toBeVisible()
  })

  test('Lock Now forgets the key until the password is entered again', async ({ page }) => {
    await freshStart(page)
    await page.reload()
    await setPassword(page, PASSWORD)
    await addCard(page, 'Bookshop', '9780201379624')
    await page.evaluate(() => { location.hash = '/settings' })
    await page.click('button:has-text("Lock Now")')
    await expect(page.getByTestId('unlock-form')).toBeVisible()
    await unlock(page, PASSWORD)
    await expect(page.getByText('Bookshop')).toBeVisible()
  })

  test('cards an earlier version kept in clear are encrypted once a password is set', async ({ page }) => {
    await freshStart(page)
    // The database as earlier versions left it: cards in clear text, no vault.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('loyalty-card-vault', 1)
          open.onupgradeneeded = () => {
            open.result.createObjectStore('cards')
            open.result.createObjectStore('settings')
          }
          open.onerror = () => reject(open.error)
          open.onsuccess = () => {
            const db = open.result
            const tx = db.transaction(['cards', 'settings'], 'readwrite')
            const card = (id: string, name: string, barcodeData: string) => ({
              id,
              name,
              barcodeData,
              barcodeFormat: 'EAN_13',
              color: '#3b82f6',
              createdAt: 1,
              updatedAt: 1,
            })
            tx.objectStore('cards').put(card('old-1', 'Pharmacy', '5012345678900'), 'old-1')
            tx.objectStore('cards').put(card('old-2', 'Cinema', '4012345678901'), 'old-2')
            tx.objectStore('settings').put(true, 'useEncryption')
            tx.objectStore('settings').put('auto', 'theme')
            tx.oncomplete = () => {
              db.close()
              resolve()
            }
          }
        })
    )
    await page.reload()
    await expect(page.getByTestId('setup-migration')).toContainText('Your 2 cards are currently stored unencrypted')

    await setPassword(page, PASSWORD)
    await expect(page.getByText('Pharmacy')).toBeVisible()
    await expect(page.getByText('Cinema')).toBeVisible()

    const dump = await dumpDatabase(page)
    for (const secret of ['5012345678900', '4012345678901', 'Pharmacy', 'Cinema']) {
      expect(dump).not.toContain(secret)
    }

    await page.reload()
    await unlock(page, PASSWORD)
    await expect(page.getByText('Pharmacy')).toBeVisible()
  })

  test('the card open when the app was closed opens again on the next launch', async ({ page }) => {
    await freshStart(page)
    await page.reload()
    await setPassword(page, PASSWORD)
    await addCard(page, 'Bakery', '4006381333931')
    await addCard(page, 'Garage', '5012345678900')
    await page.locator('.card-item-wrapper', { hasText: 'Bakery' }).click()
    await expect(page.getByRole('heading', { level: 2, name: 'Bakery' })).toBeVisible()

    // Launched from the home screen icon: the start URL, without the card's hash.
    await page.goto('/')
    await unlock(page, PASSWORD)
    await expect(page.getByRole('heading', { level: 2, name: 'Bakery' })).toBeVisible()
    await expect(page).toHaveURL(/#\/card\//)

    // Back to the list, then closed: the list opens next time.
    await page.goBack()
    await expect(page.locator('.card-item-wrapper')).toHaveCount(2)
    await page.goto('/')
    await unlock(page, PASSWORD)
    await expect(page.locator('.card-item-wrapper')).toHaveCount(2)
    await expect(page.getByRole('heading', { level: 2, name: 'Bakery' })).toHaveCount(0)
  })

  test('a forgotten password: the vault can be erased and set up again', async ({ page }) => {
    await freshStart(page)
    await page.reload()
    await setPassword(page, PASSWORD)
    await addCard(page, 'Gone', '111111111111')
    await page.reload()
    await page.click('button:has-text("Forgot your password?")')
    await page.click('.modal .btn--danger:has-text("Erase All Cards")')
    await expect(page.getByTestId('setup-form')).toBeVisible()
    expect(await dumpDatabase(page)).toBe(JSON.stringify({ cards: [], settings: [] }))
  })
})

test.describe('Unlock without the password', () => {
  test('biometrics offered after setup open the vault on the next launch', async ({ page }) => {
    await freshStart(page)
    await addAuthenticator(page)
    await page.reload()
    await setPassword(page, PASSWORD)
    await expect(page.getByTestId('setup-passkey')).toBeVisible()
    await page.click('button:has-text("Use Biometrics")')
    await expect(page.locator('.app-layout')).toBeVisible()
    await addCard(page, 'Pet Shop', '4006381333931')

    const dump = await dumpDatabase(page)
    expect(dump).not.toContain('4006381333931')
    expect(dump).not.toContain(PASSWORD)

    // Next launch: the passkey prompt shows by itself, no password typed.
    await page.goto('/')
    await expect(page.getByText('Pet Shop')).toBeVisible()
  })

  test('biometrics turned on in Settings; Lock Now waits for a tap', async ({ page }) => {
    await freshStart(page)
    await addAuthenticator(page)
    await page.reload()
    await setPassword(page, PASSWORD)
    await page.click('button:has-text("Not Now")')
    await addCard(page, 'Florist', '9780201379624')

    await openSettings(page)
    await page.click('button:has-text("Unlock with Touch ID / Face ID")')
    await page.locator('#passkey-password-form input[type="password"]').fill('Wrong1234')
    await page.click('.modal button:has-text("Continue")')
    await expect(page.locator('#passkey-password-form')).toContainText('Wrong password')
    await page.locator('#passkey-password-form input[type="password"]').fill(PASSWORD)
    await page.click('.modal button:has-text("Continue")')
    await expect(page.getByText('Biometric unlock is on')).toBeVisible()

    await page.click('button:has-text("Lock Now")')
    await expect(page.getByTestId('passkey-unlock')).toBeVisible()
    await expect(page.locator('.app-layout')).toHaveCount(0)
    await page.getByTestId('passkey-unlock').click()
    await expect(page.getByText('Florist')).toBeVisible()

    // Turned off: the password again
    await openSettings(page)
    await page.click('button:has-text("Turn Off Biometric Unlock")')
    await page.goto('/')
    await expect(page.getByTestId('unlock-form')).toBeVisible()
    await expect(page.getByTestId('passkey-unlock')).toHaveCount(0)
  })

  test("don't ask on this device opens the app unlocked, until Lock Now", async ({ page }) => {
    await freshStart(page)
    await page.reload()
    await setPassword(page, PASSWORD)
    await addCard(page, 'Hardware', '5012345678900')

    await openSettings(page)
    await page.click("button:has-text(\"Don't Ask on This Device\")")
    await page.click('.modal .btn--danger')
    await expect(page.getByText('The app will open without asking on this device')).toBeVisible()

    await page.goto('/')
    await expect(page.getByText('Hardware')).toBeVisible()
    await expect(page.getByTestId('unlock-form')).toHaveCount(0)

    await openSettings(page)
    await page.click('button:has-text("Lock Now")')
    await expect(page.getByTestId('unlock-form')).toBeVisible()
    await page.goto('/')
    await expect(page.getByTestId('unlock-form')).toBeVisible()
    await expect(page.getByText('Hardware')).toHaveCount(0)
  })
})
