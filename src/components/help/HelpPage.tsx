import { useState } from 'react'
import { Header } from '../layout/Header'
import { Card } from '../ui/Card'
import './HelpPage.css'

interface HelpPageProps {
  onBack: () => void
}

export function HelpPage({ onBack }: HelpPageProps) {
  const [openSection, setOpenSection] = useState<string | null>('installation')

  const toggleSection = (section: string) => {
    setOpenSection(openSection === section ? null : section)
  }

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isAndroid = /Android/.test(navigator.userAgent)

  return (
    <div className="help-page">
      <Header title="Help & Installation" onBack={onBack} />

      <div className="help-content">
        {/* Installation Guide */}
        <Card className="help-section">
          <button
            type="button"
            className="help-section-header"
            onClick={() => toggleSection('installation')}
          >
            <span className="help-icon">📱</span>
            <span className="help-section-title">How to install the app?</span>
            <span className="help-arrow">{openSection === 'installation' ? '▼' : '▶'}</span>
          </button>

          {openSection === 'installation' && (
            <div className="help-section-content">
              <p className="help-highlight">
                ✨ This app takes <strong>NO space</strong> on your phone!
              </p>

              {isIOS && (
                <div className="help-platform">
                  <h3>📱 iPhone/iPad</h3>
                  <ol>
                    <li>Tap the <strong>Share</strong> button 📤 at the bottom</li>
                    <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
                    <li>Tap <strong>"Add"</strong></li>
                    <li>The app appears on your home screen! 🎉</li>
                  </ol>
                </div>
              )}

              {isAndroid && (
                <div className="help-platform">
                  <h3>📱 Android</h3>
                  <ol>
                    <li>Tap the <strong>3 dots</strong> ⋮ at the top right</li>
                    <li>Select <strong>"Add to Home screen"</strong></li>
                    <li>Tap <strong>"Add"</strong></li>
                    <li>The app appears on your home screen! 🎉</li>
                  </ol>
                </div>
              )}

              {!isIOS && !isAndroid && (
                <div className="help-platform">
                  <h3>💻 Desktop</h3>
                  <ol>
                    <li>Look for the <strong>"Install"</strong> icon ⊕ in the address bar</li>
                    <li>Click <strong>"Install"</strong></li>
                    <li>The app opens in a dedicated window! 🎉</li>
                  </ol>
                </div>
              )}

              <div className="help-info">
                <strong>💡 Why install?</strong>
                <ul>
                  <li>No space used (only a few KB)</li>
                  <li>Works offline after the first visit</li>
                  <li>Quick access from home screen</li>
                  <li>Automatic updates</li>
                </ul>
              </div>
            </div>
          )}
        </Card>

        {/* How to Use */}
        <Card className="help-section">
          <button
            type="button"
            className="help-section-header"
            onClick={() => toggleSection('usage')}
          >
            <span className="help-icon">📖</span>
            <span className="help-section-title">How to use the app?</span>
            <span className="help-arrow">{openSection === 'usage' ? '▼' : '▶'}</span>
          </button>

          {openSection === 'usage' && (
            <div className="help-section-content">
              <div className="help-step">
                <h4>1️⃣ Scan a card</h4>
                <p>Tap the <strong>Scan</strong> tab and point your camera at your loyalty card's barcode.</p>
              </div>

              <div className="help-step">
                <h4>2️⃣ Add manually</h4>
                <p>Tap <strong>Add</strong>, enter the card name and number. Store suggestions appear automatically!</p>
              </div>

              <div className="help-step">
                <h4>3️⃣ Use in store</h4>
                <p>Open your card and show the barcode to the cashier. Simple and fast!</p>
              </div>

              <div className="help-step">
                <h4>4️⃣ Make a backup</h4>
                <p>Go to <strong>Settings</strong> → <strong>Export Backup</strong> to save all your cards.</p>
              </div>
            </div>
          )}
        </Card>

        {/* Security */}
        <Card className="help-section">
          <button
            type="button"
            className="help-section-header"
            onClick={() => toggleSection('security')}
          >
            <span className="help-icon">🔒</span>
            <span className="help-section-title">Security & Privacy</span>
            <span className="help-arrow">{openSection === 'security' ? '▼' : '▶'}</span>
          </button>

          {openSection === 'security' && (
            <div className="help-section-content">
              <div className="help-info">
                <h4>✅ Your data is 100% secure</h4>
                <ul>
                  <li><strong>Local storage only</strong>: Nothing is sent over the Internet</li>
                  <li><strong>Mandatory encryption</strong>: All cards are encrypted with AES-256-GCM</li>
                  <li><strong>No server</strong>: The app runs entirely on your device</li>
                  <li><strong>No tracking</strong>: No cookies, no analytics</li>
                  <li><strong>Open source</strong>: Code is publicly auditable</li>
                </ul>
              </div>
            </div>
          )}
        </Card>

        {/* FAQ */}
        <Card className="help-section">
          <button
            type="button"
            className="help-section-header"
            onClick={() => toggleSection('faq')}
          >
            <span className="help-icon">❓</span>
            <span className="help-section-title">Frequently Asked Questions</span>
            <span className="help-arrow">{openSection === 'faq' ? '▼' : '▶'}</span>
          </button>

          {openSection === 'faq' && (
            <div className="help-section-content">
              <div className="help-faq">
                <h4>Does the app take up space on my phone?</h4>
                <p>No! Only a few KB for your card data. The app itself stays cached on the web and takes virtually no storage.</p>
              </div>

              <div className="help-faq">
                <h4>Does it work offline?</h4>
                <p>Yes! After your first visit, the app works 100% offline. Your cards are always accessible, even without Internet.</p>
              </div>

              <div className="help-faq">
                <h4>How do I share cards with family or switch phones?</h4>
                <p>Open a card, tap <strong>Share Card</strong>, and you'll get a secure URL and password. Share them separately (URL by link, password by text). The recipient opens the URL and enters the password to import the card.</p>
              </div>

              <div className="help-faq">
                <h4>What's the difference between Share and Export Backup?</h4>
                <p><strong>Share</strong> creates a temporary encrypted URL for specific cards (great for quick sharing). <strong>Export Backup</strong> saves all your cards in a file for safekeeping or phone transfers.</p>
              </div>

              <div className="help-faq">
                <h4>Can I add notes to my cards?</h4>
                <p>Yes! When editing a card, there's a Notes field. Use it to store PIN codes, membership numbers, or any useful info. Notes appear below the tags on the card detail page.</p>
              </div>

              <div className="help-faq">
                <h4>What is the flip animation on cards?</h4>
                <p>Tap any card in detail view to flip it! The front shows the card design, the back shows the barcode for scanning at checkout.</p>
              </div>

              <div className="help-faq">
                <h4>Can I export cards as images?</h4>
                <p>Yes! Open a card and tap <strong>Export as Image</strong>. Perfect for using the card in other apps or keeping a visual backup.</p>
              </div>

              <div className="help-faq">
                <h4>Which barcode formats are supported?</h4>
                <p>Almost all formats: QR Code, EAN-13/8, UPC-A/E, CODE-128/39, ITF-14, Codabar, Data Matrix, and more.</p>
              </div>

              <div className="help-faq">
                <h4>Can I use tags to organize my cards?</h4>
                <p>Yes! Tags help you categorize cards (e.g., "Grocery", "Retail", "Gas"). Add tags when creating or editing a card.</p>
              </div>

              <div className="help-faq">
                <h4>What if I forget my password?</h4>
                <p>Unfortunately, your data cannot be recovered. Encryption is mandatory for security, which means no password recovery is possible. <strong>Make regular backups!</strong></p>
              </div>

              <div className="help-faq">
                <h4>How do I delete the app and all data?</h4>
                <p>Go to <strong>Settings</strong> → <strong>Reset All Data</strong>. For complete removal, also uninstall the app: long-press the icon and tap "Uninstall" or "Remove".</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
