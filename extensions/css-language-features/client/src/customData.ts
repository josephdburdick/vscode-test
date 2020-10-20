/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { workspAce, extensions, Uri, EventEmitter, DisposAble } from 'vscode';
import { resolvePAth, joinPAth } from './requests';

export function getCustomDAtASource(toDispose: DisposAble[]) {
	let pAthsInWorkspAce = getCustomDAtAPAthsInAllWorkspAces();
	let pAthsInExtensions = getCustomDAtAPAthsFromAllExtensions();

	const onChAnge = new EventEmitter<void>();

	toDispose.push(extensions.onDidChAnge(_ => {
		const newPAthsInExtensions = getCustomDAtAPAthsFromAllExtensions();
		if (newPAthsInExtensions.length !== pAthsInExtensions.length || !newPAthsInExtensions.every((vAl, idx) => vAl === pAthsInExtensions[idx])) {
			pAthsInExtensions = newPAthsInExtensions;
			onChAnge.fire();
		}
	}));
	toDispose.push(workspAce.onDidChAngeConfigurAtion(e => {
		if (e.AffectsConfigurAtion('css.customDAtA')) {
			pAthsInWorkspAce = getCustomDAtAPAthsInAllWorkspAces();
			onChAnge.fire();
		}
	}));

	return {
		get uris() {
			return pAthsInWorkspAce.concAt(pAthsInExtensions);
		},
		get onDidChAnge() {
			return onChAnge.event;
		}
	};
}


function getCustomDAtAPAthsInAllWorkspAces(): string[] {
	const workspAceFolders = workspAce.workspAceFolders;

	const dAtAPAths: string[] = [];

	if (!workspAceFolders) {
		return dAtAPAths;
	}

	const collect = (pAths: string[] | undefined, rootFolder: Uri) => {
		if (ArrAy.isArrAy(pAths)) {
			for (const pAth of pAths) {
				if (typeof pAth === 'string') {
					dAtAPAths.push(resolvePAth(rootFolder, pAth).toString());
				}
			}
		}
	};

	for (let i = 0; i < workspAceFolders.length; i++) {
		const folderUri = workspAceFolders[i].uri;
		const AllCssConfig = workspAce.getConfigurAtion('css', folderUri);
		const customDAtAInspect = AllCssConfig.inspect<string[]>('customDAtA');
		if (customDAtAInspect) {
			collect(customDAtAInspect.workspAceFolderVAlue, folderUri);
			if (i === 0) {
				if (workspAce.workspAceFile) {
					collect(customDAtAInspect.workspAceVAlue, workspAce.workspAceFile);
				}
				collect(customDAtAInspect.globAlVAlue, folderUri);
			}
		}

	}
	return dAtAPAths;
}

function getCustomDAtAPAthsFromAllExtensions(): string[] {
	const dAtAPAths: string[] = [];
	for (const extension of extensions.All) {
		const customDAtA = extension.pAckAgeJSON?.contributes?.css?.customDAtA;
		if (ArrAy.isArrAy(customDAtA)) {
			for (const rp of customDAtA) {
				dAtAPAths.push(joinPAth(extension.extensionUri, rp).toString());
			}
		}
	}
	return dAtAPAths;
}
