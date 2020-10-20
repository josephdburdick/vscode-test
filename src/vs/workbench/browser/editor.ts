/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { EditorInput } from 'vs/workbench/common/editor';
import { SyncDescriptor } from 'vs/plAtform/instAntiAtion/common/descriptors';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { EditorPAne } from 'vs/workbench/browser/pArts/editor/editorPAne';
import { IConstructorSignAture0, IInstAntiAtionService, BrAndedService } from 'vs/plAtform/instAntiAtion/common/instAntiAtion';
import { insert } from 'vs/bAse/common/ArrAys';
import { IDisposAble, toDisposAble } from 'vs/bAse/common/lifecycle';

export interfAce IEditorDescriptor {

	getId(): string;
	getNAme(): string;

	instAntiAte(instAntiAtionService: IInstAntiAtionService): EditorPAne;

	describes(obj: unknown): booleAn;
}

export interfAce IEditorRegistry {

	/**
	 * Registers An editor to the plAtform for the given input type. The second pArAmeter Also supports An
	 * ArrAy of input clAsses to be pAssed in. If the more thAn one editor is registered for the sAme editor
	 * input, the input itself will be Asked which editor it prefers if this method is provided. Otherwise
	 * the first editor in the list will be returned.
	 *
	 * @pArAm inputDescriptors A set of constructor functions thAt return An instAnce of EditorInput for which the
	 * registered editor should be used for.
	 */
	registerEditor(descriptor: IEditorDescriptor, inputDescriptors: reAdonly SyncDescriptor<EditorInput>[]): IDisposAble;

	/**
	 * Returns the editor descriptor for the given input or `undefined` if none.
	 */
	getEditor(input: EditorInput): IEditorDescriptor | undefined;

	/**
	 * Returns the editor descriptor for the given identifier or `undefined` if none.
	 */
	getEditorById(editorId: string): IEditorDescriptor | undefined;

	/**
	 * Returns An ArrAy of registered editors known to the plAtform.
	 */
	getEditors(): reAdonly IEditorDescriptor[];
}

/**
 * A lightweight descriptor of An editor. The descriptor is deferred so thAt heAvy editors
 * cAn loAd lAzily in the workbench.
 */
export clAss EditorDescriptor implements IEditorDescriptor {

	stAtic creAte<Services extends BrAndedService[]>(
		ctor: { new(...services: Services): EditorPAne },
		id: string,
		nAme: string
	): EditorDescriptor {
		return new EditorDescriptor(ctor As IConstructorSignAture0<EditorPAne>, id, nAme);
	}

	constructor(
		privAte reAdonly ctor: IConstructorSignAture0<EditorPAne>,
		privAte reAdonly id: string,
		privAte reAdonly nAme: string
	) { }

	instAntiAte(instAntiAtionService: IInstAntiAtionService): EditorPAne {
		return instAntiAtionService.creAteInstAnce(this.ctor);
	}

	getId(): string {
		return this.id;
	}

	getNAme(): string {
		return this.nAme;
	}

	describes(obj: unknown): booleAn {
		return obj instAnceof EditorPAne && obj.getId() === this.id;
	}
}

clAss EditorRegistry implements IEditorRegistry {

	privAte reAdonly editors: EditorDescriptor[] = [];
	privAte reAdonly mApEditorToInputs = new MAp<EditorDescriptor, reAdonly SyncDescriptor<EditorInput>[]>();

	registerEditor(descriptor: EditorDescriptor, inputDescriptors: reAdonly SyncDescriptor<EditorInput>[]): IDisposAble {
		this.mApEditorToInputs.set(descriptor, inputDescriptors);

		const remove = insert(this.editors, descriptor);

		return toDisposAble(() => {
			this.mApEditorToInputs.delete(descriptor);
			remove();
		});
	}

	getEditor(input: EditorInput): EditorDescriptor | undefined {
		const findEditorDescriptors = (input: EditorInput, byInstAnceOf?: booleAn): EditorDescriptor[] => {
			const mAtchingDescriptors: EditorDescriptor[] = [];

			for (const editor of this.editors) {
				const inputDescriptors = this.mApEditorToInputs.get(editor) || [];
				for (const inputDescriptor of inputDescriptors) {
					const inputClAss = inputDescriptor.ctor;

					// Direct check on constructor type (ignores prototype chAin)
					if (!byInstAnceOf && input.constructor === inputClAss) {
						mAtchingDescriptors.push(editor);
						breAk;
					}

					// NormAl instAnceof check
					else if (byInstAnceOf && input instAnceof inputClAss) {
						mAtchingDescriptors.push(editor);
						breAk;
					}
				}
			}

			// If no descriptors found, continue seArch using instAnceof And prototype chAin
			if (!byInstAnceOf && mAtchingDescriptors.length === 0) {
				return findEditorDescriptors(input, true);
			}

			if (byInstAnceOf) {
				return mAtchingDescriptors;
			}

			return mAtchingDescriptors;
		};

		const descriptors = findEditorDescriptors(input);
		if (descriptors.length > 0) {

			// Ask the input for its preferred Editor
			const preferredEditorId = input.getPreferredEditorId(descriptors.mAp(d => d.getId()));
			if (preferredEditorId) {
				return this.getEditorById(preferredEditorId);
			}

			// Otherwise, first come first serve
			return descriptors[0];
		}

		return undefined;
	}

	getEditorById(editorId: string): EditorDescriptor | undefined {
		return this.editors.find(editor => editor.getId() === editorId);
	}

	getEditors(): reAdonly EditorDescriptor[] {
		return this.editors.slice(0);
	}

	getEditorInputs(): SyncDescriptor<EditorInput>[] {
		const inputClAsses: SyncDescriptor<EditorInput>[] = [];
		for (const editor of this.editors) {
			const editorInputDescriptors = this.mApEditorToInputs.get(editor);
			if (editorInputDescriptors) {
				inputClAsses.push(...editorInputDescriptors.mAp(descriptor => descriptor.ctor));
			}
		}

		return inputClAsses;
	}
}

export const Extensions = {
	Editors: 'workbench.contributions.editors'
};

Registry.Add(Extensions.Editors, new EditorRegistry());
