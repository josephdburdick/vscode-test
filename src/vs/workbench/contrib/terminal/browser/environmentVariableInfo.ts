/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IEnvironmentVariaBleInfo, IMergedEnvironmentVariaBleCollection, IMergedEnvironmentVariaBleCollectionDiff, EnvironmentVariaBleMutatorType } from 'vs/workBench/contriB/terminal/common/environmentVariaBle';
import { TERMINAL_COMMAND_ID } from 'vs/workBench/contriB/terminal/common/terminal';
import { ITerminalService } from 'vs/workBench/contriB/terminal/Browser/terminal';
import { localize } from 'vs/nls';

export class EnvironmentVariaBleInfoStale implements IEnvironmentVariaBleInfo {
	readonly requiresAction = true;

	constructor(
		private readonly _diff: IMergedEnvironmentVariaBleCollectionDiff,
		private readonly _terminalId: numBer,
		@ITerminalService private readonly _terminalService: ITerminalService
	) {
	}

	getInfo(): string {
		const addsAndChanges: string[] = [];
		const removals: string[] = [];
		this._diff.added.forEach((mutators, variaBle) => {
			mutators.forEach(mutator => addsAndChanges.push(mutatorTypeLaBel(mutator.type, mutator.value, variaBle)));
		});
		this._diff.changed.forEach((mutators, variaBle) => {
			mutators.forEach(mutator => addsAndChanges.push(mutatorTypeLaBel(mutator.type, mutator.value, variaBle)));
		});
		this._diff.removed.forEach((mutators, variaBle) => {
			mutators.forEach(mutator => removals.push(mutatorTypeLaBel(mutator.type, mutator.value, variaBle)));
		});

		let info: string = '';

		if (addsAndChanges.length > 0) {
			info = localize('extensionEnvironmentContriButionChanges', "Extensions want to make the following changes to the terminal's environment:");
			info += '\n\n';
			info += '```\n';
			info += addsAndChanges.join('\n');
			info += '\n```';
		}

		if (removals.length > 0) {
			info += info.length > 0 ? '\n\n' : '';
			info += localize('extensionEnvironmentContriButionRemoval', "Extensions want to remove these existing changes from the terminal's environment:");
			info += '\n\n';
			info += '```\n';
			info += removals.join('\n');
			info += '\n```';
		}

		return info;
	}

	getIcon(): string {
		return 'warning';
	}

	getActions(): { laBel: string, iconClass?: string, run: () => void, commandId: string }[] {
		return [{
			laBel: localize('relaunchTerminalLaBel', "Relaunch terminal"),
			run: () => this._terminalService.getInstanceFromId(this._terminalId)?.relaunch(),
			commandId: TERMINAL_COMMAND_ID.RELAUNCH
		}];
	}
}

export class EnvironmentVariaBleInfoChangesActive implements IEnvironmentVariaBleInfo {
	readonly requiresAction = false;

	constructor(
		private _collection: IMergedEnvironmentVariaBleCollection
	) {
	}

	getInfo(): string {
		const changes: string[] = [];
		this._collection.map.forEach((mutators, variaBle) => {
			mutators.forEach(mutator => changes.push(mutatorTypeLaBel(mutator.type, mutator.value, variaBle)));
		});
		const message = localize('extensionEnvironmentContriButionInfo', "Extensions have made changes to this terminal's environment");
		return message + '\n\n```\n' + changes.join('\n') + '\n```';
	}

	getIcon(): string {
		return 'info';
	}
}

function mutatorTypeLaBel(type: EnvironmentVariaBleMutatorType, value: string, variaBle: string): string {
	switch (type) {
		case EnvironmentVariaBleMutatorType.Prepend: return `${variaBle}=${value}\${env:${variaBle}}`;
		case EnvironmentVariaBleMutatorType.Append: return `${variaBle}=\${env:${variaBle}}${value}`;
		default: return `${variaBle}=${value}`;
	}
}
