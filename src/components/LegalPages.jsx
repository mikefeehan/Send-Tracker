// Privacy Policy and Terms of Service pages
// Rendered based on URL hash (#privacy, #terms)

const PAGE_STYLE = {
  background: 'linear-gradient(135deg, #050914 0%, #0a1224 40%, #0f1a2e 70%, #050914 100%)',
  minHeight: '100vh',
  color: '#e2e8f0',
  padding: '40px 20px 60px',
  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif',
}

const CONTAINER_STYLE = {
  maxWidth: '720px',
  margin: '0 auto',
  background: 'rgba(10,18,34,0.6)',
  backdropFilter: 'blur(18px)',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '20px',
  padding: '36px 28px',
  lineHeight: 1.7,
}

const H1_STYLE = { fontSize: '28px', fontWeight: 900, color: 'white', marginBottom: '8px' }
const H2_STYLE = { fontSize: '18px', fontWeight: 800, color: 'white', marginTop: '28px', marginBottom: '8px' }
const P_STYLE = { fontSize: '14px', color: '#cbd5e1', marginBottom: '12px' }
const META_STYLE = { fontSize: '12px', color: '#64748b', marginBottom: '24px' }

export function PrivacyPolicy() {
  return (
    <div style={PAGE_STYLE}>
      <div style={CONTAINER_STYLE}>
        <a href="/" style={{ color: '#60a5fa', fontSize: '13px', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>← Back to app</a>
        <h1 style={H1_STYLE}>Privacy Policy</h1>
        <p style={META_STYLE}>Last updated: April 2026</p>

        <p style={P_STYLE}>
          Send Tracker ("we", "us", "the app") respects your privacy. This policy explains what information we collect, how we use it, and your rights.
        </p>

        <h2 style={H2_STYLE}>Information We Collect</h2>
        <p style={P_STYLE}>
          <strong>Account info:</strong> When you sign up, we collect your email address, display name, and (optionally) a profile photo. If you sign in with Google, we also receive your Google account email and display name.
        </p>
        <p style={P_STYLE}>
          <strong>Drink logs:</strong> When you log a drink, we store the drink type, quantity, points, a photo of the drink, optional caption, a timestamp, the text location name, and (only if you tap "Detect Location") your approximate GPS coordinates at the time of logging.
        </p>
        <p style={P_STYLE}>
          <strong>Age verification:</strong> Your date of birth is used once to verify you are 21+ and is stored only on your device.
        </p>
        <p style={P_STYLE}>
          <strong>Usage data:</strong> Standard hosting logs (IP address, user agent, timestamp) are retained by our hosting provider for security and abuse prevention.
        </p>

        <h2 style={H2_STYLE}>How We Use Your Information</h2>
        <p style={P_STYLE}>
          Your information is used solely to operate the app: displaying your profile, showing drinks on the leaderboard and feed, placing drinks on the map, and sending you notifications about likes on your posts. We do not sell, rent, or share your personal information with advertisers or third parties for marketing.
        </p>

        <h2 style={H2_STYLE}>Photo Verification</h2>
        <p style={P_STYLE}>
          Drink photos you upload are sent to Anthropic's Claude API for automated verification that the image depicts an alcoholic beverage. Anthropic does not retain these images and does not use them for model training. Once verified, photos are stored in Firebase Storage and displayed to other users within the app.
        </p>

        <h2 style={H2_STYLE}>Data Storage</h2>
        <p style={P_STYLE}>
          Data is stored in Google Firebase (Firestore, Storage, Authentication) in the United States. Google Firebase is GDPR-compliant and maintains industry-standard security practices.
        </p>

        <h2 style={H2_STYLE}>Your Rights</h2>
        <p style={P_STYLE}>
          You can:
        </p>
        <ul style={{ fontSize: '14px', color: '#cbd5e1', paddingLeft: '22px', marginBottom: '12px' }}>
          <li>View all of your data at any time inside the app</li>
          <li>Edit or delete any drink you've posted</li>
          <li>Update your profile name and photo</li>
          <li>Delete your entire account and all associated data from the Edit Profile screen</li>
          <li>Sign out at any time</li>
        </ul>

        <h2 style={H2_STYLE}>Children</h2>
        <p style={P_STYLE}>
          Send Tracker is not intended for anyone under 21. We do not knowingly collect information from individuals under 21. If you believe a minor has created an account, contact us to have it removed.
        </p>

        <h2 style={H2_STYLE}>Changes to This Policy</h2>
        <p style={P_STYLE}>
          We may update this policy from time to time. Material changes will be announced within the app.
        </p>

        <h2 style={H2_STYLE}>Contact</h2>
        <p style={P_STYLE}>
          Questions about privacy? Contact us at <a href="mailto:privacy@sendtracker.app" style={{ color: '#60a5fa' }}>privacy@sendtracker.app</a>.
        </p>
      </div>
    </div>
  )
}

export function TermsOfService() {
  return (
    <div style={PAGE_STYLE}>
      <div style={CONTAINER_STYLE}>
        <a href="/" style={{ color: '#60a5fa', fontSize: '13px', textDecoration: 'none', display: 'inline-block', marginBottom: '20px' }}>← Back to app</a>
        <h1 style={H1_STYLE}>Terms of Service</h1>
        <p style={META_STYLE}>Last updated: April 2026</p>

        <p style={P_STYLE}>
          Welcome to Send Tracker. By using this app, you agree to these terms. If you do not agree, please do not use the app.
        </p>

        <h2 style={H2_STYLE}>Eligibility</h2>
        <p style={P_STYLE}>
          You must be at least 21 years old to use Send Tracker. By creating an account, you represent that you meet this age requirement.
        </p>

        <h2 style={H2_STYLE}>Responsible Use</h2>
        <p style={P_STYLE}>
          Send Tracker is a social app for adults to share responsibly. We encourage moderate, responsible drinking and do not promote, condone, or reward excessive alcohol consumption. Please drink responsibly, never drink and drive, and know your limits.
        </p>
        <p style={P_STYLE}>
          If you or someone you know is struggling with alcohol, help is available. Contact{' '}
          <a href="https://www.samhsa.gov/find-help/national-helpline" target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>SAMHSA's National Helpline</a>{' '}
          at 1-800-662-HELP (4357).
        </p>

        <h2 style={H2_STYLE}>Your Content</h2>
        <p style={P_STYLE}>
          You retain ownership of any content you post (photos, captions, comments). By posting, you grant Send Tracker a non-exclusive license to display that content to other users within the app.
        </p>
        <p style={P_STYLE}>
          You are responsible for the content you post. Do not post content that is illegal, harassing, defamatory, obscene, infringing, or otherwise objectionable. We may remove content and suspend accounts that violate these terms.
        </p>

        <h2 style={H2_STYLE}>Prohibited Conduct</h2>
        <p style={P_STYLE}>You agree not to:</p>
        <ul style={{ fontSize: '14px', color: '#cbd5e1', paddingLeft: '22px', marginBottom: '12px' }}>
          <li>Use the app if you are under 21</li>
          <li>Impersonate another person</li>
          <li>Harass, threaten, or abuse other users</li>
          <li>Post content that glorifies dangerous or excessive drinking</li>
          <li>Attempt to reverse-engineer, scrape, or abuse the service</li>
          <li>Upload false or misleading photos</li>
        </ul>

        <h2 style={H2_STYLE}>No Warranty</h2>
        <p style={P_STYLE}>
          The app is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service or error-free operation.
        </p>

        <h2 style={H2_STYLE}>Limitation of Liability</h2>
        <p style={P_STYLE}>
          Send Tracker is not liable for any harm, loss, or injury resulting from your use of the app, including any consequences of your drinking decisions. You are solely responsible for your own behavior.
        </p>

        <h2 style={H2_STYLE}>Termination</h2>
        <p style={P_STYLE}>
          You can delete your account at any time from the Edit Profile screen. We may suspend or terminate accounts that violate these terms.
        </p>

        <h2 style={H2_STYLE}>Changes</h2>
        <p style={P_STYLE}>
          We may update these terms. Continued use of the app after changes constitutes acceptance of the updated terms.
        </p>

        <h2 style={H2_STYLE}>Contact</h2>
        <p style={P_STYLE}>
          Questions? Contact us at <a href="mailto:support@sendtracker.app" style={{ color: '#60a5fa' }}>support@sendtracker.app</a>.
        </p>
      </div>
    </div>
  )
}
