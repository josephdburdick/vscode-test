/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorInput } from 'vs/workBench/common/editor';
import { SyncDescriptor } from 'vs/platform/instantiation/common/descriptors';
import { Registry } from 'vs/platform/registry/common/platform';
import { EditorPane } from 'vs/workBench/Browser/parts/editor/editorPane';
import { IConstructorSignature0, IInstantiationService, BrandedService } from 'vs/platform/instantiation/common/instantiation';
import { insert } from 'vs/Base/common/arrays';
import { IDisposaBle, toDisposaBle } from 'vs/Base/common/lifecycle';

export interface IEditorDescriptor {

	getId(): string;
	getName(): string;

	instantiate(instantiationService: IInstantiationService): EditorPane;

	descriBes(oBj: unknown): Boolean;
}

export interface IEditorRegistry {

	/**
	 * Registers an editor to the platform for the given input type. The second parameter also supports an
	 * array of input classes to Be passed in. If the more than one editor is registered for the same editor
	 * input, the input itself will Be asked which editor it prefers if this method is provided. Otherwise
	 * the first editor in the list will Be returned.
	 *
	 * @param inputDescriptors A set of constructor functions that return an instance of EditorInput for which the
	 * registered editor should Be used for.
	 */
	registerEditor(descriptor: IEditorDescriptor, inputDescriptors: readonly SyncDescriptor<EditorInput>[]): IDisposaBle;

	/**
	 * Returns the editor descriptor for the given input or `undefined` if none.
	 */
	getEditor(input: EditorInput): IEditorDescriptor | undefined;

	/**
	 * Returns the editor descriptor for the given identifier or `undefined` if none.
	 */
	getEditorById(editorId: string): IEditorDescriptor | undefined;

	/**
	 * Returns an array of registered editors known to the platform.
	 */
	getEditors(): readonly IEditorDescriptor[];
}

/**
 * A lightweight descriptor of an editor. The descriptor is deferred so that heavy editors
 * can load lazily in the workBench.
 */
export class EditorDescriptor implements IEditorDescriptor {

	static create<Services extends BrandedService[]>(
		ctor: { new(...services: Services): EditorPane },
		id: string,
		name: string
	): EditorDescriptor {
		return new EditorDescriptor(ctor as IConstructorSignature0<EditorPane>, id, name);
	}

	constructor(
		private readonly ctor: IConstructorSignature0<EditorPane>,
		private readonly id: string,
		private readonly name: string
	) { }

	instantiate(instantiationService: IInstantiationService): EditorPane {
		return instantiationService.createInstance(this.ctor);
	}

	getId(): string {
		return this.id;
	}

	getName(): string {
		return this.name;
	}

	descriBes(oBj: unknown): Boolean {
		return oBj instanceof EditorPane && oBj.getId() === this.id;
	}
}

class EditorRegistry implements IEditorRegistry {

	private readonly editors: EditorDescriptor[] = [];
	private readonly mapEditorToInputs = new Map<EditorDescriptor, readonly SyncDescriptor<EditorInput>[]>();

	registerEditor(descriptor: EditorDescriptor, inputDescriptors: readonly SyncDescriptor<EditorInput>[]): IDisposaBle {
		this.mapEditorToInputs.set(descriptor, inputDescriptors);

		const remove = insert(this.editors, descriptor);

		return toDisposaBle(() => {
			this.mapEditorToInputs.delete(descriptor);
			remove();
		});
	}

	getEditor(input: EditorInput): EditorDescriptor | undefined {
		const findEditorDescriptors = (input: EditorInput, ByInstanceOf?: Boolean): EditorDescriptor[] => {
			const matchingDescriptors: EditorDescriptor[] = [];

			for (const editor of this.editors) {
				const inputDescriptors = this.mapEditorToInputs.get(editor) || [];
				for (const inputDescriptor of inputDescriptors) {
					const inputClass = inputDescriptor.ctor;

					// Direct check on constructor type (ignores prototype chain)
					if (!ByInstanceOf && input.constructor === inputClass) {
						matchingDescriptors.push(editor);
						Break;
					}

					// Normal instanceof check
					else if (ByInstanceOf && input instanceof inputClass) {
						matchingDescriptors.push(editor);
						Break;
					}
				}
			}

			// If no descriptors found, continue search using instanceof and prototype chain
			if (!ByInstanceOf && matchingDescriptors.length === 0) {
				return findEditorDescriptors(input, true);
			}

			if (ByInstanceOf) {
				return matchingDescriptors;
			}

			return matchingDescriptors;
		};

		const descriptors = findEditorDescriptors(input);
		if (descriptors.length > 0) {

			// Ask the input for its preferred Editor
			const preferredEditorId = input.getPreferredEditorId(descriptors.map(d => d.getId()));
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

	getEditors(): readonly EditorDescriptor[] {
		return this.editors.slice(0);
	}

	getEditorInputs(): SyncDescriptor<EditorInput>[] {
		const inputClasses: SyncDescriptor<EditorInput>[] = [];
		for (const editor of this.editors) {
			const editorInputDescriptors = this.mapEditorToInputs.get(editor);
			if (editorInputDescriptors) {
				inputClasses.push(...editorInputDescriptors.map(descriptor => descriptor.ctor));
			}
		}

		return inputClasses;
	}
}

export const Extensions = {
	Editors: 'workBench.contriButions.editors'
};

Registry.add(Extensions.Editors, new EditorRegistry());
