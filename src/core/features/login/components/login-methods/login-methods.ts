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

import { Component, Input, OnInit } from '@angular/core';
import { FaceAuthService } from '@/app/services/face-auth.service';
// import { FaceLoginComponent } from '@/app/components/face-login/face-login.component';
import { AuthService } from '@/app/services/auth.service';
import { CorePromisedValue } from '@classes/promised-value';
import { CoreSite } from '@classes/sites/site';
import { CoreSiteIdentityProvider, CoreSitePublicConfigResponse } from '@classes/sites/unauthenticated-site';
import { CoreLoginHelper, CoreLoginMethod } from '@features/login/services/login-helper';
import { CoreRedirectPayload } from '@services/navigator';
import { CoreSitesFactory } from '@services/sites-factory';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreLoginIdentityProviderComponent } from '../identity-provider/identity-provider';
// import { FaceLoginComponent } from '@/app/components/face-login/face-login.component';
import { ModalController } from '@ionic/angular';
import { PreenrollModalComponent } from '../preenroll-modal/preenroll-modal.component';

@Component({
    selector: 'core-login-methods',
    templateUrl: 'login-methods.html',
    styleUrl: '../../login.scss',
    imports: [
        CoreSharedModule,
        CoreLoginIdentityProviderComponent,
        PreenrollModalComponent,
    ],
})
export class CoreLoginMethodsComponent implements OnInit {

    @Input() isReconnect = false;
    onFaceLoginSuccess(event: any) {
        this.faceLoginSuccess = '¡Login facial exitoso!';
        this.faceLoginError = undefined;
        if (event && event.token) {
            console.debug('CoreLoginMethodsComponent.onFaceLoginSuccess -> setSession', event.token ? 'has-token' : 'no-token', event.user);
            this.authService.setSession(event.token, event.user);
            setTimeout(() => {
                console.debug('CoreLoginMethodsComponent.onFaceLoginSuccess -> navigating to /dashboard, isAuthenticated=', this.authService.isAuthenticated());
                this.authService.navigateTo('/dashboard');
            }, 1000);
        }
    }

    faceLoginLoading = false;

    @Input() siteUrl = '';
    @Input() siteConfig?: CoreSitePublicConfigResponse;
    @Input() redirectData?: CoreRedirectPayload;
    @Input() site?: CoreSite; // Defined when the user is reconnecting.
    @Input() showLoginForm = true;
    isBrowserSSO = false;
    showScanQR = false;
    loginMethods: CoreLoginMethod[] = [];
    identityProviders: CoreSiteIdentityProvider[] = [];
    protected currentLoginProvider?: CoreSiteIdentityProvider;
    protected isReady = new CorePromisedValue<void>();
    showFaceLogin = false; // Temporarily disabled
    faceLoginSuccess?: string;
    faceLoginError?: string;

    constructor(
        private modalController: ModalController,
        private faceAuthService: FaceAuthService,
        public authService: AuthService,
    ) {}

    async openPreenrollModal(mode?: 'recover'): Promise<void> {
        const modal = await this.modalController.create({
            component: PreenrollModalComponent,
            cssClass: 'core-modal core-bootstrap-modal',
            componentProps: { startInRecover: mode === 'recover' },
        });
        await modal.present();
    }

