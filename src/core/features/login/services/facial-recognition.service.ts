// Facial recognition service from CMSindical
import { Injectable } from '@angular/core';
import { Translate } from '@singletons';
import { HttpClient, HttpParams } from '@angular/common/http';
import { CoreSites } from '@services/sites';

declare var tf: any;
declare var faceLandmarksDetection: any;

export interface ValidateRFResponse {
    userId: string;
    userKey: string;
    allowRf: string;
    haveRfRegister: string;
    userRfId: string;
    password: string;
}

type NormalizedResponse = { success: boolean; code?: number; message?: string; messageKey?: string; password?: string | null; raw?: any };

enum RfVariant {
    SecurityV2 = 'security_v2',
    Employee = 'employee',
    Empleados = 'empleados',
}

function mapMessageToKey(rawMessage: string | undefined): string | undefined {
    if (!rawMessage) {
        return undefined;
    }
    const m = rawMessage.toString().toLowerCase();
    // Spanish and English matches from Postman / production samples.
    if (m.includes('no se detect') || m.includes('no se detectó') || m.includes('no se detecto') || m.includes('no face') || m.includes('no face detected')) {
        return 'core.login.rf.face_no_detected';
    }
    if (m.includes('registrado correctamente') || m.includes('registered') || m.includes('registration completed')) {
        return 'core.login.rf.registration_completed_message';
    }
    if (m.includes('usuario no encontrado') || m.includes('user not found') || m.includes('usuario no encontrado con') || m.includes('user not found with')) {
        return 'core.login.rf.user_not_found';
    }
    // Verification / success messages (map to verification message key)
    if (m.includes('usuario detectado') || m.includes('usuario detectado correctamente') || m.includes('user detected') || m.includes('verification successful') || m.includes('your identity was verified') || m.includes('identity verified') || m.includes('your identity was verified successfully')) {
        return 'core.login.rf.verification_success_message';
    }
    // Identity sync message (English production text)
    if (m.includes('authentication systems are out') || m.includes('authentication systems are out of sync') || m.includes('identity verified but authentication systems') || m.includes('identity verified but authentication systems are out of sync') || m.includes('please contact admin')) {
        return 'core.login.rf.identity_sync_message';
    }
    // exact full sentence match fallback
    if (m.includes('identity verified but authentication systems are out sync. please contact admin.') || m.includes('identity verified but authentication systems are out of sync. please contact admin.')) {
        return 'core.login.rf.identity_sync_message';
    }
    if (m.includes('no se pudo realizar el registro') || m.includes('could not perform the registration') || m.includes('no se pudo realizar')) {
        return 'core.login.rf.registration_failed';
    }
    if (m.includes('no se pudo detectar') || m.includes('not detected') || m.includes('no coincide') || m.includes('no coincide')) {
        return 'core.login.rf.verification_failed';
    }
    // If server returns a single word like CONTINUE in English, map to generic continue label if present.
    if (m.trim() === 'continue' || m.trim() === 'contine' || m.trim() === 'continuar') {
        return 'continue';
    }
    // fallback: undefined
    return undefined;
}

@Injectable({ providedIn: 'root' })
export class FacialRecognitionService {
    private readonly API_PRODUCTION_URL =
        'https://apigateway-team-355837773731.us-central1.run.app/security/v2';
    private readonly API_DEVELOPMENT_URL =
        'https://api-gateway-development-sjjsjmnyqa-uc.a.run.app/security/v2';

    // Cached detected variant after a successful call.
    private detectedVariant: RfVariant | null = null;

    private faceDetector: any = null;
    private isDetectorReady = false;

    constructor(private http: HttpClient) {
        console.log(' FacialRecognitionService initialized');
        this.checkTensorFlowCompatibility();
    }

    private async checkTensorFlowCompatibility(): Promise<void> {
        try {
            const userAgent = navigator.userAgent;
            const androidMatch = userAgent.match(/Android (\d+\.\d+)/);
            let androidVersion = 0;

            if (androidMatch) {
                androidVersion = parseFloat(androidMatch[1]);
            }

            const hasWebGL = this.checkWebGLSupport();
            const hasTypedArrays = this.checkTypedArraySupport();

            if (hasWebGL && hasTypedArrays) {
                await this.initializeFaceDetector();
            } else {
                this.isDetectorReady = false;
            }
        } catch (error) {
            await this.initializeFaceDetector();
        }
    }

