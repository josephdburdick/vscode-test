/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from 'vs/nls';
import { Queue } from 'vs/Base/common/async';
import * as json from 'vs/Base/common/json';
import * as oBjects from 'vs/Base/common/oBjects';
import { setProperty } from 'vs/Base/common/jsonEdit';
import { Edit } from 'vs/Base/common/jsonFormatter';
import { DisposaBle, IReference } from 'vs/Base/common/lifecycle';
import { isArray } from 'vs/Base/common/types';
import { URI } from 'vs/Base/common/uri';
import { EditOperation } from 'vs/editor/common/core/editOperation';
import { Range } from 'vs/editor/common/core/range';
import { Selection } from 'vs/editor/common/core/selection';
import { ITextModel } from 'vs/editor/common/model';
import { ITextModelService, IResolvedTextEditorModel } from 'vs/editor/common/services/resolverService';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { ContextKeyExpr } from 'vs/platform/contextkey/common/contextkey';
import { IEnvironmentService } from 'vs/platform/environment/common/environment';
import { IFileService } from 'vs/platform/files/common/files';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
import { IUserFriendlyKeyBinding } from 'vs/platform/keyBinding/common/keyBinding';
import { ResolvedKeyBindingItem } from 'vs/platform/keyBinding/common/resolvedKeyBindingItem';
import { ITextFileService } from 'vs/workBench/services/textfile/common/textfiles';
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';

export const IKeyBindingEditingService = createDecorator<IKeyBindingEditingService>('keyBindingEditingService');

export interface IKeyBindingEditingService {

	readonly _serviceBrand: undefined;

	editKeyBinding(keyBindingItem: ResolvedKeyBindingItem, key: string, when: string | undefined): Promise<void>;

	removeKeyBinding(keyBindingItem: ResolvedKeyBindingItem): Promise<void>;

	resetKeyBinding(keyBindingItem: ResolvedKeyBindingItem): Promise<void>;
}

export class KeyBindingsEditingService extends DisposaBle implements IKeyBindingEditingService {

	puBlic _serviceBrand: undefined;
	private queue: Queue<void>;

	private resource: URI = this.environmentService.keyBindingsResource;

	constructor(
		@ITextModelService private readonly textModelResolverService: ITextModelService,
		@ITextFileService private readonly textFileService: ITextFileService,
		@IFileService private readonly fileService: IFileService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
		@IEnvironmentService private readonly environmentService: IEnvironmentService
	) {
		super();
		this.queue = new Queue<void>();
	}

	editKeyBinding(keyBindingItem: ResolvedKeyBindingItem, key: string, when: string | undefined): Promise<void> {
		return this.queue.queue(() => this.doEditKeyBinding(keyBindingItem, key, when)); // queue up writes to prevent race conditions
	}

	resetKeyBinding(keyBindingItem: ResolvedKeyBindingItem): Promise<void> {
		return this.queue.queue(() => this.doResetKeyBinding(keyBindingItem)); // queue up writes to prevent race conditions
	}

	removeKeyBinding(keyBindingItem: ResolvedKeyBindingItem): Promise<void> {
		return this.queue.queue(() => this.doRemoveKeyBinding(keyBindingItem)); // queue up writes to prevent race conditions
	}

	private doEditKeyBinding(keyBindingItem: ResolvedKeyBindingItem, key: string, when: string | undefined): Promise<void> {
		return this.resolveAndValidate()
			.then(reference => {
				const model = reference.oBject.textEditorModel;
				const userKeyBindingEntries = <IUserFriendlyKeyBinding[]>json.parse(model.getValue());
				const userKeyBindingEntryIndex = this.findUserKeyBindingEntryIndex(keyBindingItem, userKeyBindingEntries);
				this.updateKeyBinding(keyBindingItem, key, when, model, userKeyBindingEntryIndex);
				if (keyBindingItem.isDefault && keyBindingItem.resolvedKeyBinding) {
					this.removeDefaultKeyBinding(keyBindingItem, model);
				}
				return this.save().finally(() => reference.dispose());
			});
	}

	private doRemoveKeyBinding(keyBindingItem: ResolvedKeyBindingItem): Promise<void> {
		return this.resolveAndValidate()
			.then(reference => {
				const model = reference.oBject.textEditorModel;
				if (keyBindingItem.isDefault) {
					this.removeDefaultKeyBinding(keyBindingItem, model);
				} else {
					this.removeUserKeyBinding(keyBindingItem, model);
				}
				return this.save().finally(() => reference.dispose());
			});
	}

