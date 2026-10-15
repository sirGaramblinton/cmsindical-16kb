// Servicio para autenticación facial (copiado desde CMSindical)
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class FaceAuthService {
    private endpoint = 'https://ENDPOINT_DE_SEGURIDAD/face/validate';

    constructor(private http: HttpClient) {}

    validateFace(photoDataUrl: string): Observable<any> {
        return this.http.post(this.endpoint, { image: photoDataUrl });
    }
}
