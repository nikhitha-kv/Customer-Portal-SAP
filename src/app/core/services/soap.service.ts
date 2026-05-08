import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { buildSoapEnvelope, SoapParams } from '../utils/xml-builder.util';
import { parseXmlString, hasSoapFault, getSoapFaultMessage } from '../utils/xml-parser.util';

export type SoapEndpoint = keyof typeof environment.soapEndpoints;

@Injectable({ providedIn: 'root' })
export class SoapService {

  constructor(private http: HttpClient) {}

  /**
   * Makes a SOAP call to the given SAP endpoint.
   * @param endpoint - Key of environment.soapEndpoints
   * @param functionName - SAP RFC function name
   * @param params - Input parameters for the RFC function
   */
  call(endpoint: SoapEndpoint, functionName: string, params: SoapParams): Observable<Document> {
    const url = environment.soapEndpoints[endpoint];
    const envelope = buildSoapEnvelope(functionName, params);

    const credentials = btoa(`${environment.sapAuth.username}:${environment.sapAuth.password}`);
    let headers = new HttpHeaders({
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': `"urn:sap-com:document:sap:rfc:functions:${functionName}"`,
      'Authorization': `Basic ${credentials}`,
      'X-Requested-With': 'XMLHttpRequest' // Helps prevent browser basic auth popups
    });

    console.log(`[SOAP Request] ${functionName}:`, envelope);

    return this.http.post(url, envelope, { headers, responseType: 'text' }).pipe(
      map(response => {
        console.log(`[SOAP Response] ${functionName}:`, response);
        // If SAP returns an HTML logon page instead of XML
        if (response.trim().toLowerCase().startsWith('<!doctype html>') || response.trim().toLowerCase().startsWith('<html')) {
          throw new Error('Authentication failed or session expired.');
        }

        const doc = parseXmlString(response);
        if (hasSoapFault(doc)) {
          throw new Error(getSoapFaultMessage(doc));
        }
        return doc;
      }),
      catchError(err => {
        if (err instanceof Error) {
          return throwError(() => err);
        }
        // Handle HttpErrorResponse
        let msg = 'Network error. Please check your connection.';
        if (err.status === 401) {
          msg = 'Invalid credentials. Please try again.';
        } else if (typeof err.error === 'string' && err.error.includes('<html')) {
          msg = 'Authentication failed. Please check your credentials.';
        } else if (err.status === 500 && typeof err.error === 'string') {
          try {
            const errorDoc = parseXmlString(err.error);
            if (hasSoapFault(errorDoc)) {
              msg = getSoapFaultMessage(errorDoc);
            } else {
              msg = err.message;
            }
          } catch(e) {
            msg = err.message;
          }
        } else if (err.message) {
          msg = err.message;
        }
        return throwError(() => new Error(msg));
      })
    );
  }
}
