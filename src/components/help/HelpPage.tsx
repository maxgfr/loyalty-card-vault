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
      <Header title="Aide & Installation" onBack={onBack} />

      <div className="help-content">
        {/* Installation Guide */}
        <Card className="help-section">
          <button
            type="button"
            className="help-section-header"
            onClick={() => toggleSection('installation')}
          >
            <span className="help-icon">📱</span>
            <span className="help-section-title">Comment installer l'app ?</span>
            <span className="help-arrow">{openSection === 'installation' ? '▼' : '▶'}</span>
          </button>

          {openSection === 'installation' && (
            <div className="help-section-content">
              <p className="help-highlight">
                ✨ Cette app ne prend <strong>AUCUN espace</strong> sur votre téléphone !
              </p>

              {isIOS && (
                <div className="help-platform">
                  <h3>📱 Sur iPhone/iPad</h3>
                  <ol>
                    <li>Tapez sur le bouton <strong>Partager</strong> 📤 en bas</li>
                    <li>Faites défiler et tapez <strong>"Sur l'écran d'accueil"</strong></li>
                    <li>Tapez <strong>"Ajouter"</strong></li>
                    <li>L'app apparaît sur votre écran d'accueil ! 🎉</li>
                  </ol>
                </div>
              )}

              {isAndroid && (
                <div className="help-platform">
                  <h3>📱 Sur Android</h3>
                  <ol>
                    <li>Tapez sur les <strong>3 points</strong> ⋮ en haut à droite</li>
                    <li>Sélectionnez <strong>"Ajouter à l'écran d'accueil"</strong></li>
                    <li>Tapez <strong>"Ajouter"</strong></li>
                    <li>L'app apparaît sur votre écran d'accueil ! 🎉</li>
                  </ol>
                </div>
              )}

              {!isIOS && !isAndroid && (
                <div className="help-platform">
                  <h3>💻 Sur ordinateur</h3>
                  <ol>
                    <li>Cherchez l'icône <strong>"Installer"</strong> ⊕ dans la barre d'adresse</li>
                    <li>Cliquez sur <strong>"Installer"</strong></li>
                    <li>L'app s'ouvre dans une fenêtre dédiée ! 🎉</li>
                  </ol>
                </div>
              )}

              <div className="help-info">
                <strong>💡 Pourquoi installer ?</strong>
                <ul>
                  <li>Aucun espace occupé (quelques Ko seulement)</li>
                  <li>Fonctionne hors ligne après la première visite</li>
                  <li>Accès rapide depuis l'écran d'accueil</li>
                  <li>Mises à jour automatiques</li>
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
            <span className="help-section-title">Comment utiliser l'app ?</span>
            <span className="help-arrow">{openSection === 'usage' ? '▼' : '▶'}</span>
          </button>

          {openSection === 'usage' && (
            <div className="help-section-content">
              <div className="help-step">
                <h4>1️⃣ Scanner une carte</h4>
                <p>Tapez sur l'onglet <strong>Scanner</strong> et pointez votre caméra vers le code-barres de votre carte de fidélité.</p>
              </div>

              <div className="help-step">
                <h4>2️⃣ Ajouter manuellement</h4>
                <p>Tapez sur <strong>Ajouter</strong>, entrez le nom de la carte et le numéro. Les suggestions de magasins apparaissent automatiquement !</p>
              </div>

              <div className="help-step">
                <h4>3️⃣ Utiliser en magasin</h4>
                <p>Ouvrez votre carte et montrez le code-barres au caissier. Simple et rapide !</p>
              </div>

              <div className="help-step">
                <h4>4️⃣ Faire un backup</h4>
                <p>Allez dans <strong>Paramètres</strong> → <strong>Export Backup</strong> pour sauvegarder toutes vos cartes.</p>
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
            <span className="help-section-title">Sécurité & Confidentialité</span>
            <span className="help-arrow">{openSection === 'security' ? '▼' : '▶'}</span>
          </button>

          {openSection === 'security' && (
            <div className="help-section-content">
              <div className="help-info">
                <h4>✅ Vos données sont 100% sécurisées</h4>
                <ul>
                  <li><strong>Stockage local uniquement</strong> : Rien n'est envoyé sur Internet</li>
                  <li><strong>Cryptage optionnel</strong> : Mode sécurisé avec mot de passe (AES-256)</li>
                  <li><strong>Aucun serveur</strong> : L'app fonctionne entièrement sur votre appareil</li>
                  <li><strong>Aucune tracking</strong> : Pas de cookies, pas d'analytics</li>
                </ul>
              </div>

              <div className="help-warning">
                <strong>⚠️ Important</strong>
                <p>Si vous perdez votre mot de passe en mode sécurisé, vos données sont <strong>irrécupérables</strong>. Faites des backups réguliers !</p>
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
            <span className="help-section-title">Questions fréquentes</span>
            <span className="help-arrow">{openSection === 'faq' ? '▼' : '▶'}</span>
          </button>

          {openSection === 'faq' && (
            <div className="help-section-content">
              <div className="help-faq">
                <h4>L'app prend-elle de la place ?</h4>
                <p>Non ! Seulement quelques Ko pour vos données de cartes. L'app reste sur le web.</p>
              </div>

              <div className="help-faq">
                <h4>Ça fonctionne sans Internet ?</h4>
                <p>Oui ! Après la première visite, l'app fonctionne 100% hors ligne.</p>
              </div>

              <div className="help-faq">
                <h4>Comment changer de téléphone ?</h4>
                <p>Faites un backup (Export) puis importez-le sur votre nouveau téléphone.</p>
              </div>

              <div className="help-faq">
                <h4>Puis-je scanner n'importe quel code-barres ?</h4>
                <p>Oui ! L'app supporte : QR Code, EAN-13/8, UPC-A/E, CODE-128/39, ITF, Codabar, et Data Matrix.</p>
              </div>

              <div className="help-faq">
                <h4>Comment désinstaller l'app ?</h4>
                <p>Comme n'importe quelle app : maintenez l'icône puis tapez "Désinstaller" ou "Supprimer".</p>
              </div>
            </div>
          )}
        </Card>

        {/* About */}
        <Card className="help-section">
          <div className="help-about">
            <h3>À propos</h3>
            <p>Loyalty Card Vault v1.0.0</p>
            <p>Une application web progressive (PWA) pour gérer vos cartes de fidélité de manière sécurisée.</p>
            <p className="help-about-tech">
              Fait avec ❤️ en React 19 + TypeScript
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}
