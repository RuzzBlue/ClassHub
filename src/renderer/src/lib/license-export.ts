import type { LicenseKey } from '@shared/types'

export function formatLicenseCertificate(license: LicenseKey): string {
  const expires = license.expiresAt
    ? new Date(license.expiresAt).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'No expiration date'
  const created = new Date(license.createdAt).toLocaleString()
  const assigned = license.assignedUserName || 'Not assigned'

  return [
    '═══════════════════════════════════════════════════',
    '              CLASSHUB LICENSE CERTIFICATE',
    '═══════════════════════════════════════════════════',
    '',
    `License Key:     ${license.code}`,
    `License Type:    ${license.licenseTypeName}`,
    `Status:          ${license.status.toUpperCase()}`,
    `Expiration:      ${expires}`,
    `Assigned To:     ${assigned}`,
    `Issued On:       ${created}`,
    '',
    '───────────────────────────────────────────────────',
    'This license key unlocks premium course content in',
    'ClassHub. Keep this file secure and do not share it',
    'publicly. Enter the key in your ClassHub profile when',
    'prompted to activate licensed content.',
    '',
    'Support: https://github.com/RuzzBlue/ClassHub',
    '═══════════════════════════════════════════════════'
  ].join('\n')
}

export function downloadLicenseCertificate(license: LicenseKey): void {
  const content = formatLicenseCertificate(license)
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${license.code.replace(/[^A-Z0-9-]/gi, '_')}.txt`
  link.click()
  URL.revokeObjectURL(url)
}
