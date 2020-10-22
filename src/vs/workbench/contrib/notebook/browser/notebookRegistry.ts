/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CellOutputKind } from 'vs/workBench/contriB/noteBook/common/noteBookCommon';
import { BrandedService, IConstructorSignature1 } from 'vs/platform/instantiation/common/instantiation';
import { INoteBookEditor, IOutputTransformContriBution } from 'vs/workBench/contriB/noteBook/Browser/noteBookBrowser';

export type IOutputTransformCtor = IConstructorSignature1<INoteBookEditor, IOutputTransformContriBution>;

export interface IOutputTransformDescription {
	id: string;
	kind: CellOutputKind;
	ctor: IOutputTransformCtor;
}


export const NoteBookRegistry = new class NoteBookRegistryImpl {

	readonly outputTransforms: IOutputTransformDescription[] = [];

	registerOutputTransform<Services extends BrandedService[]>(id: string, kind: CellOutputKind, ctor: { new(editor: INoteBookEditor, ...services: Services): IOutputTransformContriBution }): void {
		this.outputTransforms.push({ id: id, kind: kind, ctor: ctor as IOutputTransformCtor });
	}

	getOutputTransformContriButions(): IOutputTransformDescription[] {
		return this.outputTransforms.slice(0);
	}
};
