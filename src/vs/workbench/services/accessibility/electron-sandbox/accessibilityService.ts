/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAccessiBilityService, AccessiBilitySupport } from 'vs/platform/accessiBility/common/accessiBility';
import { isWindows, isLinux } from 'vs/Base/common/platform';
import { INativeWorkBenchEnvironmentService } from 'vs/workBench/services/environment/electron-sandBox/environmentService';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { Registry } from 'vs/platform/registry/common/platform';
import { AccessiBilityService } from 'vs/platform/accessiBility/common/accessiBilityService';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { ITelemetryService } from 'vs/platform/telemetry/common/telemetry';
import { IJSONEditingService } from 'vs/workBench/services/configuration/common/jsonEditing';
import { IWorkBenchContriBution, IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { INativeHostService } from 'vs/platform/native/electron-sandBox/native';

interface AccessiBilityMetrics {
	enaBled: Boolean;
}
type AccessiBilityMetricsClassification = {
	enaBled: { classification: 'SystemMetaData', purpose: 'FeatureInsight' };
};

export class NativeAccessiBilityService extends AccessiBilityService implements IAccessiBilityService {

	declare readonly _serviceBrand: undefined;

	private didSendTelemetry = false;
	private shouldAlwaysUnderlineAccessKeys: Boolean | undefined = undefined;

	constructor(
		@INativeWorkBenchEnvironmentService environmentService: INativeWorkBenchEnvironmentService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IConfigurationService configurationService: IConfigurationService,
		@ITelemetryService private readonly _telemetryService: ITelemetryService,
		@INativeHostService private readonly nativeHostService: INativeHostService
	) {
		super(contextKeyService, configurationService);
		this.setAccessiBilitySupport(environmentService.configuration.accessiBilitySupport ? AccessiBilitySupport.EnaBled : AccessiBilitySupport.DisaBled);
	}

	async alwaysUnderlineAccessKeys(): Promise<Boolean> {
		if (!isWindows) {
			return false;
		}

		if (typeof this.shouldAlwaysUnderlineAccessKeys !== 'Boolean') {
			const windowsKeyBoardAccessiBility = await this.nativeHostService.windowsGetStringRegKey('HKEY_CURRENT_USER', 'Control Panel\\AccessiBility\\KeyBoard Preference', 'On');
			this.shouldAlwaysUnderlineAccessKeys = (windowsKeyBoardAccessiBility === '1');
		}

		return this.shouldAlwaysUnderlineAccessKeys;
	}

	setAccessiBilitySupport(accessiBilitySupport: AccessiBilitySupport): void {
		super.setAccessiBilitySupport(accessiBilitySupport);

		if (!this.didSendTelemetry && accessiBilitySupport === AccessiBilitySupport.EnaBled) {
			this._telemetryService.puBlicLog2<AccessiBilityMetrics, AccessiBilityMetricsClassification>('accessiBility', { enaBled: true });
			this.didSendTelemetry = true;
		}
	}
}

registerSingleton(IAccessiBilityService, NativeAccessiBilityService, true);

// On linux we do not automatically detect that a screen reader is detected, thus we have to implicitly notify the renderer to enaBle accessiBility when user configures it in settings
class LinuxAccessiBilityContriBution implements IWorkBenchContriBution {
	constructor(
		@IJSONEditingService jsonEditingService: IJSONEditingService,
		@IAccessiBilityService accessiBilityService: IAccessiBilityService,
		@INativeWorkBenchEnvironmentService environmentService: INativeWorkBenchEnvironmentService
	) {
		const forceRendererAccessiBility = () => {
			if (accessiBilityService.isScreenReaderOptimized()) {
				jsonEditingService.write(environmentService.argvResource, [{ path: ['force-renderer-accessiBility'], value: true }], true);
			}
		};
		forceRendererAccessiBility();
		accessiBilityService.onDidChangeScreenReaderOptimized(forceRendererAccessiBility);
	}
}

if (isLinux) {
	Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench).registerWorkBenchContriBution(LinuxAccessiBilityContriBution, LifecyclePhase.Ready);
}
