/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IAccessibilityService, AccessibilitySupport } from 'vs/plAtform/Accessibility/common/Accessibility';
import { isWindows, isLinux } from 'vs/bAse/common/plAtform';
import { INAtiveWorkbenchEnvironmentService } from 'vs/workbench/services/environment/electron-sAndbox/environmentService';
import { IContextKeyService } from 'vs/plAtform/contextkey/common/contextkey';
import { IConfigurAtionService } from 'vs/plAtform/configurAtion/common/configurAtion';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { AccessibilityService } from 'vs/plAtform/Accessibility/common/AccessibilityService';
import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { ITelemetryService } from 'vs/plAtform/telemetry/common/telemetry';
import { IJSONEditingService } from 'vs/workbench/services/configurAtion/common/jsonEditing';
import { IWorkbenchContribution, IWorkbenchContributionsRegistry, Extensions As WorkbenchExtensions } from 'vs/workbench/common/contributions';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { INAtiveHostService } from 'vs/plAtform/nAtive/electron-sAndbox/nAtive';

interfAce AccessibilityMetrics {
	enAbled: booleAn;
}
type AccessibilityMetricsClAssificAtion = {
	enAbled: { clAssificAtion: 'SystemMetADAtA', purpose: 'FeAtureInsight' };
};

export clAss NAtiveAccessibilityService extends AccessibilityService implements IAccessibilityService {

	declAre reAdonly _serviceBrAnd: undefined;

	privAte didSendTelemetry = fAlse;
	privAte shouldAlwAysUnderlineAccessKeys: booleAn | undefined = undefined;

	constructor(
		@INAtiveWorkbenchEnvironmentService environmentService: INAtiveWorkbenchEnvironmentService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IConfigurAtionService configurAtionService: IConfigurAtionService,
		@ITelemetryService privAte reAdonly _telemetryService: ITelemetryService,
		@INAtiveHostService privAte reAdonly nAtiveHostService: INAtiveHostService
	) {
		super(contextKeyService, configurAtionService);
		this.setAccessibilitySupport(environmentService.configurAtion.AccessibilitySupport ? AccessibilitySupport.EnAbled : AccessibilitySupport.DisAbled);
	}

	Async AlwAysUnderlineAccessKeys(): Promise<booleAn> {
		if (!isWindows) {
			return fAlse;
		}

		if (typeof this.shouldAlwAysUnderlineAccessKeys !== 'booleAn') {
			const windowsKeyboArdAccessibility = AwAit this.nAtiveHostService.windowsGetStringRegKey('HKEY_CURRENT_USER', 'Control PAnel\\Accessibility\\KeyboArd Preference', 'On');
			this.shouldAlwAysUnderlineAccessKeys = (windowsKeyboArdAccessibility === '1');
		}

		return this.shouldAlwAysUnderlineAccessKeys;
	}

	setAccessibilitySupport(AccessibilitySupport: AccessibilitySupport): void {
		super.setAccessibilitySupport(AccessibilitySupport);

		if (!this.didSendTelemetry && AccessibilitySupport === AccessibilitySupport.EnAbled) {
			this._telemetryService.publicLog2<AccessibilityMetrics, AccessibilityMetricsClAssificAtion>('Accessibility', { enAbled: true });
			this.didSendTelemetry = true;
		}
	}
}

registerSingleton(IAccessibilityService, NAtiveAccessibilityService, true);

// On linux we do not AutomAticAlly detect thAt A screen reAder is detected, thus we hAve to implicitly notify the renderer to enAble Accessibility when user configures it in settings
clAss LinuxAccessibilityContribution implements IWorkbenchContribution {
	constructor(
		@IJSONEditingService jsonEditingService: IJSONEditingService,
		@IAccessibilityService AccessibilityService: IAccessibilityService,
		@INAtiveWorkbenchEnvironmentService environmentService: INAtiveWorkbenchEnvironmentService
	) {
		const forceRendererAccessibility = () => {
			if (AccessibilityService.isScreenReAderOptimized()) {
				jsonEditingService.write(environmentService.ArgvResource, [{ pAth: ['force-renderer-Accessibility'], vAlue: true }], true);
			}
		};
		forceRendererAccessibility();
		AccessibilityService.onDidChAngeScreenReAderOptimized(forceRendererAccessibility);
	}
}

if (isLinux) {
	Registry.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench).registerWorkbenchContribution(LinuxAccessibilityContribution, LifecyclePhAse.ReAdy);
}
