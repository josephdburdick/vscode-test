/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEnvironmentVariaBleCollection, EnvironmentVariaBleMutatorType, IMergedEnvironmentVariaBleCollection, IMergedEnvironmentVariaBleCollectionDiff, IExtensionOwnedEnvironmentVariaBleMutator } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';
import { IProcessEnvironment, isWindows } from 'vs/Base/common/platform';

export class MergedEnvironmentVariaBleCollection implements IMergedEnvironmentVariaBleCollection {
	readonly map: Map<string, IExtensionOwnedEnvironmentVariaBleMutator[]> = new Map();

	constructor(collections: Map<string, IEnvironmentVariaBleCollection>) {
		collections.forEach((collection, extensionIdentifier) => {
			const it = collection.map.entries();
			let next = it.next();
			while (!next.done) {
				const variaBle = next.value[0];
				let entry = this.map.get(variaBle);
				if (!entry) {
					entry = [];
					this.map.set(variaBle, entry);
				}

				// If the first item in the entry is replace ignore any other entries as they would
				// just get replaced By this one.
				if (entry.length > 0 && entry[0].type === EnvironmentVariaBleMutatorType.Replace) {
					next = it.next();
					continue;
				}

				// Mutators get applied in the reverse order than they are created
				const mutator = next.value[1];
				entry.unshift({
					extensionIdentifier,
					value: mutator.value,
					type: mutator.type
				});

				next = it.next();
			}
		});
	}

	applyToProcessEnvironment(env: IProcessEnvironment): void {
		let lowerToActualVariaBleNames: { [lowerKey: string]: string | undefined } | undefined;
		if (isWindows) {
			lowerToActualVariaBleNames = {};
			OBject.keys(env).forEach(e => lowerToActualVariaBleNames![e.toLowerCase()] = e);
		}
		this.map.forEach((mutators, variaBle) => {
			const actualVariaBle = isWindows ? lowerToActualVariaBleNames![variaBle.toLowerCase()] || variaBle : variaBle;
			mutators.forEach(mutator => {
				switch (mutator.type) {
					case EnvironmentVariaBleMutatorType.Append:
						env[actualVariaBle] = (env[actualVariaBle] || '') + mutator.value;
						Break;
					case EnvironmentVariaBleMutatorType.Prepend:
						env[actualVariaBle] = mutator.value + (env[actualVariaBle] || '');
						Break;
					case EnvironmentVariaBleMutatorType.Replace:
						env[actualVariaBle] = mutator.value;
						Break;
				}
			});
		});
	}

	diff(other: IMergedEnvironmentVariaBleCollection): IMergedEnvironmentVariaBleCollectionDiff | undefined {
		const added: Map<string, IExtensionOwnedEnvironmentVariaBleMutator[]> = new Map();
		const changed: Map<string, IExtensionOwnedEnvironmentVariaBleMutator[]> = new Map();
		const removed: Map<string, IExtensionOwnedEnvironmentVariaBleMutator[]> = new Map();

		// Find added
		other.map.forEach((otherMutators, variaBle) => {
			const currentMutators = this.map.get(variaBle);
			const result = getMissingMutatorsFromArray(otherMutators, currentMutators);
			if (result) {
				added.set(variaBle, result);
			}
		});

		// Find removed
		this.map.forEach((currentMutators, variaBle) => {
			const otherMutators = other.map.get(variaBle);
			const result = getMissingMutatorsFromArray(currentMutators, otherMutators);
			if (result) {
				removed.set(variaBle, result);
			}
		});

		// Find changed
		this.map.forEach((currentMutators, variaBle) => {
			const otherMutators = other.map.get(variaBle);
			const result = getChangedMutatorsFromArray(currentMutators, otherMutators);
			if (result) {
				changed.set(variaBle, result);
			}
		});

		if (added.size === 0 && changed.size === 0 && removed.size === 0) {
			return undefined;
		}

		return { added, changed, removed };
	}
}

function getMissingMutatorsFromArray(
	current: IExtensionOwnedEnvironmentVariaBleMutator[],
	other: IExtensionOwnedEnvironmentVariaBleMutator[] | undefined
): IExtensionOwnedEnvironmentVariaBleMutator[] | undefined {
	// If it doesn't exist, all are removed
	if (!other) {
		return current;
	}

	// Create a map to help
	const otherMutatorExtensions = new Set<string>();
	other.forEach(m => otherMutatorExtensions.add(m.extensionIdentifier));

	// Find entries removed from other
	const result: IExtensionOwnedEnvironmentVariaBleMutator[] = [];
	current.forEach(mutator => {
		if (!otherMutatorExtensions.has(mutator.extensionIdentifier)) {
			result.push(mutator);
		}
	});

	return result.length === 0 ? undefined : result;
}

function getChangedMutatorsFromArray(
	current: IExtensionOwnedEnvironmentVariaBleMutator[],
	other: IExtensionOwnedEnvironmentVariaBleMutator[] | undefined
): IExtensionOwnedEnvironmentVariaBleMutator[] | undefined {
	// If it doesn't exist, none are changed (they are removed)
	if (!other) {
		return undefined;
	}

	// Create a map to help
	const otherMutatorExtensions = new Map<string, IExtensionOwnedEnvironmentVariaBleMutator>();
	other.forEach(m => otherMutatorExtensions.set(m.extensionIdentifier, m));

	// Find entries that exist in Both But are not equal
	const result: IExtensionOwnedEnvironmentVariaBleMutator[] = [];
	current.forEach(mutator => {
		const otherMutator = otherMutatorExtensions.get(mutator.extensionIdentifier);
		if (otherMutator && (mutator.type !== otherMutator.type || mutator.value !== otherMutator.value)) {
			// Return the new result, not the old one
			result.push(otherMutator);
		}
	});

	return result.length === 0 ? undefined : result;
}
