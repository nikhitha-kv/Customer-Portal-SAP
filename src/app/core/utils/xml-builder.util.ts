/**
 * XML Builder Utility
 * Constructs SOAP envelopes for SAP RFC function calls
 */

export interface SoapParams {
  [key: string]: string | number | boolean;
}

/**
 * Builds a complete SOAP envelope for a given SAP RFC function
 * @param functionName - SAP RFC function name (e.g. Z_CP_902095_LOGIN_FM)
 * @param params - Key-value pairs of input parameters
 */
export function buildSoapEnvelope(functionName: string, params: SoapParams): string {
  const paramXml = Object.entries(params)
    .map(([key, value]) => `        <${key}>${escapeXml(String(value))}</${key}>`)
    .join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope
  xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/"
  xmlns:urn="urn:sap-com:document:sap:rfc:functions">
  <soapenv:Header/>
  <soapenv:Body>
    <urn:${functionName}>
${paramXml}
    </urn:${functionName}>
  </soapenv:Body>
</soapenv:Envelope>`;
}

/**
 * Escape special XML characters to prevent injection
 */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
