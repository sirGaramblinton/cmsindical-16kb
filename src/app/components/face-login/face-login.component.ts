import { Component, Output, EventEmitter, Input } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { FaceAuthService } from '@/app/services/face-auth.service';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';

@Component({
    selector: 'app-face-login',
    templateUrl: './face-login.component.html',
    styleUrls: ['./face-login.component.scss'],
    standalone: true,
    imports: [CommonModule, IonicModule],
})
export class FaceLoginComponent {
    @Input() loading: boolean = false;
    @Output() faceLoginSuccess = new EventEmitter<any>();
    isProcessing = false;
    error = '';
    photoDataUrl: string | null = null;
    detector: any = null;
    detectionResult: any = null;

    constructor(private faceAuthService: FaceAuthService) {}

    async openCamera() {
        this.isProcessing = true;
        this.error = '';
        this.error = 'Cámara temporalmente desactivada - usar flujo principal RF';
        this.isProcessing = false;
    }

    async processPhoto() {
        if (!this.photoDataUrl) return;
        this.isProcessing = true;
        this.error = '';
        this.detectionResult = null;
        try {
            await tf.setBackend('webgl');
            if (!this.detector) {
                this.detector = await faceLandmarksDetection.createDetector(faceLandmarksDetection.SupportedModels.MediaPipeFaceMesh, { runtime: 'tfjs', refineLandmarks: true });
            }
            const img = new window.Image();
            img.src = this.photoDataUrl;
            await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = reject; });
            const faces = await this.detector.estimateFaces(img);
            this.detectionResult = faces && faces.length > 0 ? faces[0] : null;
            if (!this.detectionResult) {
                this.error = 'No se detectó ningún rostro.';
            } else {
                this.faceAuthService.validateFace(this.photoDataUrl).subscribe({
                    next: (resp) => {
                        if (resp && resp.success) {
                            this.error = '';
                            setTimeout(() => { this.faceLoginSuccess.emit(resp); this.reset(); }, 1000);
                        } else {
                            this.error = 'El rostro no fue validado por el sistema.';
                        }
                    },
                    error: () => { this.error = 'Error al validar el rostro con el sistema externo.'; }
                });
            }
        } catch (err) {
            this.error = 'Error al analizar la foto.';
        }
        this.isProcessing = false;
    }

    reset() { this.photoDataUrl = null; this.error = ''; }
}
