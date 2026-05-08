/**
 * XML Parser Utility
 * Parses SAP SOAP XML responses into typed JavaScript objects
 */

/**
 * Parse an XML string into a DOM Document
 */
export function parseXmlString(xmlString: string): Document {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'text/xml');

  // Check for parser errors
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML Parse Error: ${parseError.textContent}`);
  }

  return doc;
}

/**
 * Check if a SOAP response contains a Fault
 */
export function hasSoapFault(doc: Document): boolean {
  return !!doc.querySelector('Fault') || !!doc.querySelector('faultstring');
}

/**
 * Extract SOAP fault message
 */
export function getSoapFaultMessage(doc: Document): string {
  const faultString = doc.querySelector('faultstring');
  const faultDetail = doc.querySelector('detail');
  if (faultString) {
    return faultDetail
      ? `${faultString.textContent} - ${faultDetail.textContent}`
      : faultString.textContent || 'Unknown SOAP fault';
  }
  return 'Unknown SOAP fault';
}

/**
 * Get text content of first matching tag
 */
export function getTagValue(doc: Document | Element, tagName: string): string {
  // Try exact tag name
  let elements = (doc instanceof Document ? doc : doc.ownerDocument || doc as any).getElementsByTagName(tagName);
  if (elements.length > 0) return elements[0].textContent?.trim() || '';
  
  // Try case-insensitive localName fallback
  const root = doc instanceof Document ? doc.documentElement : doc;
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName && all[i].localName.toUpperCase() === tagName.toUpperCase()) {
      return all[i].textContent?.trim() || '';
    }
  }
  return '';
}

/**
 * Get all elements matching a tag name, returned as Element[]
 */
export function getAllElements(doc: Document | Element, tagName: string): Element[] {
  const result: Element[] = [];
  
  // Try exact tag name
  let elements = (doc instanceof Document ? doc : doc.ownerDocument || doc as any).getElementsByTagName(tagName);
  if (elements.length > 0) {
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].parentNode === doc || doc instanceof Document) { // Ensure it's not deeply nested if we only want direct children, but usually we just want all
         result.push(elements[i]);
      }
    }
    return result;
  }

  // Fallback: search by local name
  const root = doc instanceof Document ? doc.documentElement : doc;
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName && all[i].localName.toUpperCase() === tagName.toUpperCase()) {
      result.push(all[i]);
    }
  }
  return result;
}
export function extractValue(doc: Document, ...tagNames: string[]): string {
  for (const tag of tagNames) {
    const val = getTagValue(doc, tag);
    if (val) return val;
  }
  return '';
}

/**
 * Convert a table response (repeated elements with children) into array of objects
 */
export function extractTable(doc: Document, rowTag: string, fields: string[]): Record<string, string>[] {
  const rows = getAllElements(doc, rowTag);
  return rows.map(row => {
    const obj: Record<string, string> = {};
    fields.forEach(field => {
      obj[field] = getTagValue(row, field)?.trim() || '';
    });
    return obj;
  });
}

/**
 * Find element by local name (handles namespace prefixes)
 */
function findElementByLocalName(doc: Document | Element, localName: string): Element | null {
  const root = doc instanceof Document ? doc.documentElement : doc;
  const all = root.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    if (all[i].localName.toUpperCase() === localName.toUpperCase()) {
      return all[i];
    }
  }
  return null;
}
