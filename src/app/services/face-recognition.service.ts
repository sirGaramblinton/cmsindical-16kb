// Reconocimiento facial con TensorFlow.js (copiado desde CMSindical)
import { Injectable } from '@angular/core';
import { createDetector, SupportedModels } from '@tensorflow-models/face-landmarks-detection';
import '@tensorflow/tfjs-backend-webgl';

@Injectable({ providedIn: 'root' })
export class FaceRecognitionService {
    private detector: any = null;

    async loadModel(): Promise<void> {
        if (!this.detector) {
            this.detector = await createDetector(SupportedModels.MediaPipeFaceMesh, { runtime: 'tfjs', refineLandmarks: true, maxFaces: 1 });
        }
    }

    async estimateFaces(image: HTMLImageElement | HTMLVideoElement) {
        if (!this.detector) throw new Error('Detector no cargado');
        return await this.detector.estimateFaces(image);
    }

    async takePhoto(): Promise<string> {
        throw new Error('Método takePhoto temporalmente desactivado - usar flujo principal RF');
    }
}
