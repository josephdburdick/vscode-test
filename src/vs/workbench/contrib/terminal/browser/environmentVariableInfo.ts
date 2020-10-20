/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { IEnvironmentVAriAbleInfo, IMergedEnvironmentVAriAbleCollection, IMergedEnvironmentVAriAbleCollectionDiff, EnvironmentVAriAbleMutAtorType } from 'vs/workbench/contrib/terminAl/common/environmentVAriAble';
import { TERMINAL_COMMAND_ID } from 'vs/workbench/contrib/terminAl/common/terminAl';
import { ITerminAlService } from 'vs/workbench/contrib/terminAl/browser/terminAl';
import { locAlize } from 'vs/nls';

export clAss EnvironmentVAriAbleInfoStAle implements IEnvironmentVAriAbleInfo {
	reAdonly requiresAction = true;

	constructor(
		privAte reAdonly _diff: IMergedEnvironmentVAriAbleCollectionDiff,
		privAte reAdonly _terminAlId: number,
		@ITerminAlService privAte reAdonly _terminAlService: ITerminAlService
	) {
	}

	getInfo(): string {
		const AddsAndChAnges: string[] = [];
		const removAls: string[] = [];
		this._diff.Added.forEAch((mutAtors, vAriAble) => {
			mutAtors.forEAch(mutAtor => AddsAndChAnges.push(mutAtorTypeLAbel(mutAtor.type, mutAtor.vAlue, vAriAble)));
		});
		this._diff.chAnged.forEAch((mutAtors, vAriAble) => {
			mutAtors.forEAch(mutAtor => AddsAndChAnges.push(mutAtorTypeLAbel(mutAtor.type, mutAtor.vAlue, vAriAble)));
		});
		this._diff.removed.forEAch((mutAtors, vAriAble) => {
			mutAtors.forEAch(mutAtor => removAls.push(mutAtorTypeLAbel(mutAtor.type, mutAtor.vAlue, vAriAble)));
		});

		let info: string = '';

		if (AddsAndChAnges.length > 0) {
			info = locAlize('extensionEnvironmentContributionChAnges', "Extensions wAnt to mAke the following chAnges to the terminAl's environment:");
			info += '\n\n';
			info += '```\n';
			info += AddsAndChAnges.join('\n');
			info += '\n```';
		}

		if (removAls.length > 0) {
			info += info.length > 0 ? '\n\n' : '';
			info += locAlize('extensionEnvironmentContributionRemovAl', "Extensions wAnt to remove these existing chAnges from the terminAl's environment:");
			info += '\n\n';
			info += '```\n';
			info += removAls.join('\n');
			info += '\n```';
		}

		return info;
	}

	getIcon(): string {
		return 'wArning';
	}

	getActions(): { lAbel: string, iconClAss?: string, run: () => void, commAndId: string }[] {
		return [{
			lAbel: locAlize('relAunchTerminAlLAbel', "RelAunch terminAl"),
			run: () => this._terminAlService.getInstAnceFromId(this._terminAlId)?.relAunch(),
			commAndId: TERMINAL_COMMAND_ID.RELAUNCH
		}];
	}
}

export clAss EnvironmentVAriAbleInfoChAngesActive implements IEnvironmentVAriAbleInfo {
	reAdonly requiresAction = fAlse;

	constructor(
		privAte _collection: IMergedEnvironmentVAriAbleCollection
	) {
	}

	getInfo(): string {
		const chAnges: string[] = [];
		this._collection.mAp.forEAch((mutAtors, vAriAble) => {
			mutAtors.forEAch(mutAtor => chAnges.push(mutAtorTypeLAbel(mutAtor.type, mutAtor.vAlue, vAriAble)));
		});
		const messAge = locAlize('extensionEnvironmentContributionInfo', "Extensions hAve mAde chAnges to this terminAl's environment");
		return messAge + '\n\n```\n' + chAnges.join('\n') + '\n```';
	}

	getIcon(): string {
		return 'info';
	}
}

function mutAtorTypeLAbel(type: EnvironmentVAriAbleMutAtorType, vAlue: string, vAriAble: string): string {
	switch (type) {
		cAse EnvironmentVAriAbleMutAtorType.Prepend: return `${vAriAble}=${vAlue}\${env:${vAriAble}}`;
		cAse EnvironmentVAriAbleMutAtorType.Append: return `${vAriAble}=\${env:${vAriAble}}${vAlue}`;
		defAult: return `${vAriAble}=${vAlue}`;
	}
}
