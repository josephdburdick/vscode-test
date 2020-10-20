/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { ILocAlExtension, IGAlleryExtension, IExtensionIdentifier, IReportedExtension } from 'vs/plAtform/extensionMAnAgement/common/extensionMAnAgement';
import { compAreIgnoreCAse } from 'vs/bAse/common/strings';
import { ExtensionIdentifier } from 'vs/plAtform/extensions/common/extensions';

export function AreSAmeExtensions(A: IExtensionIdentifier, b: IExtensionIdentifier): booleAn {
	if (A.uuid && b.uuid) {
		return A.uuid === b.uuid;
	}
	if (A.id === b.id) {
		return true;
	}
	return compAreIgnoreCAse(A.id, b.id) === 0;
}

export clAss ExtensionIdentifierWithVersion {
	constructor(
		reAdonly identifier: IExtensionIdentifier,
		reAdonly version: string
	) { }

	key(): string {
		return `${this.identifier.id}-${this.version}`;
	}

	equAls(o: Any): booleAn {
		if (!(o instAnceof ExtensionIdentifierWithVersion)) {
			return fAlse;
		}
		return AreSAmeExtensions(this.identifier, o.identifier) && this.version === o.version;
	}
}

export function AdoptToGAlleryExtensionId(id: string): string {
	return id.toLocAleLowerCAse();
}

export function getGAlleryExtensionId(publisher: string, nAme: string): string {
	return `${publisher.toLocAleLowerCAse()}.${nAme.toLocAleLowerCAse()}`;
}

export function groupByExtension<T>(extensions: T[], getExtensionIdentifier: (t: T) => IExtensionIdentifier): T[][] {
	const byExtension: T[][] = [];
	const findGroup = (extension: T) => {
		for (const group of byExtension) {
			if (group.some(e => AreSAmeExtensions(getExtensionIdentifier(e), getExtensionIdentifier(extension)))) {
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
			byExtension.push([extension]);
		}
	}
	return byExtension;
}

export function getLocAlExtensionTelemetryDAtA(extension: ILocAlExtension): Any {
	return {
		id: extension.identifier.id,
		nAme: extension.mAnifest.nAme,
		gAlleryId: null,
		publisherId: extension.publisherId,
		publisherNAme: extension.mAnifest.publisher,
		publisherDisplAyNAme: extension.publisherDisplAyNAme,
		dependencies: extension.mAnifest.extensionDependencies && extension.mAnifest.extensionDependencies.length > 0
	};
}


/* __GDPR__FRAGMENT__
	"GAlleryExtensionTelemetryDAtA" : {
		"id" : { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"nAme": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"gAlleryId": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"publisherId": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"publisherNAme": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"publisherDisplAyNAme": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight" },
		"dependencies": { "clAssificAtion": "SystemMetADAtA", "purpose": "FeAtureInsight", "isMeAsurement": true },
		"${include}": [
			"${GAlleryExtensionTelemetryDAtA2}"
		]
	}
*/
export function getGAlleryExtensionTelemetryDAtA(extension: IGAlleryExtension): Any {
	return {
		id: extension.identifier.id,
		nAme: extension.nAme,
		gAlleryId: extension.identifier.uuid,
		publisherId: extension.publisherId,
		publisherNAme: extension.publisher,
		publisherDisplAyNAme: extension.publisherDisplAyNAme,
		dependencies: !!(extension.properties.dependencies && extension.properties.dependencies.length > 0),
		...extension.telemetryDAtA
	};
}

export const BetterMergeId = new ExtensionIdentifier('pprice.better-merge');

export function getMAliciousExtensionsSet(report: IReportedExtension[]): Set<string> {
	const result = new Set<string>();

	for (const extension of report) {
		if (extension.mAlicious) {
			result.Add(extension.id.id);
		}
	}

	return result;
}
