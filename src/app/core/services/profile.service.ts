import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { SoapService } from './soap.service';
import { extractValue } from '../utils/xml-parser.util';
import { CustomerProfile } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {

  constructor(private soap: SoapService) {}

  getProfile(kunnr: string): Observable<CustomerProfile> {
    return this.soap.call('profile', 'Z_CP_902095_PROFILE_FM', {
      I_KUNNR: kunnr
    }).pipe(
      map(doc => {
        const data = doc.getElementsByTagName('E_DATA')[0] || doc;
        return {
          kunnr: (data.getElementsByTagName('KUNNR')[0]?.textContent || kunnr).trim(),
          name: (data.getElementsByTagName('NAME1')[0]?.textContent || '').trim(),
          name2: (data.getElementsByTagName('NAME2')[0]?.textContent || '').trim(),
          street: (data.getElementsByTagName('STREET')[0]?.textContent || data.getElementsByTagName('STRAS')[0]?.textContent || '').trim(),
          city: (data.getElementsByTagName('CITY')[0]?.textContent || data.getElementsByTagName('ORT01')[0]?.textContent || '').trim(),
          pincode: (data.getElementsByTagName('PINCODE')[0]?.textContent || data.getElementsByTagName('PSTLZ')[0]?.textContent || '').trim(),
          country: (data.getElementsByTagName('COUNTRY')[0]?.textContent || data.getElementsByTagName('LAND1')[0]?.textContent || '').trim(),
          phone: (data.getElementsByTagName('PHONE')[0]?.textContent || data.getElementsByTagName('TELF1')[0]?.textContent || '').trim(),
          email: (data.getElementsByTagName('EMAIL')[0]?.textContent || '').trim()
        } as CustomerProfile;
      })
    );
  }
}
