// (C) Copyright 2015 Moodle Pty Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// you may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { Component, inject, OnInit, OnDestroy, Input } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { CoreConstants } from '@/core/constants';

interface PreenrollCheckResponse {
    status: string;
    message?: string;
    validationcode: string;
    requirecontact?: boolean;
}

interface PreenrollValidateResponse {
    status: string;
    message: string;
    validationcode: string;
    data?: {
        rfc: string;
    };
}

interface RecoverResponse {
    status: string;
    message: string;
    validationcode: string;
}

// Mismo patrón que valida el servidor en local_preenroll.
const RFC_PATTERN = /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RFC_CHECK_DEBOUNCE = 300;
const MSG_RFC_INVALID = 'RFC inválido. Verifica tu información.';
const MSG_RFC_CHECK_FAILED = 'No se pudo validar el RFC. Intenta de nuevo.';

@Component({
    selector: 'app-preenroll-modal',
    templateUrl: './preenroll-modal.component.html',
    styleUrls: ['preenroll-modal.component.scss'],
    standalone: true,
    imports: [IonicModule, FormsModule],
    host: { class: 'core-modal core-modal-auto-height' },
})
export class PreenrollModalComponent implements OnInit, OnDestroy {

        // Permite abrir directamente el formulario de recuperación desde el login
        @Input() startInRecover = false;
    // Estados posibles: 'form', 'processing', 'success', 'exists', 'recover', 'recover-processing', 'recover-success'
    modalState:
        | 'form'
        | 'processing'
        | 'success'
        | 'exists'
        | 'recover'
        | 'recover-processing'
        | 'recover-success' = 'form';

    // Mensajes e iconos
    modalMsg = '';
    modalIcon = '';

    ngOnInit(): void {
        this.resetAll();
        if (this.startInRecover) {
            this.openRecoverForm();
        }
    }

    ngOnDestroy(): void {
        this.clearRfcCheck();
    }

    resetAll(): void {
        this.resetForm();
        this.resetRecoverForm();
        this.showRecoverForm = false;
        this.modalMsg = '';
        this.modalIcon = '';
        this.modalState = 'form';
    }

    resetForm(): void {
        this.nombres = '';
        this.apellidos = '';
        this.rfc = '';
        this.correo = '';
        this.telefono = '';
        this.validationMsg = '';
        this.responseMsg = '';
        this.isSubmitting = false;
        this.resetRfcState();
    }

    resetRecoverForm(): void {
        this.recoverRfc = '';
        this.recoverMsg = '';
        this.isRecovering = false;
    }

    openRecoverForm(): void {
        this.resetForm();
        this.resetRecoverForm();
        this.modalState = 'recover';
        this.modalMsg = '';
        this.modalIcon = '';
    }

    nombres = '';
    apellidos = '';
    rfc = '';
    correo = '';
    telefono = '';
    validationMsg = '';
    responseMsg = '';
    isSubmitting = false;

    // Validación previa del RFC contra check.php
    rfcState: 'idle' | 'checking' | 'valid' | 'error' = 'idle';
    rfcMsg = '';
    requireContact = false;
    private checkedRfc = '';
    private rfcCheckTimer?: ReturnType<typeof setTimeout>;
    private rfcCheckSub?: Subscription;
    // Respuestas ok/notfound por RFC mientras el modal esté abierto.
    private rfcCache = new Map<string, PreenrollCheckResponse>();

    // Recuperación de contraseña
    showRecoverForm = false;
    recoverRfc = '';
    recoverMsg = '';
    isRecovering = false;

    private modalController = inject(ModalController);
    private http = inject(HttpClient);

    get canSubmit(): boolean {
        return this.rfcState === 'valid' && !this.isSubmitting;
    }

    dismiss(): void {
        this.modalController.dismiss();
    }