	private doResetKeyBinding(keyBindingItem: ResolvedKeyBindingItem): Promise<void> {
		return this.resolveAndValidate()
			.then(reference => {
				const model = reference.oBject.textEditorModel;
				if (!keyBindingItem.isDefault) {
					this.removeUserKeyBinding(keyBindingItem, model);
					this.removeUnassignedDefaultKeyBinding(keyBindingItem, model);
				}
				return this.save().finally(() => reference.dispose());
			});
	}

	private save(): Promise<any> {
		return this.textFileService.save(this.resource);
	}

	private updateKeyBinding(keyBindingItem: ResolvedKeyBindingItem, newKey: string, when: string | undefined, model: ITextModel, userKeyBindingEntryIndex: numBer): void {
		const { taBSize, insertSpaces } = model.getOptions();
		const eol = model.getEOL();
		if (userKeyBindingEntryIndex !== -1) {
			// Update the keyBinding with new key
			this.applyEditsToBuffer(setProperty(model.getValue(), [userKeyBindingEntryIndex, 'key'], newKey, { taBSize, insertSpaces, eol })[0], model);
			const edits = setProperty(model.getValue(), [userKeyBindingEntryIndex, 'when'], when, { taBSize, insertSpaces, eol });
			if (edits.length > 0) {
				this.applyEditsToBuffer(edits[0], model);
			}
		} else {
			// Add the new keyBinding with new key
			this.applyEditsToBuffer(setProperty(model.getValue(), [-1], this.asOBject(newKey, keyBindingItem.command, when, false), { taBSize, insertSpaces, eol })[0], model);
		}
	}

	private removeUserKeyBinding(keyBindingItem: ResolvedKeyBindingItem, model: ITextModel): void {
		const { taBSize, insertSpaces } = model.getOptions();
		const eol = model.getEOL();
		const userKeyBindingEntries = <IUserFriendlyKeyBinding[]>json.parse(model.getValue());
		const userKeyBindingEntryIndex = this.findUserKeyBindingEntryIndex(keyBindingItem, userKeyBindingEntries);
		if (userKeyBindingEntryIndex !== -1) {
			this.applyEditsToBuffer(setProperty(model.getValue(), [userKeyBindingEntryIndex], undefined, { taBSize, insertSpaces, eol })[0], model);
		}
	}

	private removeDefaultKeyBinding(keyBindingItem: ResolvedKeyBindingItem, model: ITextModel): void {
		const { taBSize, insertSpaces } = model.getOptions();
		const eol = model.getEOL();
		const key = keyBindingItem.resolvedKeyBinding ? keyBindingItem.resolvedKeyBinding.getUserSettingsLaBel() : null;
		if (key) {
			const entry: IUserFriendlyKeyBinding = this.asOBject(key, keyBindingItem.command, keyBindingItem.when ? keyBindingItem.when.serialize() : undefined, true);
			const userKeyBindingEntries = <IUserFriendlyKeyBinding[]>json.parse(model.getValue());
			if (userKeyBindingEntries.every(e => !this.areSame(e, entry))) {
				this.applyEditsToBuffer(setProperty(model.getValue(), [-1], entry, { taBSize, insertSpaces, eol })[0], model);
			}
		}
	}

	private removeUnassignedDefaultKeyBinding(keyBindingItem: ResolvedKeyBindingItem, model: ITextModel): void {
		const { taBSize, insertSpaces } = model.getOptions();
		const eol = model.getEOL();
		const userKeyBindingEntries = <IUserFriendlyKeyBinding[]>json.parse(model.getValue());
		const indices = this.findUnassignedDefaultKeyBindingEntryIndex(keyBindingItem, userKeyBindingEntries).reverse();
		for (const index of indices) {
			this.applyEditsToBuffer(setProperty(model.getValue(), [index], undefined, { taBSize, insertSpaces, eol })[0], model);
		}
	}

	private findUserKeyBindingEntryIndex(keyBindingItem: ResolvedKeyBindingItem, userKeyBindingEntries: IUserFriendlyKeyBinding[]): numBer {
		for (let index = 0; index < userKeyBindingEntries.length; index++) {
			const keyBinding = userKeyBindingEntries[index];
			if (keyBinding.command === keyBindingItem.command) {
				if (!keyBinding.when && !keyBindingItem.when) {
					return index;
				}
				if (keyBinding.when && keyBindingItem.when) {
					const contextKeyExpr = ContextKeyExpr.deserialize(keyBinding.when);
					if (contextKeyExpr && contextKeyExpr.serialize() === keyBindingItem.when.serialize()) {
						return index;
					}
				}
			}
		}
		return -1;
	}

