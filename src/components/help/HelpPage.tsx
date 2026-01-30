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
                  <h3>📱 Sur iPhone/iPad</h3>
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
                  <h3>📱 Sur Android</h3>
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
                  <h3>💻 On Desktop</h3>
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
                  <li><strong>Optional encryption</strong>: Secure mode with password (AES-256)</li>
                  <li><strong>No server</strong>: The app runs entirely on your device</li>
                  <li><strong>No tracking</strong>: No cookies, no analytics</li>
                </ul>
              </div>

              <div className="help-warning">
                <strong>⚠️ Important</strong>
                <p>If you lose your password in secure mode, your data is <strong>unrecoverable</strong>. Make regular backups!</p>
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
                <h4>Does the app take up space?</h4>
                <p>No! Only a few KB for your card data. The app stays on the web.</p>
              </div>

              <div className="help-faq">
                <h4>Does it work without Internet?</h4>
                <p>Yes! After the first visit, the app works 100% offline.</p>
              </div>

              <div className="help-faq">
                <h4>How do I switch phones?</h4>
                <p>Make a backup (Export) then import it on your new phone.</p>
              </div>

              <div className="help-faq">
                <h4>Can I scan any barcode?</h4>
                <p>Yes! The app supports: QR Code, EAN-13/8, UPC-A/E, CODE-128/39, ITF, Codabar, and Data Matrix.</p>
              </div>

              <div className="help-faq">
                <h4>How do I uninstall the app?</h4>
                <p>Like any app: long-press the icon then tap "Uninstall" or "Remove".</p>
              </div>
            </div>
          )}
        </Card>

        {/* About */}
        <Card className="help-section">
          <div className="help-about">
            <h3>About</h3>
            <p>Loyalty Card Vault v1.0.0</p>
            <p>A progressive web app (PWA) for managing your loyalty cards securely.</p>
            <p className="help-about-tech">
              Made with ❤️ using React 19 + TypeScript
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
