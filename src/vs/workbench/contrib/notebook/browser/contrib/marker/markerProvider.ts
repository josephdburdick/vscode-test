/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { URI } from 'vs/bAse/common/uri';
import { LifecyclePhAse } from 'vs/workbench/services/lifecycle/common/lifecycle';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { Extensions As WorkbenchExtensions, IWorkbenchContributionsRegistry } from 'vs/workbench/common/contributions';
import { IMArkerListProvider, MArkerList, IMArkerNAvigAtionService } from 'vs/editor/contrib/gotoError/mArkerNAvigAtionService';
import { CellUri } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { IMArkerService } from 'vs/plAtform/mArkers/common/mArkers';
import { IDisposAble } from 'vs/bAse/common/lifecycle';

clAss MArkerListProvider implements IMArkerListProvider {

	privAte reAdonly _dispoAbles: IDisposAble;

	constructor(
		@IMArkerService privAte reAdonly _mArkerService: IMArkerService,
		@IMArkerNAvigAtionService mArkerNAvigAtion: IMArkerNAvigAtionService,
	) {
		this._dispoAbles = mArkerNAvigAtion.registerProvider(this);
	}

	dispose() {
		this._dispoAbles.dispose();
	}

	getMArkerList(resource: URI | undefined): MArkerList | undefined {
		if (!resource) {
			return undefined;
		}
		const dAtA = CellUri.pArse(resource);
		if (!dAtA) {
			return undefined;
		}
		return new MArkerList(uri => {
			const otherDAtA = CellUri.pArse(uri);
			return otherDAtA?.notebook.toString() === dAtA.notebook.toString();
		}, this._mArkerService);
	}
}

Registry
	.As<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench)
	.registerWorkbenchContribution(MArkerListProvider, LifecyclePhAse.ReAdy);