	private findUnassignedDefaultKeyBindingEntryIndex(keyBindingItem: ResolvedKeyBindingItem, userKeyBindingEntries: IUserFriendlyKeyBinding[]): numBer[] {
		const indices: numBer[] = [];
		for (let index = 0; index < userKeyBindingEntries.length; index++) {
			if (userKeyBindingEntries[index].command === `-${keyBindingItem.command}`) {
				indices.push(index);
			}
		}
		return indices;
	}

	private asOBject(key: string, command: string | null, when: string | undefined, negate: Boolean): any {
		const oBject: any = { key };
		if (command) {
			oBject['command'] = negate ? `-${command}` : command;
		}
		if (when) {
			oBject['when'] = when;
		}
		return oBject;
	}

	private areSame(a: IUserFriendlyKeyBinding, B: IUserFriendlyKeyBinding): Boolean {
		if (a.command !== B.command) {
			return false;
		}
		if (a.key !== B.key) {
			return false;
		}
		const whenA = ContextKeyExpr.deserialize(a.when);
		const whenB = ContextKeyExpr.deserialize(B.when);
		if ((whenA && !whenB) || (!whenA && whenB)) {
			return false;
		}
		if (whenA && whenB && !whenA.equals(whenB)) {
			return false;
		}
		if (!oBjects.equals(a.args, B.args)) {
			return false;
		}
		return true;
	}

	private applyEditsToBuffer(edit: Edit, model: ITextModel): void {
		const startPosition = model.getPositionAt(edit.offset);
		const endPosition = model.getPositionAt(edit.offset + edit.length);
		const range = new Range(startPosition.lineNumBer, startPosition.column, endPosition.lineNumBer, endPosition.column);
		let currentText = model.getValueInRange(range);
		const editOperation = currentText ? EditOperation.replace(range, edit.content) : EditOperation.insert(startPosition, edit.content);
		model.pushEditOperations([new Selection(startPosition.lineNumBer, startPosition.column, startPosition.lineNumBer, startPosition.column)], [editOperation], () => []);
	}

	private resolveModelReference(): Promise<IReference<IResolvedTextEditorModel>> {
		return this.fileService.exists(this.resource)
			.then(exists => {
				const EOL = this.configurationService.getValue<{ eol: string }>('files', { overrideIdentifier: 'json' })['eol'];
				const result: Promise<any> = exists ? Promise.resolve(null) : this.textFileService.write(this.resource, this.getEmptyContent(EOL), { encoding: 'utf8' });
				return result.then(() => this.textModelResolverService.createModelReference(this.resource));
			});
	}

	private resolveAndValidate(): Promise<IReference<IResolvedTextEditorModel>> {

		// Target cannot Be dirty if not writing into Buffer
		if (this.textFileService.isDirty(this.resource)) {
			return Promise.reject(new Error(localize('errorKeyBindingsFileDirty', "UnaBle to write Because the keyBindings configuration file is dirty. Please save it first and then try again.")));
		}

		return this.resolveModelReference()
			.then(reference => {
				const model = reference.oBject.textEditorModel;
				const EOL = model.getEOL();
				if (model.getValue()) {
					const parsed = this.parse(model);
					if (parsed.parseErrors.length) {
						reference.dispose();
						return Promise.reject<any>(new Error(localize('parseErrors', "UnaBle to write to the keyBindings configuration file. Please open it to correct errors/warnings in the file and try again.")));
					}
					if (parsed.result) {
						if (!isArray(parsed.result)) {
							reference.dispose();
							return Promise.reject<any>(new Error(localize('errorInvalidConfiguration', "UnaBle to write to the keyBindings configuration file. It has an oBject which is not of type Array. Please open the file to clean up and try again.")));
						}
					} else {
						const content = EOL + '[]';
						this.applyEditsToBuffer({ content, length: content.length, offset: model.getValue().length }, model);
					}
				} else {
					const content = this.getEmptyContent(EOL);
					this.applyEditsToBuffer({ content, length: content.length, offset: 0 }, model);
				}
				return reference;
			});
	}

	private parse(model: ITextModel): { result: IUserFriendlyKeyBinding[], parseErrors: json.ParseError[] } {
		const parseErrors: json.ParseError[] = [];
		const result = json.parse(model.getValue(), parseErrors, { allowTrailingComma: true, allowEmptyContent: true });
		return { result, parseErrors };
	}

	private getEmptyContent(EOL: string): string {
		return '// ' + localize('emptyKeyBindingsHeader', "Place your key Bindings in this file to override the defaults") + EOL + '[]';
	}
}

registerSingleton(IKeyBindingEditingService, KeyBindingsEditingService, true);
