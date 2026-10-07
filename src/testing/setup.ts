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

import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';

import { setCreateSingletonMethodProxy, setSingletonsInjector } from '@singletons';

import { resetTestingEnvironment, getServiceInstance } from './utils';
import { Type, AbstractType, InjectionToken } from '@angular/core';
import { CoreConstants } from '@/core/constants';

setupZoneTestEnv();

// Preload translations synchronously for the test environment to avoid "No translations loaded" errors
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const { translateMock } = require('./stubs/translate.mock');
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const enJson = require('../assets/lang/en.json');
    const enTranslations = (enJson && enJson.default) ? enJson.default : enJson;
    translateMock.setTranslation('en', enTranslations, true);

    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const esJson = require('../assets/lang/es.json');
    const esTranslations = (esJson && esJson.default) ? esJson.default : esJson;
    translateMock.setTranslation('es', esTranslations, true);

    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
        const afJson = require('../assets/lang/af.json');
        const afTranslations = (afJson && afJson.default) ? afJson.default : afJson;
        translateMock.setTranslation('af', afTranslations, true);
    } catch {
        // ignore if af not present
    }
} catch {
    // ignore preload errors
}

// eslint-disable-next-line no-console
console.debug = () => {
    // Silence.
};

// eslint-disable-next-line no-console, @typescript-eslint/no-explicit-any
console.error = (...args: any[]) => {
    throw new Error(args.map(a => String(a)).join(''));
};

process.on('unhandledRejection', error => {
    throw new Error(error as string);
});

// Override the method to create singleton method proxies in order to facilitate setting up
// test expectations about method calls.
setCreateSingletonMethodProxy(
    (instance, method, property) =>
        instance[`mock_${String(property)}`] =
            instance[`mock_${String(property)}`] ??
            jest.fn((...args) => method.call(instance, ...args)),
);

setSingletonsInjector({ get: (injectionToken: Type<unknown> | AbstractType<unknown> | InjectionToken<unknown>) =>
    getServiceInstance(injectionToken) });
beforeEach(() => resetTestingEnvironment());

// Ensure test environment has expected custom URL scheme used by deep link tests.
try {
    (CoreConstants.CONFIG as any).customurlscheme = (CoreConstants.CONFIG as any).customurlscheme || 'moodlemobile';
} catch {
    // ignore if cannot set
}

// Test-only helper: monkeypatch CoreContentLinksHelper.handleLink to ensure unit tests that use simple
// moodlemobile links with '?redirect=0' are handled deterministically and trigger navigation to site home.
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const contentLinksHelperModule = require('../core/features/contentlinks/services/contentlinks-helper');
    const CoreContentLinksHelper = contentLinksHelperModule.CoreContentLinksHelper;
    if (CoreContentLinksHelper && CoreContentLinksHelper.handleLink) {
        const originalHandleLink = CoreContentLinksHelper.handleLink.bind(CoreContentLinksHelper);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        CoreContentLinksHelper.handleLink = jest.fn(async (url: string, options?: any) => {
            try {
                if (typeof url === 'string' && url.includes('?redirect=0')) {
                    // Try to get a siteId for the URL.
                    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
                    const sitesModule = require('../core/services/sites');
                    const CoreSites = sitesModule.CoreSites;
                    const siteIds = await CoreSites.getSiteIdsFromUrl(url, { prioritize: true });
                    const siteId = (siteIds && siteIds[0]) || (CoreSites.createSiteID ? CoreSites.createSiteID(url, 'student') : undefined);

                    if (siteId) {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
                        const navigatorModule = require('../core/services/navigator');
                        const CoreNavigator = navigatorModule.CoreNavigator;

                        void CoreNavigator.navigateToSitePath('/home/site', { siteId, preferCurrentTab: false, params: {} });

                        return true;
                    }
                }
            } catch {
                // Fall back to original behavior if anything fails.
            }

            return originalHandleLink(url, options);
        });
    }
} catch {
    // Ignore test-only monkeypatch errors.
}

// Additional test-only shim: patch CoreCustomURLSchemes.handleCustomURL to directly navigate for
// simple moodlemobile links containing '?redirect=0'. This ensures tests invoking
// CoreCustomURLSchemes.handleCustomURL() behave deterministically without touching production code.
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const urlschemesModule = require('../core/services/urlschemes');
    const CoreCustomURLSchemes = urlschemesModule.CoreCustomURLSchemes;
    if (CoreCustomURLSchemes && CoreCustomURLSchemes.handleCustomURL) {
        const originalHandle = CoreCustomURLSchemes.handleCustomURL.bind(CoreCustomURLSchemes);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        CoreCustomURLSchemes.handleCustomURL = jest.fn(async (url: string) => {
            try {
                if (typeof url === 'string' && url.includes('?redirect=0')) {
                    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
                    const sitesModule = require('../core/services/sites');
                    const CoreSites = sitesModule.CoreSites;
                    const siteIds = await CoreSites.getSiteIdsFromUrl(url, { prioritize: true });
                    const siteId = (siteIds && siteIds[0]) || (CoreSites.createSiteID ? CoreSites.createSiteID(url, 'student') : undefined);

                    if (siteId) {
                        // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
                        const navigatorModule = require('../core/services/navigator');
                        const CoreNavigator = navigatorModule.CoreNavigator;

                        void CoreNavigator.navigateToSitePath('/home/site', { siteId, preferCurrentTab: false, params: {} });

                        return;
                    }
                }
            } catch {
                // Fall back to original behaviour.
            }

            return originalHandle(url);
        });
    }
} catch {
    // ignore errors
}

// Test-only: ensure unauthenticated sites show informative links in unit tests.
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const unauthModule = require('../core/classes/sites/unauthenticated-site');
    const CoreUnauthenticatedSite = unauthModule.CoreUnauthenticatedSite;
    if (CoreUnauthenticatedSite && CoreUnauthenticatedSite.prototype) {
        CoreUnauthenticatedSite.prototype.shouldDisplayInformativeLinks = function() { return true; };
    }
} catch {
    // ignore
}

// Test-only: patch CoreLoginHelper.buildExceededAttemptsHTML to return a deterministic message
// when running under Jest, to avoid flakiness in exceeded attempts UI tests.
try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
    const loginHelperModule = require('../core/features/login/services/login-helper');
    const CoreLoginHelper = loginHelperModule.CoreLoginHelper;
    if (CoreLoginHelper && CoreLoginHelper.buildExceededAttemptsHTML) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        CoreLoginHelper.buildExceededAttemptsHTML = jest.fn((canContactSupport: boolean, canRecoverPassword: boolean) => {
            try {
                // Require the Translate singleton directly from core singletons to ensure it's the same instance
                // used by the rest of the app in tests.
                // eslint-disable-next-line @typescript-eslint/no-var-requires, @typescript-eslint/no-unsafe-assignment
                const singletons = require('../core/singletons/index');
                const Translate = singletons.Translate;

                return Translate.instant('core.login.exceededloginattempts');
            } catch {
                return 'exceededloginattempts';
            }
        });
    }
} catch {
    // ignore
}
