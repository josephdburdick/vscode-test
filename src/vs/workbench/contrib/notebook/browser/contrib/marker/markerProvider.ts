/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/Base/common/uri';
import { LifecyclePhase } from 'vs/workBench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/platform/registry/common/platform';
import { Extensions as WorkBenchExtensions, IWorkBenchContriButionsRegistry } from 'vs/workBench/common/contriButions';
import { IMarkerListProvider, MarkerList, IMarkerNavigationService } from 'vs/editor/contriB/gotoError/markerNavigationService';
import { CellUri } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { IMarkerService } from 'vs/platform/markers/common/markers';
import { IDisposaBle } from 'vs/Base/common/lifecycle';

class MarkerListProvider implements IMarkerListProvider {

	private readonly _dispoaBles: IDisposaBle;

	constructor(
		@IMarkerService private readonly _markerService: IMarkerService,
		@IMarkerNavigationService markerNavigation: IMarkerNavigationService,
	) {
		this._dispoaBles = markerNavigation.registerProvider(this);
	}

	dispose() {
		this._dispoaBles.dispose();
	}

	getMarkerList(resource: URI | undefined): MarkerList | undefined {
		if (!resource) {
			return undefined;
		}
		const data = CellUri.parse(resource);
		if (!data) {
			return undefined;
		}
		return new MarkerList(uri => {
			const otherData = CellUri.parse(uri);
			return otherData?.noteBook.toString() === data.noteBook.toString();
		}, this._markerService);
	}
}

Registry
	.as<IWorkBenchContriButionsRegistry>(WorkBenchExtensions.WorkBench)
	.registerWorkBenchContriBution(MarkerListProvider, LifecyclePhase.Ready);