    /**
     * Normaliza el RFC a mayúsculas y, si cambió, regresa el formulario a su estado inicial.
     *
     * @param event Evento ionInput del campo RFC.
     */
    onRfcInput(event: Event): void {
        const input = event.target as HTMLIonInputElement;
        const value = String(input.value ?? '').replace(/\s/g, '').toUpperCase().slice(0, 13);
        input.value = value;
        if (value === this.rfc) {
            return;
        }
        this.rfc = value;
        this.resetRfcState();
        if (value.length === 13) {
            this.rfcCheckTimer = setTimeout(() => this.checkRfc(), RFC_CHECK_DEBOUNCE);
        }
    }

    onRfcBlur(): void {
        // Si ya se validó o hay una petición en curso para este RFC, no se repite.
        if (!this.rfc || this.rfcState === 'checking' || this.rfcState === 'valid') {
            return;
        }
        this.checkRfc();
    }

    /**
     * Mantiene el teléfono solo con dígitos (sin paréntesis, guiones ni espacios), máximo 10.
     *
     * @param event Evento ionInput del campo teléfono.
     */
    onTelefonoInput(event: Event): void {
        const input = event.target as HTMLIonInputElement;
        const digits = String(input.value ?? '').replace(/\D/g, '').slice(0, 10);
        input.value = digits;
        this.telefono = digits;
    }

    /**
     * Valida el RFC actual con check.php para saber si existe y si requiere correo y teléfono.
     */
    checkRfc(): void {
        this.clearRfcCheck();
        const rfc = this.rfc;
        if (!RFC_PATTERN.test(rfc)) {
            this.setRfcError(MSG_RFC_INVALID);

            return;
        }
        const cached = this.rfcCache.get(rfc);
        if (cached) {
            this.applyRfcResult(rfc, cached);

            return;
        }
        this.rfcState = 'checking';
        this.rfcMsg = '';
        this.rfcCheckSub = this.http
            .post<PreenrollCheckResponse>(this.getServiceUrl('check.php'), { rfc })
            .subscribe({
                next: (resp) => {
                    if (resp.status === 'ok' || resp.status === 'notfound') {
                        this.rfcCache.set(rfc, resp);
                    }
                    this.applyRfcResult(rfc, resp);
                },
                error: () => {
                    this.setRfcError(MSG_RFC_CHECK_FAILED);
                },
            });
    }

    validateFields(): boolean {
        this.validationMsg = this.getFieldsError();

        return !this.validationMsg;
    }

    submit(): void {
        if (this.isSubmitting) {
            return;
        }
        // El RFC a enviar debe ser el mismo que pasó por check.php.
        if (this.rfcState !== 'valid' || this.checkedRfc !== this.rfc) {
            if (this.rfcState !== 'checking') {
                this.checkRfc();
            }

            return;
        }
        if (!this.validateFields()) {
            return;
        }
        this.modalState = 'processing';
        this.isSubmitting = true;
        const params: Record<string, string> = { rfc: this.rfc };
        if (this.requireContact) {
            params.telefono = this.telefono;
            params.email = this.correo.trim();
        }
        this.http
            .post<PreenrollValidateResponse>(this.getServiceUrl('validate.php'), params)
            .subscribe({
                next: (resp) => {
                    this.isSubmitting = false;
                    if (resp.status === 'ok') {
                        this.modalState = 'success';
                        this.modalMsg = resp.message;
                        this.modalIcon = 'checkmark-circle-outline';
                        this.resetForm();
                    } else if (resp.status === 'exists') {
                        this.modalState = 'exists';
                        this.modalMsg = resp.message;
                        this.modalIcon = 'information-circle-outline';
                        this.resetForm();
                    } else {
                        // invalid, notel, error o cualquier status desconocido.
                        this.validationMsg =
                            resp.message || 'Error inesperado en la validación.';
                        this.modalState = 'form';
                    }
                },
                error: () => {
                    this.isSubmitting = false;
                    this.validationMsg = 'Error de conexión o del servidor.';
                    this.modalState = 'form';
                },
            });
    }