    private checkWebGLSupport(): boolean {
        try {
            const canvas = document.createElement('canvas');
            const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
            return !!gl;
        } catch (e) {
            return false;
        }
    }

    private checkTypedArraySupport(): boolean {
        try {
            return !!(window.Float32Array && window.Uint8Array);
        } catch (e) {
            return false;
        }
    }

    private getSecurityV2Base(): string {
        return this.API_PRODUCTION_URL;
    }

    private getInferredBaseHost(): string {
        // Derive a common base host by stripping known suffix if present.
        let base = this.API_PRODUCTION_URL;
        try {
            base = base.replace(/\/security\/v2\/?$/i, '');
        } catch (e) {
            // fallback to full url
        }
        return base;
    }

    async getUserEmail(username: string): Promise<any> {
        const site = CoreSites.getCurrentSite();
        if (!site) throw new Error('No hay sitio activo');

        const siteUrl = site.getURL();
        const params = new HttpParams()
            .set('wstoken', '6fa5f3551b230c84f99578121a74f100')
            .set('wsfunction', 'local_rfcmsindical_get_user_email')
            .set('moodlewsrestformat', 'json')
            .set('identifier', username);

        const url = `${siteUrl}/webservice/rest/server.php`;
        const response = await this.http.get<any>(url, { params }).toPromise();
        return response;
    }

    /**
     * Attempts to validate RF using security_v2 endpoint first. If it fails, returns the thrown error so callers can handle.
     */
    async validateRF(email: string): Promise<ValidateRFResponse> {
        const params = new HttpParams().set('email', email);
        const url = `${this.getSecurityV2Base()}/login/validate-rf`;
        try {
            const response = await this.http.get<ValidateRFResponse>(url, { params }).toPromise();
            // If success, cache the variant.
            this.detectedVariant = RfVariant.SecurityV2;
            console.debug('[RF] Detected variant:', this.detectedVariant);
            return response!;
        } catch (e) {
            console.debug('[RF] validateRF via security_v2 failed, will not block. Error:', e);
            // Re-throw so callers can decide to try alternative flows if needed.
            throw e;
        }
    }

    private normalizeResponse(raw: any, variant: RfVariant, status?: number): NormalizedResponse {
        try {
            switch (variant) {
                case RfVariant.Employee: {
                    // employee variant: { success, message, errors }
                    const message = raw.message ?? raw.msg ?? '';
                    const key = mapMessageToKey(message);
                    return { success: !!raw.success, code: raw.code ?? status, message, messageKey: key, password: raw.data?.password ?? null, raw };
                }
                case RfVariant.Empleados: {
                    // empleados variant: { message, status (true/false), code, error }
                    const message = raw.message ?? '';
                    const key = mapMessageToKey(message);
                    return { success: !!raw.status || raw.status === true, code: raw.code ?? status, message, messageKey: key, password: raw.data?.password ?? null, raw };
                }
                case RfVariant.SecurityV2:
                default: {
                    const actual = raw?.Result || raw;
                    const code = Number(actual?.code ?? raw?.code ?? status ?? 0);
                    const success = code === 200 || raw?.success === true || (actual && (code === 200 || actual.success === true));
                    const message = actual?.message ?? raw?.message ?? '';
                    const key = mapMessageToKey(message);
                    return { success, code, message, messageKey: key, password: actual?.data ?? null, raw };
                }
            }
        } catch (e) {
            return { success: false, code: status, message: 'Invalid response shape', raw };
        }
    }

    private async trySecurityV2_addFoto(request: any): Promise<NormalizedResponse> {
        const url = `${this.getSecurityV2Base()}/users/addFotoRF`;
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
        const raw = await resp.json().catch(() => null);
        return this.normalizeResponse(raw, RfVariant.SecurityV2, resp.status);
    }

