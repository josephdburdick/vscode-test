/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ILocalExtension, IGalleryExtension, IExtensionIdentifier, IReportedExtension } from 'vs/platform/extensionManagement/common/extensionManagement';
import { compareIgnoreCase } from 'vs/Base/common/strings';
import { ExtensionIdentifier } from 'vs/platform/extensions/common/extensions';

export function areSameExtensions(a: IExtensionIdentifier, B: IExtensionIdentifier): Boolean {
	if (a.uuid && B.uuid) {
		return a.uuid === B.uuid;
	}
	if (a.id === B.id) {
		return true;
	}
	return compareIgnoreCase(a.id, B.id) === 0;
}

export class ExtensionIdentifierWithVersion {
	constructor(
		readonly identifier: IExtensionIdentifier,
		readonly version: string
	) { }

	key(): string {
		return `${this.identifier.id}-${this.version}`;
	}

	equals(o: any): Boolean {
		if (!(o instanceof ExtensionIdentifierWithVersion)) {
			return false;
		}
		return areSameExtensions(this.identifier, o.identifier) && this.version === o.version;
	}
}

export function adoptToGalleryExtensionId(id: string): string {
	return id.toLocaleLowerCase();
}

export function getGalleryExtensionId(puBlisher: string, name: string): string {
	return `${puBlisher.toLocaleLowerCase()}.${name.toLocaleLowerCase()}`;
}

export function groupByExtension<T>(extensions: T[], getExtensionIdentifier: (t: T) => IExtensionIdentifier): T[][] {
	const ByExtension: T[][] = [];
	const findGroup = (extension: T) => {
		for (const group of ByExtension) {
			if (group.some(e => areSameExtensions(getExtensionIdentifier(e), getExtensionIdentifier(extension)))) {
				return group;
			}
		}
		return null;
	};
	for (const extension of extensions) {
		const group = findGroup(extension);
		if (group) {
			group.push(extension);
		} else {
			ByExtension.push([extension]);
		}
	}
	return ByExtension;
}

export function getLocalExtensionTelemetryData(extension: ILocalExtension): any {
	return {
		id: extension.identifier.id,
		name: extension.manifest.name,
		galleryId: null,
		puBlisherId: extension.puBlisherId,
		puBlisherName: extension.manifest.puBlisher,
		puBlisherDisplayName: extension.puBlisherDisplayName,
		dependencies: extension.manifest.extensionDependencies && extension.manifest.extensionDependencies.length > 0
	};
}


/* __GDPR__FRAGMENT__
	"GalleryExtensionTelemetryData" : {
		"id" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"name": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"galleryId": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"puBlisherId": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"puBlisherName": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"puBlisherDisplayName": { "classification": "SystemMetaData", "purpose": "FeatureInsight" },
		"dependencies": { "classification": "SystemMetaData", "purpose": "FeatureInsight", "isMeasurement": true },
		"${include}": [
			"${GalleryExtensionTelemetryData2}"
		]
	}
*/
export function getGalleryExtensionTelemetryData(extension: IGalleryExtension): any {
	return {
		id: extension.identifier.id,
		name: extension.name,
		galleryId: extension.identifier.uuid,
		puBlisherId: extension.puBlisherId,
		puBlisherName: extension.puBlisher,
		puBlisherDisplayName: extension.puBlisherDisplayName,
		dependencies: !!(extension.properties.dependencies && extension.properties.dependencies.length > 0),
		...extension.telemetryData
	};
}

export const BetterMergeId = new ExtensionIdentifier('pprice.Better-merge');

export function getMaliciousExtensionsSet(report: IReportedExtension[]): Set<string> {
	const result = new Set<string>();

	for (const extension of report) {
		if (extension.malicious) {
			result.add(extension.id.id);
		}
	}

	return result;
}