    submitRecover(event?: Event): void {
        if (event) {
            event.preventDefault();
        }
        if (!this.recoverRfc.trim() || this.recoverRfc.length !== 13) {
            this.recoverMsg = 'El RFC debe tener exactamente 13 caracteres.';

            return;
        }
        this.modalState = 'recover-processing';
        this.isRecovering = true;
        this.http
            .post<RecoverResponse>(this.getServiceUrl('recover.php'), { rfc: this.recoverRfc })
            .subscribe({
                next: (resp) => {
                    this.modalState = 'recover-success';
                    this.modalMsg = resp.message || 'Respuesta recibida.';
                    this.modalIcon = 'mail-unread-outline';
                    this.resetRecoverForm();
                },
                error: () => {
                    this.recoverMsg = 'Error de conexión o del servidor.';
                    this.modalState = 'recover';
                },
                complete: () => {
                    this.isRecovering = false;
                },
            });
    }

    /**
     * Aplica la respuesta de check.php, solo si el RFC no cambió mientras se consultaba.
     *
     * @param rfc RFC consultado.
     * @param resp Respuesta de check.php.
     */
    protected applyRfcResult(rfc: string, resp: PreenrollCheckResponse): void {
        if (rfc !== this.rfc) {
            return;
        }
        if (resp.status === 'ok') {
            this.rfcState = 'valid';
            this.rfcMsg = '';
            this.checkedRfc = rfc;
            this.requireContact = !!resp.requirecontact;
        } else if (resp.status === 'exists') {
            this.modalState = 'exists';
            this.modalMsg = resp.message ?? '';
            this.modalIcon = 'information-circle-outline';
            this.resetForm();
        } else if (resp.status === 'notfound' || resp.status === 'invalid') {
            this.setRfcError(resp.message || MSG_RFC_INVALID);
        } else {
            this.setRfcError(resp.message || MSG_RFC_CHECK_FAILED);
        }
    }

    /**
     * Regresa la validación del RFC al estado inicial: botón deshabilitado y correo/teléfono ocultos.
     */
    protected resetRfcState(): void {
        this.clearRfcCheck();
        this.rfcState = 'idle';
        this.rfcMsg = '';
        this.checkedRfc = '';
        this.requireContact = false;
        this.validationMsg = '';
    }

    protected setRfcError(message: string): void {
        this.rfcState = 'error';
        this.rfcMsg = message;
        this.checkedRfc = '';
        this.requireContact = false;
    }

    /**
     * Cancela el debounce pendiente y la petición a check.php en curso, si existen.
     */
    protected clearRfcCheck(): void {
        clearTimeout(this.rfcCheckTimer);
        this.rfcCheckTimer = undefined;
        this.rfcCheckSub?.unsubscribe();
        this.rfcCheckSub = undefined;
    }

    protected getFieldsError(): string {
        const nombres = this.nombres.trim();
        const apellidos = this.apellidos.trim();
        if (!nombres) {
            return 'El nombre es obligatorio.';
        }
        if (nombres.length > 100) {
            return 'El nombre no puede exceder 100 caracteres.';
        }
        if (!apellidos) {
            return 'El apellido es obligatorio.';
        }
        if (apellidos.length > 100) {
            return 'El apellido no puede exceder 100 caracteres.';
        }
        // Correo y teléfono solo aplican cuando check.php indicó requirecontact.
        if (this.requireContact) {
            const correo = this.correo.trim();
            if (!correo || correo.length > 100 || !EMAIL_PATTERN.test(correo)) {
                return 'Correo electrónico inválido. Verifica tu información.';
            }
            if (!/^\d{10}$/.test(this.telefono)) {
                return 'El teléfono debe tener 10 dígitos.';
            }
        }

        return '';
    }

    protected getServiceUrl(script: string): string {
        let baseUrl = '';
        if (
            CoreConstants.CONFIG.sites &&
            CoreConstants.CONFIG.sites.length > 0
        ) {
            baseUrl = CoreConstants.CONFIG.sites[0].url.trim();
        }
        if (baseUrl.endsWith('/')) {
            baseUrl = baseUrl.slice(0, -1);
        }

        return `${baseUrl}/local/preenroll/${script}`;
    }

}