    async ngOnInit(): Promise<void> {
        if (this.site) {
            this.siteUrl = this.site.getURL();
            const defaultMethod = await CoreLoginHelper.getDefaultLoginMethod();
            if (this.site.isLoggedOut() && defaultMethod) {
                await defaultMethod.action();
            }
        }
        if (this.siteConfig) {
            this.isBrowserSSO = CoreLoginHelper.isSSOLoginNeeded(
                this.siteConfig.typeoflogin,
            );
            // Identity providers won't be shown if login on browser.
            if (!this.isBrowserSSO) {
                this.identityProviders =
                    await CoreLoginHelper.getValidIdentityProvidersForSite(
                        this.site ??
                            CoreSitesFactory.makeUnauthenticatedSite(
                                this.siteUrl,
                                this.siteConfig,
                            ),
                    );
            }
            if (this.site) {
                // The identity provider set in the site will be shown at the top.
                const oAuthId = this.site.getOAuthId();
                this.currentLoginProvider =
                    CoreLoginHelper.findIdentityProvider(
                        this.identityProviders,
                        oAuthId,
                    );
                // Remove the identity provider from the array.
                this.identityProviders = this.identityProviders.filter(
                    (provider) =>
                        provider.url !== this.currentLoginProvider?.url,
                );
            }
            // await this.setShowScanQR();
        }
        this.isReady.resolve();
    }

    /**
     * Set if should show the scan QR code button.
     */
    async setShowScanQR(): Promise<void> {
        if (this.site) {
            if (this.site.isDemoModeSite()) {
                this.showScanQR = false;

                return;
            }

            this.showScanQR = CoreLoginHelper.displayQRInSiteScreen();

            if (this.showScanQR) {
                return;
            }
        }

        // If still false or credentials screen.
        // Disabled QR code display in credentials screen for now.a
        // if (this.siteConfig) {
        //     this.showScanQR =
        //         await CoreLoginHelper.displayQRInCredentialsScreen(
        //             this.siteConfig.tool_mobile_qrcodetype
        //         );
        // }
    }

    /**
     * Show instructions and scan QR code.
     */
    async showInstructionsAndScanQR(): Promise<void> {
        try {
            await CoreLoginHelper.showScanQRInstructions();

            await CoreLoginHelper.scanQR();
        } catch {
            // Ignore errors.
        }
    }

    /**
     * Get the current login.
     *
     * @returns Current login.
     */
    async getCurrentLogin(): Promise<CoreLoginMethodsCurrentLogin | undefined> {
        await this.isReady;
        if (!this.currentLoginProvider) {
            return;
        }

        const showOther =
            !!(this.showLoginForm || this.isBrowserSSO) &&
            !!(
                this.loginMethods.length ||
                this.identityProviders.length ||
                this.showScanQR
            );

        return {
            provider: this.currentLoginProvider,
            showOther,
        };
    }

    // Maneja la foto capturada desde el login facial
    onFacePhoto(photoDataUrl: string): void {
        // Aquí puedes asociar la foto al usuario y llamar a tu servicio/backend
        // Puedes obtener el username si lo tienes disponible en el contexto
        const username = undefined; // Reemplaza si tienes el usuario

        this.faceAuthService.validateFace(photoDataUrl).subscribe({
            next: (response) => {
                if (response?.token) {
                    console.debug('CoreLoginMethodsComponent.onFacePhoto -> setSession', response.token ? 'has-token' : 'no-token', response.user);
                    this.authService.setSession(response.token, response.user);
                    this.faceLoginSuccess = '¡Login facial exitoso! Redirigiendo...';
                    setTimeout(() => {
                        console.debug('CoreLoginMethodsComponent.onFacePhoto -> isAuthenticated=', this.authService.isAuthenticated());
                        if (this.authService.isAuthenticated()) {
                            console.debug('CoreLoginMethodsComponent.onFacePhoto -> navigating to /dashboard');
                            this.authService.navigateTo('/dashboard');
                        } else {
                            console.debug('CoreLoginMethodsComponent.onFacePhoto -> navigating to /login');
                            this.authService.navigateTo('/login');
                        }
                    }, 1500);
                } else {
                    this.faceLoginError =
                        'No se recibió token de autenticación.';
                }
            },
            error: (err) => {
                this.faceLoginError =
                    'Error en login facial: ' + (err?.message || '');
            },
        });
    }

}

export type CoreLoginMethodsCurrentLogin = {
    provider: CoreSiteIdentityProvider;
    showOther: boolean;
};
