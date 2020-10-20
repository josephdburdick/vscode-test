/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { CellOutputKind } from 'vs/workbench/contrib/notebook/common/notebookCommon';
import { BrAndedService, IConstructorSignAture1 } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { INotebookEditor, IOutputTrAnsformContribution } from 'vs/workbench/contrib/notebook/browser/notebookBrowser';

export type IOutputTrAnsformCtor = IConstructorSignAture1<INotebookEditor, IOutputTrAnsformContribution>;

export interfAce IOutputTrAnsformDescription {
	id: string;
	kind: CellOutputKind;
	ctor: IOutputTrAnsformCtor;
}


export const NotebookRegistry = new clAss NotebookRegistryImpl {

	reAdonly outputTrAnsforms: IOutputTrAnsformDescription[] = [];

	registerOutputTrAnsform<Services extends BrAndedService[]>(id: string, kind: CellOutputKind, ctor: { new(editor: INotebookEditor, ...services: Services): IOutputTrAnsformContribution }): void {
		this.outputTrAnsforms.push({ id: id, kind: kind, ctor: ctor As IOutputTrAnsformCtor });
	}

	getOutputTrAnsformContributions(): IOutputTrAnsformDescription[] {
		return this.outputTrAnsforms.slice(0);
	}
};
