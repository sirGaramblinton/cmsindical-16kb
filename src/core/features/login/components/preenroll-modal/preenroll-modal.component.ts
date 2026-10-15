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
import { Component, inject, OnInit, Input } from '@angular/core';
import { ModalController, IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { CoreConstants } from '@/core/constants';

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

@Component({
    selector: 'app-preenroll-modal',
    templateUrl: './preenroll-modal.component.html',
    styleUrls: ['preenroll-modal.component.scss'],
    standalone: true,
    imports: [IonicModule, FormsModule],
    host: { class: 'core-modal core-modal-auto-height' },
})
export class PreenrollModalComponent implements OnInit {

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

    resetAll(): void {
        this.nombres = '';
        this.apellidos = '';
        this.rfc = '';
        this.validationMsg = '';
        this.responseMsg = '';
        this.isSubmitting = false;
        this.showRecoverForm = false;
        this.recoverRfc = '';
        this.recoverMsg = '';
        this.isRecovering = false;
        this.modalMsg = '';
        this.modalIcon = '';
        this.modalState = 'form';
    }

    resetForm(): void {
        this.nombres = '';
        this.apellidos = '';
        this.rfc = '';
        this.validationMsg = '';
        this.responseMsg = '';
        this.isSubmitting = false;
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
    validationMsg = '';
    responseMsg = '';
    isSubmitting = false;

    // Recuperación de contraseña
    showRecoverForm = false;
    recoverRfc = '';
    recoverMsg = '';
    isRecovering = false;

    private modalController = inject(ModalController);
    private http = inject(HttpClient);

    dismiss(): void {
        this.modalController.dismiss();
    }

    validateFields(): boolean {
        if (
            !this.nombres.trim() ||
            !this.apellidos.trim() ||
            !this.rfc.trim()
        ) {
            this.validationMsg = 'Todos los campos son obligatorios.';

            return false;
        }
        if (this.nombres.length > 100) {
            this.validationMsg =
                'El campo Nombres no puede exceder 100 caracteres.';

            return false;
        }
        if (this.apellidos.length > 100) {
            this.validationMsg =
                'El campo Apellidos no puede exceder 100 caracteres.';

            return false;
        }
        if (this.rfc.length !== 13) {
            this.validationMsg = 'El RFC debe tener exactamente 13 caracteres.';

            return false;
        }
        this.validationMsg = '';

        return true;
    }

    submit(): void {
        if (!this.validateFields()) {
            return;
        }
        this.modalState = 'processing';
        this.isSubmitting = true;
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
        const validateUrl = `${baseUrl}/local/preenroll/validate.php`;
        this.http
            .post<PreenrollValidateResponse>(validateUrl, { rfc: this.rfc })
            .subscribe({
                next: (resp) => {
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
                    } else if (resp.status === 'notel') {
                        this.validationMsg = resp.message;
                        this.modalState = 'form';
                    } else {
                        this.validationMsg =
                            resp.message || 'Error desconocido.';
                        this.modalState = 'form';
                    }
                },
                error: () => {
                    this.validationMsg = 'Error de conexión o del servidor.';
                    this.modalState = 'form';
                },
                complete: () => {
                    this.isSubmitting = false;
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
        const recoverUrl = `${baseUrl}/local/preenroll/recover.php`;
        this.http
            .post<RecoverResponse>(recoverUrl, { rfc: this.recoverRfc })
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

}
