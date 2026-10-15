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

import { Component, OnInit, OnDestroy, ElementRef, inject, viewChild, effect } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { CoreNetwork } from '@services/network';
import { CoreSiteBasicInfo, CoreSites, CoreSitesReadingStrategy } from '@services/sites';
import { CorePromiseUtils } from '@static/promise-utils';
import { CoreLoginHelper } from '@features/login/services/login-helper';
import { CoreSite } from '@classes/sites/site';
import { CoreEventObserver, CoreEvents } from '@static/events';
import { CoreError } from '@classes/errors/error';
import { CoreNavigator, CoreRedirectPayload } from '@services/navigator';
import { CoreForms } from '@static/form';
import { CoreUserSupport } from '@features/user/services/support';
import { CoreUserSupportConfig } from '@features/user/classes/support/support-config';
import { CoreUserAuthenticatedSupportConfig } from '@features/user/classes/support/authenticated-support-config';
import { Translate } from '@singletons';
import { SafeHtml } from '@angular/platform-browser';
import { CoreSitePublicConfigResponse } from '@classes/sites/unauthenticated-site';
import { ALWAYS_SHOW_LOGIN_FORM_CHANGED, FORGOTTEN_PASSWORD_FEATURE_NAME } from '@features/login/constants';
import { CoreKeyboard } from '@static/keyboard';
import { CoreLoadings } from '@services/overlays/loadings';
import { CoreLoginMethodsComponent, CoreLoginMethodsCurrentLogin } from '@features/login/components/login-methods/login-methods';
import { FacialRecognitionService, ValidateRFResponse } from '../../services/facial-recognition.service';
import { CoreAlerts } from '@services/overlays/alerts';
import { CoreSharedModule } from '@/core/shared.module';
import { CoreSiteLogoComponent } from '../../../../components/site-logo/site-logo';
import { CoreLoginExceededAttemptsComponent } from '../../components/exceeded-attempts/exceeded-attempts';
import { CoreLoginIdentityProviderComponent } from '../../components/identity-provider/identity-provider';

/**
 * Page to enter the user password to reconnect to a site.
 */
@Component({
    selector: 'page-core-login-reconnect',
    templateUrl: 'reconnect.html',
    styleUrls: ['../../login.scss', 'reconnect.scss'],
    imports: [
        CoreSharedModule,
        CoreSiteLogoComponent,
        CoreLoginExceededAttemptsComponent,
        CoreLoginIdentityProviderComponent,
        CoreLoginMethodsComponent,
    ],
})
export default class CoreLoginReconnectPage implements OnInit, OnDestroy {

    readonly formElement = viewChild<ElementRef>('reconnectForm');
    readonly loginMethods = viewChild(CoreLoginMethodsComponent);

    credForm: FormGroup;
    site!: CoreSite;
    displaySiteUrl = false;
    showForgottenPassword = true;
    showUserAvatar = false;
    isBrowserSSO = false;
    currentLogin?: CoreLoginMethodsCurrentLogin;
    isLoggedOut: boolean;
    siteId!: string;
    siteInfo?: CoreSiteBasicInfo;
    showLoading = true;
    reconnectAttempts = 0;
    supportConfig?: CoreUserSupportConfig;
    exceededAttemptsHTML?: SafeHtml | string | null;
    siteConfig?: CoreSitePublicConfigResponse;
    redirectData?: CoreRedirectPayload;
    showLoginForm = true;

    // Facial recognition vars
    showFacialRecognitionButton = false;
    facialRecognitionData?: ValidateRFResponse;
    facialRecognitionLoading = false;

    protected viewLeft = false;
    protected eventThrown = false;
    protected loginSuccessful = false;
    protected username = '';
    protected alwaysShowLoginFormObserver?: CoreEventObserver;
    protected loginObserver?: CoreEventObserver;
    protected fb = inject(FormBuilder);
    protected facialRecognitionService = inject(FacialRecognitionService);

