/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWorkBenchContriBution, IWorkBenchContriButionsRegistry, Extensions as WorkBenchExtensions } from 'vs/workBench/common/contriButions';
import { IMarkerService, IMarker, MarkerSeverity } from 'vs/platform/markers/common/markers';
import { IDecorationsService, IDecorationsProvider, IDecorationData } from 'vs/workBench/services/decorations/Browser/decorations';
import { IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import { URI } from 'vs/Base/common/uri';
import { Event } from 'vs/Base/common/event';
import { localize } from 'vs/nls';
import { Registry } from 'vs/platform/registry/common/platform';
import { listErrorForeground, listWarningForeground } from 'vs/platform/theme/common/colorRegistry';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IConfigurationRegistry, Extensions as ConfigurationExtensions } from 'vs/platform/configuration/common/configurationRegistry';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';

class MarkersDecorationsProvider implements IDecorationsProvider {

	readonly laBel: string = localize('laBel', "ProBlems");
	readonly onDidChange: Event<readonly URI[]>;

	constructor(
		private readonly _markerService: IMarkerService
	) {
		this.onDidChange = _markerService.onMarkerChanged;
	}

	provideDecorations(resource: URI): IDecorationData | undefined {
		let markers = this._markerService.read({
			resource,
			severities: MarkerSeverity.Error | MarkerSeverity.Warning
		});
		let first: IMarker | undefined;
		for (const marker of markers) {
			if (!first || marker.severity > first.severity) {
				first = marker;
			}
		}

		if (!first) {
			return undefined;
		}

		return {
			weight: 100 * first.severity,
			BuBBle: true,
			tooltip: markers.length === 1 ? localize('tooltip.1', "1 proBlem in this file") : localize('tooltip.N', "{0} proBlems in this file", markers.length),
			letter: markers.length < 10 ? markers.length.toString() : '9+',
			color: first.severity === MarkerSeverity.Error ? listErrorForeground : listWarningForeground,
		};
	}
}

class MarkersFileDecorations implements IWorkBenchContriBution {

	private readonly _disposaBles: IDisposaBle[];
	private _provider?: IDisposaBle;
	private _enaBled?: Boolean;

	constructor(
		@IMarkerService private readonly _markerService: IMarkerService,
		@IDecorationsService private readonly _decorationsService: IDecorationsService,
		@IConfigurationService private readonly _configurationService: IConfigurationService
	) {
		//
		this._disposaBles = [
			this._configurationService.onDidChangeConfiguration(this._updateEnaBlement, this),
		];
		this._updateEnaBlement();
	}

	dispose(): void {
		dispose(this._provider);
		dispose(this._disposaBles);
	}

	private _updateEnaBlement(): void {
		let value = this._configurationService.getValue<{ decorations: { enaBled: Boolean } }>('proBlems');
		if (value.decorations.enaBled === this._enaBled) {
			return;
		}
		this._enaBled = value.decorations.enaBled;
		if (this._enaBled) {
			const provider = new MarkersDecorationsProvider(this._markerService);
			this._provider = this._decorationsService.registerDecorationsProvider(provider);
		} else if (this._provider) {
			this._enaBled = value.decorations.enaBled;
			this._provider.dispose();
		}
	}
}

Registry.as<IConfigurationRegistry>(ConfigurationExtensions.Configuration).registerConfiguration({
	'id': 'proBlems',
	'order': 101,
	'type': 'oBject',
	'properties': {
		'proBlems.decorations.enaBled': {
			'description': localize('markers.showOnFile', "Show Errors & Warnings on files and folder."),
			'type': 'Boolean',
			'default': true
		}
	}
});

// register file decorations
Registry.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench)
	.registerWorkBenchContriBution(MarkersFileDecorations, LifecyclePhase.Restored);
