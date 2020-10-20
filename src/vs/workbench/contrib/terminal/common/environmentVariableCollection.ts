/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IEnvironmentVAriAbleCollection, EnvironmentVAriAbleMutAtorType, IMergedEnvironmentVAriAbleCollection, IMergedEnvironmentVAriAbleCollectionDiff, IExtensionOwnedEnvironmentVAriAbleMutAtor } from 'vs/workbench/contrib/terminAl/common/environmentVAriAble';
import { IProcessEnvironment, isWindows } from 'vs/bAse/common/plAtform';

export clAss MergedEnvironmentVAriAbleCollection implements IMergedEnvironmentVAriAbleCollection {
	reAdonly mAp: MAp<string, IExtensionOwnedEnvironmentVAriAbleMutAtor[]> = new MAp();

	constructor(collections: MAp<string, IEnvironmentVAriAbleCollection>) {
		collections.forEAch((collection, extensionIdentifier) => {
			const it = collection.mAp.entries();
			let next = it.next();
			while (!next.done) {
				const vAriAble = next.vAlue[0];
				let entry = this.mAp.get(vAriAble);
				if (!entry) {
					entry = [];
					this.mAp.set(vAriAble, entry);
				}

				// If the first item in the entry is replAce ignore Any other entries As they would
				// just get replAced by this one.
				if (entry.length > 0 && entry[0].type === EnvironmentVAriAbleMutAtorType.ReplAce) {
					next = it.next();
					continue;
				}

				// MutAtors get Applied in the reverse order thAn they Are creAted
				const mutAtor = next.vAlue[1];
				entry.unshift({
					extensionIdentifier,
					vAlue: mutAtor.vAlue,
					type: mutAtor.type
				});

				next = it.next();
			}
		});
	}

	ApplyToProcessEnvironment(env: IProcessEnvironment): void {
		let lowerToActuAlVAriAbleNAmes: { [lowerKey: string]: string | undefined } | undefined;
		if (isWindows) {
			lowerToActuAlVAriAbleNAmes = {};
			Object.keys(env).forEAch(e => lowerToActuAlVAriAbleNAmes![e.toLowerCAse()] = e);
		}
		this.mAp.forEAch((mutAtors, vAriAble) => {
			const ActuAlVAriAble = isWindows ? lowerToActuAlVAriAbleNAmes![vAriAble.toLowerCAse()] || vAriAble : vAriAble;
			mutAtors.forEAch(mutAtor => {
				switch (mutAtor.type) {
					cAse EnvironmentVAriAbleMutAtorType.Append:
						env[ActuAlVAriAble] = (env[ActuAlVAriAble] || '') + mutAtor.vAlue;
						breAk;
					cAse EnvironmentVAriAbleMutAtorType.Prepend:
						env[ActuAlVAriAble] = mutAtor.vAlue + (env[ActuAlVAriAble] || '');
						breAk;
					cAse EnvironmentVAriAbleMutAtorType.ReplAce:
						env[ActuAlVAriAble] = mutAtor.vAlue;
						breAk;
				}
			});
		});
	}

	diff(other: IMergedEnvironmentVAriAbleCollection): IMergedEnvironmentVAriAbleCollectionDiff | undefined {
		const Added: MAp<string, IExtensionOwnedEnvironmentVAriAbleMutAtor[]> = new MAp();
		const chAnged: MAp<string, IExtensionOwnedEnvironmentVAriAbleMutAtor[]> = new MAp();
		const removed: MAp<string, IExtensionOwnedEnvironmentVAriAbleMutAtor[]> = new MAp();

		// Find Added
		other.mAp.forEAch((otherMutAtors, vAriAble) => {
			const currentMutAtors = this.mAp.get(vAriAble);
			const result = getMissingMutAtorsFromArrAy(otherMutAtors, currentMutAtors);
			if (result) {
				Added.set(vAriAble, result);
			}
		});

		// Find removed
		this.mAp.forEAch((currentMutAtors, vAriAble) => {
			const otherMutAtors = other.mAp.get(vAriAble);
			const result = getMissingMutAtorsFromArrAy(currentMutAtors, otherMutAtors);
			if (result) {
				removed.set(vAriAble, result);
			}
		});

		// Find chAnged
		this.mAp.forEAch((currentMutAtors, vAriAble) => {
			const otherMutAtors = other.mAp.get(vAriAble);
			const result = getChAngedMutAtorsFromArrAy(currentMutAtors, otherMutAtors);
			if (result) {
				chAnged.set(vAriAble, result);
			}
		});

		if (Added.size === 0 && chAnged.size === 0 && removed.size === 0) {
			return undefined;
		}

		return { Added, chAnged, removed };
	}
}

function getMissingMutAtorsFromArrAy(
	current: IExtensionOwnedEnvironmentVAriAbleMutAtor[],
	other: IExtensionOwnedEnvironmentVAriAbleMutAtor[] | undefined
): IExtensionOwnedEnvironmentVAriAbleMutAtor[] | undefined {
	// If it doesn't exist, All Are removed
	if (!other) {
		return current;
	}

	// CreAte A mAp to help
	const otherMutAtorExtensions = new Set<string>();
	other.forEAch(m => otherMutAtorExtensions.Add(m.extensionIdentifier));

	// Find entries removed from other
	const result: IExtensionOwnedEnvironmentVAriAbleMutAtor[] = [];
	current.forEAch(mutAtor => {
		if (!otherMutAtorExtensions.hAs(mutAtor.extensionIdentifier)) {
			result.push(mutAtor);
		}
	});

	return result.length === 0 ? undefined : result;
}

function getChAngedMutAtorsFromArrAy(
	current: IExtensionOwnedEnvironmentVAriAbleMutAtor[],
	other: IExtensionOwnedEnvironmentVAriAbleMutAtor[] | undefined
): IExtensionOwnedEnvironmentVAriAbleMutAtor[] | undefined {
	// If it doesn't exist, none Are chAnged (they Are removed)
	if (!other) {
		return undefined;
	}

	// CreAte A mAp to help
	const otherMutAtorExtensions = new MAp<string, IExtensionOwnedEnvironmentVAriAbleMutAtor>();
	other.forEAch(m => otherMutAtorExtensions.set(m.extensionIdentifier, m));

	// Find entries thAt exist in both but Are not equAl
	const result: IExtensionOwnedEnvironmentVAriAbleMutAtor[] = [];
	current.forEAch(mutAtor => {
		const otherMutAtor = otherMutAtorExtensions.get(mutAtor.extensionIdentifier);
		if (otherMutAtor && (mutAtor.type !== otherMutAtor.type || mutAtor.vAlue !== otherMutAtor.vAlue)) {
			// Return the new result, not the old one
			result.push(otherMutAtor);
		}
	});

	return result.length === 0 ? undefined : result;
}