    constructor() {
        const currentSite = CoreSites.getCurrentSite();

        this.isLoggedOut = !currentSite || currentSite.isLoggedOut();
        this.credForm = this.fb.group({
            password: ['', Validators.required],
        });

        // Listen to LOGIN event to determine if login was successful, since the login can be done using QR, biometric, etc.
        this.loginObserver = CoreEvents.on(CoreEvents.LOGIN, () => {
            this.loginSuccessful = true;
        });

        const effectRef = effect(async () => {
            const loginMethods = this.loginMethods();
            if (!loginMethods) {
                return;
            }

            this.currentLogin = await CorePromiseUtils.ignoreErrors(loginMethods.getCurrentLogin());

            if (this.currentLogin) {
                effectRef.destroy();
            }
        });
    }

    /**
     * @inheritdoc
     */
    async ngOnInit(): Promise<void> {
        try {
            this.siteId = CoreNavigator.getRequiredRouteParam<string>('siteId');

            const redirectPath = CoreNavigator.getRouteParam('redirectPath');
            const urlToOpen = CoreNavigator.getRouteParam('urlToOpen');
            if (redirectPath || urlToOpen) {
                this.redirectData = {
                    redirectPath,
                    redirectOptions: CoreNavigator.getRouteParam('redirectOptions'),
                    urlToOpen,
                };
            }

            this.site = await CoreSites.getSite(this.siteId);

            if (!this.site.infos) {
                throw new CoreError('Invalid site');
            }

            this.siteInfo = {
                id: this.siteId,
                siteUrl: this.site.getURL(),
                siteUrlWithoutProtocol: this.site.getURL().replace(/^https?:\/\//, '').toLowerCase(),
                fullname: this.site.infos.fullname,
                firstname: this.site.infos.firstname,
                lastname: this.site.infos.lastname,
                siteName: await this.site.getSiteName(),
                userpictureurl: this.site.infos.userpictureurl,
                loggedOut: true, // Not used.
            };

            this.displaySiteUrl = this.site.shouldDisplayInformativeLinks();
            this.username = this.site.infos.username;
            this.supportConfig = new CoreUserAuthenticatedSupportConfig(this.site);

            const availableSites = await CoreLoginHelper.getAvailableSites();

            // Show logo instead of avatar if it's a fixed site.
            this.showUserAvatar = !availableSites.length;

            await this.checkSiteConfig();

            // Check facial recognition capabilities (if service available)
            try {
                await this.checkFacialRecognitionCapabilities();
            } catch {
                // Ignore errors from RF check to not block normal flow.
            }

            this.alwaysShowLoginFormObserver = CoreEvents.on(ALWAYS_SHOW_LOGIN_FORM_CHANGED, async () => {
                this.showLoginForm = await CoreLoginHelper.shouldShowLoginForm(this.siteConfig);
            });

            this.showLoading = false;
        } catch (error) {
            CoreAlerts.showError(error);

            return this.cancel();
        }
    }

    /**
     * @inheritdoc
     */
    ngOnDestroy(): void {
        this.viewLeft = true;
        CoreEvents.trigger(
            CoreEvents.LOGIN_SITE_UNCHECKED,
            {
                config: this.siteConfig,
                loginSuccessful: this.loginSuccessful,
                siteId: this.siteId,
            },
            this.siteId,
        );
        this.alwaysShowLoginFormObserver?.off();
        this.loginObserver?.off();
    }

    /**
     * Show help modal.
     */
    showHelp(): void {
        CoreUserSupport.showHelp(
            Translate.instant('core.login.reconnecthelp'),
            Translate.instant('core.login.reconnectsupportsubject'),
            this.supportConfig,
        );
    }

    /**
     * Get some data (like identity providers) from the site config.
     */
    protected async checkSiteConfig(): Promise<void> {
        this.siteConfig = await CorePromiseUtils.ignoreErrors(this.site.getPublicConfig({
            readingStrategy: CoreSitesReadingStrategy.PREFER_NETWORK,
        }));

        this.showLoginForm = await CoreLoginHelper.shouldShowLoginForm(this.siteConfig);

        if (!this.siteConfig) {
            return;
        }

        this.showForgottenPassword = !this.site.isFeatureDisabled(FORGOTTEN_PASSWORD_FEATURE_NAME);
        this.exceededAttemptsHTML = CoreLoginHelper.buildExceededAttemptsHTML(
            !!this.supportConfig?.canContactSupport(),
            this.showForgottenPassword,
        );

        if (!this.eventThrown && !this.viewLeft) {
            this.eventThrown = true;
            CoreEvents.trigger(CoreEvents.LOGIN_SITE_CHECKED, { config: this.siteConfig, siteId: this.siteId });
        }

        this.isBrowserSSO = CoreLoginHelper.isSSOLoginNeeded(this.siteConfig.typeoflogin);

        await CoreSites.checkApplication(this.siteConfig);
    }

    /**
     * Cancel reconnect.
     *
     * @param e Event.
     */
    cancel(e?: Event): void {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (this.isLoggedOut) {
            // Go to sites page when user is logged out.
            CoreNavigator.navigate('/login/sites', { reset: true });
        }

        CoreSites.logout();
    }

    /**
     * Tries to authenticate the user.
     *
     * @param e Event.
     */
    async login(e: Event): Promise<void> {
        e.preventDefault();
        e.stopPropagation();

        CoreKeyboard.close();

        // Get input data.
        const password = this.credForm.value.password;

        if (!password) {
            CoreAlerts.showError(Translate.instant('core.login.passwordrequired'));

            return;
        }

        if (!CoreNetwork.isOnline()) {
            CoreAlerts.showError(Translate.instant('core.networkerrormsg'));

            return;
        }

        const modal = await CoreLoadings.show();

        const url = this.site.getURL();

        try {
            // Start the authentication process.
            const data = await CoreSites.getUserToken(url, this.username, password);

            await CoreSites.updateSiteToken(url, this.username, data.token, data.privateToken);

            CoreForms.triggerFormSubmittedEvent(this.formElement(), true);

            // Unset oAuthID if it's set.
            await CoreSites.removeSiteOauthId(this.siteId);

            // Update site info too.
            await CoreSites.updateSiteInfoByUrl(url, this.username);

            // Reset fields so the data is not in the view anymore.
            this.credForm.controls['password'].reset();

            // Go to the site initial page.
            await CoreNavigator.navigateToSiteHome({
                params: this.redirectData,
            });
        } catch (error) {
            CoreLoginHelper.treatUserTokenError(url, error, this.username, password);

            if (error.loggedout) {
                this.cancel();
            } else if (error.errorcode === 'forcepasswordchangenotice') {
                // Reset password field.
                this.credForm.controls.password.reset();
            } else if (error.errorcode === 'invalidlogin') {
                this.reconnectAttempts++;
            }
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Exceeded attempts message clicked.
     *
     * @param event Click event.
     */
    exceededAttemptsClicked(event: Event): void {
        event.preventDefault();

        if (!(event.target instanceof HTMLAnchorElement)) {
            return;
        }

        this.forgottenPassword();
    }

    /**
     * Forgotten password button clicked.
     */
    forgottenPassword(): void {
        CoreLoginHelper.forgottenPasswordClicked(this.site.getURL(), this.username, this.siteConfig);
    }

    /**
     * Open browser for SSO login.
     */
    openBrowserSSO(): void {
        if (!this.siteConfig) {
            return;
        }

        CoreLoginHelper.openBrowserForSSOLogin(
            this.site.getURL(),
            this.siteConfig.typeoflogin,
            undefined,
            this.siteConfig.launchurl,
            this.redirectData,
        );
    }

    /**
     * Verifica las capacidades de reconocimiento facial del usuario
     */
    async checkFacialRecognitionCapabilities(): Promise<void> {
        try {
            this.facialRecognitionLoading = true;

            // STEP 1: obtain email for the user
            const userEmailResponse = await this.facialRecognitionService.getUserEmail(this.username);

            const rfValidation = await this.facialRecognitionService.validateRF(userEmailResponse.email);
            this.facialRecognitionData = rfValidation;
            this.showFacialRecognitionButton = rfValidation.allowRf === '1';
        } catch (error) {
            // Don't block login in case of errors
            console.error('Error checking facial recognition capabilities:', error);
            this.showFacialRecognitionButton = false;
            this.facialRecognitionData = undefined;
        } finally {
            this.facialRecognitionLoading = false;
        }
    }

    /**
     * Maneja el click del botón de reconocimiento facial
     */
    async startFacialRecognition(): Promise<void> {
        // Clear password field for privacy
        this.credForm.controls['password'].setValue('');

        if (!this.facialRecognitionData) {
            CoreAlerts.showError(Translate.instant('core.login.rf.no_data_available'));

            return;
        }

        const modal = await CoreLoadings.show(Translate.instant('core.login.rf.preparing'));

        try {
            if (this.facialRecognitionData.haveRfRegister === '0') {
                await this.handleFacialRecognitionRegistration();
            } else {
                await this.handleFacialRecognitionLogin();
            }
        } catch (error) {
            console.debug('[RF] startFacialRecognition error:', error);
            CoreAlerts.showError(Translate.instant('core.login.rf.error_generic_simple'));
            throw error;
        } finally {
            modal.dismiss();
        }
    }

    /**
     * Registro inicial para reconocimiento facial
     */
    async handleFacialRecognitionRegistration(): Promise<void> {
        if (!this.facialRecognitionData) {
            throw new Error(Translate.instant('core.login.rf.no_rf_data_registration'));
        }

        await CoreAlerts.show({ header: Translate.instant('core.login.rf.registration_title'), message: Translate.instant('core.login.rf.registration_message'), buttons: [Translate.instant('core.ok')] });

        const photoFrontal = await this.capturePhoto(Translate.instant('core.login.rf.instruction_look_directly'));
        if (!photoFrontal) {
            throw new Error(Translate.instant('core.login.rf.capture_frontal_failed'));
        }

        const faceValidation = await this.facialRecognitionService.validateFaceInImage(photoFrontal);
        if (!faceValidation.hasFace) {
            await CoreAlerts.show({ header: Translate.instant('core.login.rf.face_validation_title'), message: `${faceValidation.message}\n${Translate.instant('core.login.rf.face_validation_tryagain')}`, buttons: [{ text: Translate.instant('core.login.try_again'), cssClass: 'moodle-alert-button-confirm' }] });
            throw new Error('FACE_VALIDATION_FAILED');
        }

        const deviceInfo = this.facialRecognitionService.getDeviceInfo();
        const agrupador = this.facialRecognitionService.generateAgrupador();
        const fechaCaptura = new Date().toISOString().split('T')[0];

        const requestFrontal = {
            foto64: photoFrontal,
            idUsuarioRF: parseInt(this.facialRecognitionData.userRfId),
            idUsuario: parseInt(this.facialRecognitionData.userId),
            password: this.facialRecognitionData.password,
            agrupador: agrupador,
            fechadeCaptura: fechaCaptura,
            idApp: 1,
            lado: 0,
            secuencia: 1,
            claveUsuario: this.facialRecognitionData.userKey,
            ...deviceInfo,
        };

        await this.facialRecognitionService.addFotoRF(requestFrontal);

        await CoreAlerts.show({ header: Translate.instant('core.login.rf.registration_completed'), message: Translate.instant('core.login.rf.registration_completed_message'), buttons: [Translate.instant('core.ok')] });

        this.facialRecognitionData.haveRfRegister = '1';
    }

    /**
     * Maneja el login con reconocimiento facial
     */
    async handleFacialRecognitionLogin(): Promise<void> {
        if (!this.facialRecognitionData) {
            throw new Error(Translate.instant('core.login.rf.no_rf_data_available'));
        }

        const photoDataUrl = await this.capturePhoto(Translate.instant('core.login.rf.instruction_verify_identity'));
        if (!photoDataUrl) {
            throw new Error(Translate.instant('core.login.rf.capture_failed'));
        }

        const faceValidation = await this.facialRecognitionService.validateFaceInImage(photoDataUrl);
        if (!faceValidation.hasFace) {
            await CoreAlerts.show({ header: Translate.instant('core.login.rf.face_validation_title'), message: `${faceValidation.message}\n${Translate.instant('core.login.rf.face_validation_tryagain')}`, buttons: [{ text: Translate.instant('core.login.try_again'), cssClass: 'moodle-alert-button-confirm' }] });
            throw new Error('FACE_VALIDATION_FAILED');
        }

        const verificationResult = await this.facialRecognitionService.verifyFotoRF({ IdUsuario: parseInt(this.facialRecognitionData.userId), password: this.facialRecognitionData.password, Foto64: photoDataUrl, IdUsuarioFR: parseInt(this.facialRecognitionData.userRfId) });

        if (verificationResult && verificationResult.success === true) {
            const rfPassword = verificationResult.password;

            if (rfPassword) {
                const userEmailResponse = await this.facialRecognitionService.getUserEmail(this.username);
                const passwordValidation = await this.facialRecognitionService.validatePasswordWithMoodle(userEmailResponse.email, rfPassword);

                if (!passwordValidation.success) {
                    this.credForm.controls['password'].setValue('');
                await CoreAlerts.show({ header: Translate.instant('core.login.rf.identity_sync_problem'), message: Translate.instant('core.login.rf.identity_sync_message'), buttons: [Translate.instant('core.ok')] });

                    return;
                }
            }

            await CoreAlerts.show({ header: Translate.instant('core.login.rf.verification_success'), message: Translate.instant('core.login.rf.verification_success_message'), buttons: [Translate.instant('core.ok')] });

            if (verificationResult.password) {
                // Auto-login using the obtained password
                this.credForm.controls['password'].setValue(verificationResult.password);
                const mockEvent = new Event('submit');
                try {
                    await this.login(mockEvent);
                } catch (loginError) {
                await CoreAlerts.show({ header: Translate.instant('core.error'), message: Translate.instant('core.login.rf.login_error_auto'), buttons: [Translate.instant('core.ok')] });
                    this.credForm.controls['password'].setValue(verificationResult.password);
                }
            } else {
            await CoreAlerts.show({ header: Translate.instant('core.login.rf.manual_login_required'), message: Translate.instant('core.login.rf.manual_login_message'), buttons: [Translate.instant('core.ok')] });
            }
        } else {
            await CoreAlerts.show({ header: Translate.instant('core.login.rf.face_validation_title'), message: Translate.instant('core.login.rf.face_validation_tryagain'), buttons: [{ text: Translate.instant('core.login.try_again'), cssClass: 'moodle-alert-button-confirm' }] });
        }
    }

    /**
     * Captura una foto usando la cámara del dispositivo
     *
     * @param instruction
     */
    async capturePhoto(instruction: string): Promise<string> {
        try {
            const DATA_URL = 0;
            const CAMERA = 1;
            const JPEG = 0;
            const PHOTO = 0;
            const FRONT_CAMERA = 1;

            const options = {
                quality: 90,
                targetWidth: 300,
                targetHeight: 300,
                destinationType: DATA_URL,
                sourceType: CAMERA,
                encodingType: JPEG,
                mediaType: PHOTO,
                correctOrientation: true,
                saveToPhotoAlbum: false,
                cameraDirection: FRONT_CAMERA,
                allowEdit: false,
            };

            return new Promise((resolve, reject) => {
                (navigator as any).camera.getPicture(
                    (imageData: string) => {
                        if (imageData.startsWith('file://') || imageData.startsWith('/storage/') || imageData.startsWith('/data/')) {
                            reject(new Error(Translate.instant('core.login.rf.capture_file_uri_error')));

                            return;
                        }

                        if (!/^[A-Za-z0-9+/]/.test(imageData) || imageData.length < 100) {
                            reject(new Error(Translate.instant('core.login.rf.face_no_detected')));

                            return;
                        }

                        resolve(imageData);
                    },
                    (error: any) => {
                        if (error && typeof error === 'string' && error.includes('cancelled')) {
                            reject(new Error(Translate.instant('core.login.rf.capture_cancelled')));
                        } else {
                            const rawMsg = error instanceof Error ? error.message : String(error);
                            const translated = this.facialRecognitionService.translateServerMessage(rawMsg);
                            reject(new Error(Translate.instant('core.login.rf.error_generic', { $a: translated }))); 
                        }
                    },
                    options,
                );
            });
        } catch (error) {
            const rawMsg = error instanceof Error ? error.message : String(error ?? 'Unknown');
            const translated = this.facialRecognitionService.translateServerMessage(rawMsg);
            throw new Error(Translate.instant('core.login.rf.error_generic', { $a: translated }));
        }
    }

    /**
     * A11y key functionality that prevents keyDown events.
     *
     * @param e Event.
     */
    keyDown(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
        }
    }

    /**
     * Cancel reconnect.
     *
     * @param e Event.
     */
    keyUp(e: KeyboardEvent): void {
        if (e.key === 'Escape') {
            this.cancel(e);
        }
    }

}