    private async tryEmployee_addFoto(request: any): Promise<NormalizedResponse> {
        const base = this.getInferredBaseHost();
        const securityId = request.idUsuarioRF ?? request.idUsuario ?? '0';
        const url = `${base}/api/employee/${securityId}/photo-registration`;
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ photo: request.foto64 || request.photo || request.foto, side: request.lado ?? request.side ?? 1, app_id: request.idApp ?? 1, grouper: request.agrupador ?? request.grouper ?? '', operating_system: request.OS ?? 1, brand: request.Marca ?? request.brand ?? 'MoodleApp', model: request.Modelo ?? request.model ?? 'WebVersion', os_version: request.VersionSO ?? request.versionSO ?? '1.0' }) });
        const raw = await resp.json().catch(() => null);
        return this.normalizeResponse(raw, RfVariant.Employee, resp.status);
    }

    private async tryEmpleados_addFoto(request: any): Promise<NormalizedResponse> {
        const base = this.getInferredBaseHost();
        const securityId = request.idUsuarioRF ?? request.idUsuario ?? '0';
        const url = `${base}/api/empleados/${securityId}/fotos/registro`;
        const body = { foto: request.foto64 || request.photo || request.foto, lado: request.lado ?? request.side ?? 1, idApp: request.idApp ?? 1, agrupador: request.agrupador ?? request.grouper ?? '', pesoRequest: request.pesoRequest ?? 0, os: request.OS ?? 1, marca: request.Marca ?? 'MoodleApp', modelo: request.Modelo ?? 'WebVersion', versionSO: request.VersionSO ?? '1.0' };
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const raw = await resp.json().catch(() => null);
        return this.normalizeResponse(raw, RfVariant.Empleados, resp.status);
    }

    async addFotoRF(request: any): Promise<any> {
        const variants: RfVariant[] = [RfVariant.SecurityV2, RfVariant.Employee, RfVariant.Empleados];
        for (const v of variants) {
            try {
                let normalized: NormalizedResponse;
                if (v === RfVariant.SecurityV2) normalized = await this.trySecurityV2_addFoto(request);
                else if (v === RfVariant.Employee) normalized = await this.tryEmployee_addFoto(request);
                else normalized = await this.tryEmpleados_addFoto(request);

                console.debug('[RF] addFotoRF tried variant', v, '->', normalized);

                if (normalized.success) {
                    this.detectedVariant = v;
                    return { success: true, variant: v, raw: normalized.raw }; // preserve raw for callers
                }
                // If response indicates not found or user missing, still return the parsed result (not success).
                if (normalized.code && [400, 404].includes(normalized.code)) {
                    // keep trying other variants
                    continue;
                }
            } catch (e) {
                console.debug('[RF] addFotoRF variant', v, 'failed with', e);
                // try next variant
                continue;
            }
        }
        throw new Error(Translate ? Translate.instant('core.login.rf.addfoto_failed_all_variants') : 'addFotoRF failed on all known variants');
    }

    private async trySecurityV2_verify(request: any): Promise<NormalizedResponse> {
        const url = `${this.getSecurityV2Base()}/users/verifyFotoRF`;
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
        const raw = await resp.json().catch(() => null);
        return this.normalizeResponse(raw, RfVariant.SecurityV2, resp.status);
    }

    private async tryEmployee_verify(request: any): Promise<NormalizedResponse> {
        const base = this.getInferredBaseHost();
        const securityId = request.idUsuarioRF ?? request.idUsuario ?? '0';
        const url = `${base}/api/employee/${securityId}/verify-photo`;
        const body = { photo: request.foto64 || request.photo || request.foto, app_id: request.idApp ?? 1, grouper: request.agrupador ?? request.grouper ?? '', request_size: request.pesoRequest ?? 0, operating_system: request.OS ?? 1, brand: request.Marca ?? 'MoodleApp', model: request.Modelo ?? 'WebVersion', os_version: request.VersionSO ?? '1.0' };
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const raw = await resp.json().catch(() => null);
        return this.normalizeResponse(raw, RfVariant.Employee, resp.status);
    }

    private async tryEmpleados_verify(request: any): Promise<NormalizedResponse> {
        const base = this.getInferredBaseHost();
        const securityId = request.idUsuarioRF ?? request.idUsuario ?? '0';
        const url = `${base}/api/empleados/${securityId}/fotos/verify`;
        const body = { foto: request.foto64 || request.photo || request.foto, idApp: request.idApp ?? 1, agrupador: request.agrupador ?? request.grouper ?? '', pesoRequest: request.pesoRequest ?? 0, os: request.OS ?? 1, marca: request.Marca ?? 'MoodleApp', modelo: request.Modelo ?? 'WebVersion', versionSO: request.VersionSO ?? '1.0' };
        const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const raw = await resp.json().catch(() => null);
        return this.normalizeResponse(raw, RfVariant.Empleados, resp.status);
    }

    async verifyFotoRF(request: any): Promise<any> {
        const variants: RfVariant[] = [RfVariant.SecurityV2, RfVariant.Employee, RfVariant.Empleados];
        for (const v of variants) {
            try {
                let normalized: NormalizedResponse;
                if (v === RfVariant.SecurityV2) normalized = await this.trySecurityV2_verify(request);
                else if (v === RfVariant.Employee) normalized = await this.tryEmployee_verify(request);
                else normalized = await this.tryEmpleados_verify(request);

                console.debug('[RF] verifyFotoRF tried variant', v, '->', normalized);

                if (normalized.success) {
                    this.detectedVariant = v;
                    return { success: true, variant: v, password: normalized.password ?? null, raw: normalized.raw };
                }

                if (normalized.code && [400, 404].includes(normalized.code)) {
                    // Try next variant
                    continue;
                }
            } catch (e) {
                console.debug('[RF] verifyFotoRF variant', v, 'failed with', e);
                continue;
            }
        }
        return { success: false, error: 'Verificación fallida en todas las variantes' };
    }

    generateAgrupador(): string {
        return crypto.randomUUID();
    }

    getDeviceInfo() {
        return { OS: 1, Marca: 'MoodleApp', Modelo: 'WebVersion', VersionSO: '1.0.0' };
    }

    async validatePasswordWithMoodle(email: string, password: string): Promise<any> {
        const site = CoreSites.getCurrentSite();
        if (!site) throw new Error('No hay sitio activo');
        const siteUrl = site.getURL();
        const url = `${siteUrl}/webservice/rest/server.php`;
        const params = new HttpParams()
            .set('wstoken', '6fa5f3551b230c84f99578121a74f100')
            .set('wsfunction', 'local_rfcmsindical_validate_user_password')
            .set('moodlewsrestformat', 'json')
            .set('email', email)
            .set('password', password);
        const response = await this.http.get<any>(url, { params }).toPromise();
        if (response && response.status === true) return { success: true, message: response.message };
        return { success: false, message: response?.message || 'Contraseña incorrecta' };
    }

    private async initializeFaceDetector(): Promise<void> {
        try {
            if (!tf || !faceLandmarksDetection) { this.isDetectorReady = false; return; }
            await tf.setBackend('webgl');
            this.faceDetector = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, { runtime: 'mediapipe', solutionPath: 'https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh', refineLandmarks: false });
            this.isDetectorReady = true;
        } catch (e) {
            this.isDetectorReady = false;
            this.faceDetector = null;
        }
    }

    async validateFaceInImage(base64Image: string): Promise<any> {
        try {
            if (!this.isDetectorReady || !this.faceDetector) return { hasFace: true, confidence: 0, faceCount: 0, message: 'Detector no disponible - Validación omitida' };
            const image = await this.base64ToImageElement(base64Image);
            const faces = await this.faceDetector.estimateFaces(image);
            return { hasFace: faces.length > 0, confidence: faces.length > 0 ? 1.0 : 0.0, faceCount: faces.length, message: this.getFaceValidationMessage(faces.length) };
        } catch (e) {
            return { hasFace: true, confidence: 0, faceCount: 0, message: 'Error en validación - Continuar con precaución' };
        }
    }

    /**
     * Translate a raw server message into an i18n string when possible.
     * Returns the translated string or the original raw message when no mapping exists.
     */
    translateServerMessage(rawMessage?: string): string {
        const key = mapMessageToKey(rawMessage);
        if (key) return Translate.instant(key);
        return rawMessage ?? '';
    }

    private async base64ToImageElement(base64: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => resolve(img);
            img.onerror = (error) => reject(error);
            const dataUrl = base64.startsWith('data:') ? base64 : `data:image/jpeg;base64,${base64}`;
            img.src = dataUrl;
        });
    }

    private getFaceValidationMessage(faceCount: number): string {
        switch (faceCount) {
            case 0: return 'No se detectó ningún rostro en la imagen';
            case 1: return 'Rostro válido detectado correctamente';
            default: return `Se detectaron ${faceCount} rostros - Use una imagen con un solo rostro visible`;
        }
    }
}
