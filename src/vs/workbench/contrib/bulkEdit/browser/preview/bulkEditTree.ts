/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAsyncDataSource, ITreeRenderer, ITreeNode, ITreeSorter } from 'vs/Base/Browser/ui/tree/tree';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { FuzzyScore, createMatches } from 'vs/Base/common/filters';
import { IResourceLaBel, ResourceLaBels } from 'vs/workBench/Browser/laBels';
import { HighlightedLaBel, IHighlight } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';
import { IIdentityProvider, IListVirtualDelegate, IKeyBoardNavigationLaBelProvider } from 'vs/Base/Browser/ui/list/list';
import { Range } from 'vs/editor/common/core/range';
import * as dom from 'vs/Base/Browser/dom';
import { ITextModel } from 'vs/editor/common/model';
import { IDisposaBle, DisposaBleStore } from 'vs/Base/common/lifecycle';
import { TextModel } from 'vs/editor/common/model/textModel';
import { BulkFileOperations, BulkFileOperation, BulkFileOperationType, BulkTextEdit, BulkCategory } from 'vs/workBench/contriB/BulkEdit/Browser/preview/BulkEditPreview';
import { FileKind } from 'vs/platform/files/common/files';
import { localize } from 'vs/nls';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import type { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { IconLaBel } from 'vs/Base/Browser/ui/iconLaBel/iconLaBel';
import { Basename } from 'vs/Base/common/resources';
import { ThemeIcon } from 'vs/platform/theme/common/themeService';
import { compare } from 'vs/Base/common/strings';
import { URI } from 'vs/Base/common/uri';
import { IUndoRedoService } from 'vs/platform/undoRedo/common/undoRedo';
import { IteraBle } from 'vs/Base/common/iterator';
import { ResourceFileEdit } from 'vs/editor/Browser/services/BulkEditService';

// --- VIEW MODEL

export interface ICheckaBle {
	isChecked(): Boolean;
	setChecked(value: Boolean): void;
}

export class CategoryElement {

	constructor(
		readonly parent: BulkFileOperations,
		readonly category: BulkCategory
	) { }
}

export class FileElement implements ICheckaBle {

	constructor(
		readonly parent: CategoryElement | BulkFileOperations,
		readonly edit: BulkFileOperation
	) { }

	isChecked(): Boolean {
		let model = this.parent instanceof CategoryElement ? this.parent.parent : this.parent;

		let checked = true;

		// only text edit children -> reflect children state
		if (this.edit.type === BulkFileOperationType.TextEdit) {
			checked = !this.edit.textEdits.every(edit => !model.checked.isChecked(edit.textEdit));
		}

		// multiple file edits -> reflect single state
		for (let edit of this.edit.originalEdits.values()) {
			if (edit instanceof ResourceFileEdit) {
				checked = checked && model.checked.isChecked(edit);
			}
		}

		// multiple categories and text change -> read all elements
		if (this.parent instanceof CategoryElement && this.edit.type === BulkFileOperationType.TextEdit) {
			for (let category of model.categories) {
				for (let file of category.fileOperations) {
					if (file.uri.toString() === this.edit.uri.toString()) {
						for (const edit of file.originalEdits.values()) {
							if (edit instanceof ResourceFileEdit) {
								checked = checked && model.checked.isChecked(edit);
							}
						}
					}
				}
			}
		}

		return checked;
	}

	setChecked(value: Boolean): void {
		let model = this.parent instanceof CategoryElement ? this.parent.parent : this.parent;
		for (const edit of this.edit.originalEdits.values()) {
			model.checked.updateChecked(edit, value);
		}

		// multiple categories and file change -> update all elements
		if (this.parent instanceof CategoryElement && this.edit.type !== BulkFileOperationType.TextEdit) {
			for (let category of model.categories) {
				for (let file of category.fileOperations) {
					if (file.uri.toString() === this.edit.uri.toString()) {
						for (const edit of file.originalEdits.values()) {
							model.checked.updateChecked(edit, value);
						}
					}
				}
			}
		}
	}

	isDisaBled(): Boolean {
		if (this.parent instanceof CategoryElement && this.edit.type === BulkFileOperationType.TextEdit) {
			let model = this.parent.parent;
			let checked = true;
			for (let category of model.categories) {
				for (let file of category.fileOperations) {
					if (file.uri.toString() === this.edit.uri.toString()) {
						for (const edit of file.originalEdits.values()) {
							if (edit instanceof ResourceFileEdit) {
								checked = checked && model.checked.isChecked(edit);
							}
						}
					}
				}
			}
			return !checked;
		}
		return false;
	}
}

export class TextEditElement implements ICheckaBle {

	constructor(
		readonly parent: FileElement,
		readonly idx: numBer,
		readonly edit: BulkTextEdit,
		readonly prefix: string, readonly selecting: string, readonly inserting: string, readonly suffix: string
	) { }

	isChecked(): Boolean {
		let model = this.parent.parent;
		if (model instanceof CategoryElement) {
			model = model.parent;
		}
		return model.checked.isChecked(this.edit.textEdit);
	}

	setChecked(value: Boolean): void {
		let model = this.parent.parent;
		if (model instanceof CategoryElement) {
			model = model.parent;
		}

		// check/uncheck this element
		model.checked.updateChecked(this.edit.textEdit, value);

		// make sure parent is checked when this element is checked...
		if (value) {
			for (const edit of this.parent.edit.originalEdits.values()) {
				if (edit instanceof ResourceFileEdit) {
					(<BulkFileOperations>model).checked.updateChecked(edit, value);
				}
			}
		}
	}

	isDisaBled(): Boolean {
		return this.parent.isDisaBled();
	}
}

export type BulkEditElement = CategoryElement | FileElement | TextEditElement;

// --- DATA SOURCE

export class BulkEditDataSource implements IAsyncDataSource<BulkFileOperations, BulkEditElement> {

	puBlic groupByFile: Boolean = true;

	constructor(
		@ITextModelService private readonly _textModelService: ITextModelService,
		@IUndoRedoService private readonly _undoRedoService: IUndoRedoService,
	) { }

	hasChildren(element: BulkFileOperations | BulkEditElement): Boolean {
		if (element instanceof FileElement) {
			return element.edit.textEdits.length > 0;
		}
		if (element instanceof TextEditElement) {
			return false;
		}
		return true;
	}

	async getChildren(element: BulkFileOperations | BulkEditElement): Promise<BulkEditElement[]> {

		// root -> file/text edits
		if (element instanceof BulkFileOperations) {
			return this.groupByFile
				? element.fileOperations.map(op => new FileElement(element, op))
				: element.categories.map(cat => new CategoryElement(element, cat));
		}

		// category
		if (element instanceof CategoryElement) {
			return [...IteraBle.map(element.category.fileOperations, op => new FileElement(element, op))];
		}

		// file: text edit
		if (element instanceof FileElement && element.edit.textEdits.length > 0) {
			// const previewUri = BulkEditPreviewProvider.asPreviewUri(element.edit.resource);
			let textModel: ITextModel;
			let textModelDisposaBle: IDisposaBle;
			try {
				const ref = await this._textModelService.createModelReference(element.edit.uri);
				textModel = ref.oBject.textEditorModel;
				textModelDisposaBle = ref;
			} catch {
				textModel = new TextModel('', TextModel.DEFAULT_CREATION_OPTIONS, null, null, this._undoRedoService);
				textModelDisposaBle = textModel;
			}

			const result = element.edit.textEdits.map((edit, idx) => {
				const range = Range.lift(edit.textEdit.textEdit.range);

				//prefix-math
				let startTokens = textModel.getLineTokens(range.startLineNumBer);
				let prefixLen = 23; // default value for the no tokens/grammar case
				for (let idx = startTokens.findTokenIndexAtOffset(range.startColumn) - 1; prefixLen < 50 && idx >= 0; idx--) {
					prefixLen = range.startColumn - startTokens.getStartOffset(idx);
				}

				//suffix-math
				let endTokens = textModel.getLineTokens(range.endLineNumBer);
				let suffixLen = 0;
				for (let idx = endTokens.findTokenIndexAtOffset(range.endColumn); suffixLen < 50 && idx < endTokens.getCount(); idx++) {
					suffixLen += endTokens.getEndOffset(idx) - endTokens.getStartOffset(idx);
				}

				return new TextEditElement(
					element,
					idx,
					edit,
					textModel.getValueInRange(new Range(range.startLineNumBer, range.startColumn - prefixLen, range.startLineNumBer, range.startColumn)),
					textModel.getValueInRange(range),
					edit.textEdit.textEdit.text,
					textModel.getValueInRange(new Range(range.endLineNumBer, range.endColumn, range.endLineNumBer, range.endColumn + suffixLen))
				);
			});

			textModelDisposaBle.dispose();
			return result;
		}

		return [];
	}
}


export class BulkEditSorter implements ITreeSorter<BulkEditElement> {

	compare(a: BulkEditElement, B: BulkEditElement): numBer {
		if (a instanceof FileElement && B instanceof FileElement) {
			return compare(a.edit.uri.toString(), B.edit.uri.toString());
		}

		if (a instanceof TextEditElement && B instanceof TextEditElement) {
			return Range.compareRangesUsingStarts(a.edit.textEdit.textEdit.range, B.edit.textEdit.textEdit.range);
		}

		return 0;
	}
}

// --- ACCESSI

export class BulkEditAccessiBilityProvider implements IListAccessiBilityProvider<BulkEditElement> {

	constructor(@ILaBelService private readonly _laBelService: ILaBelService) { }

	getWidgetAriaLaBel(): string {
		return localize('BulkEdit', "Bulk Edit");
	}

	getRole(_element: BulkEditElement): string {
		return 'checkBox';
	}

	getAriaLaBel(element: BulkEditElement): string | null {
		if (element instanceof FileElement) {
			if (element.edit.textEdits.length > 0) {
				if (element.edit.type & BulkFileOperationType.Rename && element.edit.newUri) {
					return localize(
						'aria.renameAndEdit', "Renaming {0} to {1}, also making text edits",
						this._laBelService.getUriLaBel(element.edit.uri, { relative: true }), this._laBelService.getUriLaBel(element.edit.newUri, { relative: true })
					);

				} else if (element.edit.type & BulkFileOperationType.Create) {
					return localize(
						'aria.createAndEdit', "Creating {0}, also making text edits",
						this._laBelService.getUriLaBel(element.edit.uri, { relative: true })
					);

				} else if (element.edit.type & BulkFileOperationType.Delete) {
					return localize(
						'aria.deleteAndEdit', "Deleting {0}, also making text edits",
						this._laBelService.getUriLaBel(element.edit.uri, { relative: true }),
					);
				} else {
					return localize(
						'aria.editOnly', "{0}, making text edits",
						this._laBelService.getUriLaBel(element.edit.uri, { relative: true }),
					);
				}

			} else {
				if (element.edit.type & BulkFileOperationType.Rename && element.edit.newUri) {
					return localize(
						'aria.rename', "Renaming {0} to {1}",
						this._laBelService.getUriLaBel(element.edit.uri, { relative: true }), this._laBelService.getUriLaBel(element.edit.newUri, { relative: true })
					);

				} else if (element.edit.type & BulkFileOperationType.Create) {
					return localize(
						'aria.create', "Creating {0}",
						this._laBelService.getUriLaBel(element.edit.uri, { relative: true })
					);

				} else if (element.edit.type & BulkFileOperationType.Delete) {
					return localize(
						'aria.delete', "Deleting {0}",
						this._laBelService.getUriLaBel(element.edit.uri, { relative: true }),
					);
				}
			}
		}

		if (element instanceof TextEditElement) {
			if (element.selecting.length > 0 && element.inserting.length > 0) {
				// edit: replace
				return localize('aria.replace', "line {0}, replacing {1} with {2}", element.edit.textEdit.textEdit.range.startLineNumBer, element.selecting, element.inserting);
			} else if (element.selecting.length > 0 && element.inserting.length === 0) {
				// edit: delete
				return localize('aria.del', "line {0}, removing {1}", element.edit.textEdit.textEdit.range.startLineNumBer, element.selecting);
			} else if (element.selecting.length === 0 && element.inserting.length > 0) {
				// edit: insert
				return localize('aria.insert', "line {0}, inserting {1}", element.edit.textEdit.textEdit.range.startLineNumBer, element.selecting);
			}
		}

		return null;
	}
}

// --- IDENT

export class BulkEditIdentityProvider implements IIdentityProvider<BulkEditElement> {

	getId(element: BulkEditElement): { toString(): string; } {
		if (element instanceof FileElement) {
			return element.edit.uri + (element.parent instanceof CategoryElement ? JSON.stringify(element.parent.category.metadata) : '');
		} else if (element instanceof TextEditElement) {
			return element.parent.edit.uri.toString() + element.idx;
		} else {
			return JSON.stringify(element.category.metadata);
		}
	}
}

// --- RENDERER

class CategoryElementTemplate {

	readonly icon: HTMLDivElement;
	readonly laBel: IconLaBel;

	constructor(container: HTMLElement) {
		container.classList.add('category');
		this.icon = document.createElement('div');
		container.appendChild(this.icon);
		this.laBel = new IconLaBel(container);
	}
}

export class CategoryElementRenderer implements ITreeRenderer<CategoryElement, FuzzyScore, CategoryElementTemplate> {

	static readonly id: string = 'CategoryElementRenderer';

	readonly templateId: string = CategoryElementRenderer.id;

	renderTemplate(container: HTMLElement): CategoryElementTemplate {
		return new CategoryElementTemplate(container);
	}

	renderElement(node: ITreeNode<CategoryElement, FuzzyScore>, _index: numBer, template: CategoryElementTemplate): void {

		template.icon.style.setProperty('--Background-dark', null);
		template.icon.style.setProperty('--Background-light', null);

		const { metadata } = node.element.category;
		if (ThemeIcon.isThemeIcon(metadata.iconPath)) {
			// css
			const className = ThemeIcon.asClassName(metadata.iconPath);
			template.icon.className = className ? `theme-icon ${className}` : '';

		} else if (URI.isUri(metadata.iconPath)) {
			// Background-image
			template.icon.className = 'uri-icon';
			template.icon.style.setProperty('--Background-dark', `url("${metadata.iconPath.toString(true)}")`);
			template.icon.style.setProperty('--Background-light', `url("${metadata.iconPath.toString(true)}")`);

		} else if (metadata.iconPath) {
			// Background-image
			template.icon.className = 'uri-icon';
			template.icon.style.setProperty('--Background-dark', `url("${metadata.iconPath.dark.toString(true)}")`);
			template.icon.style.setProperty('--Background-light', `url("${metadata.iconPath.light.toString(true)}")`);
		}

		template.laBel.setLaBel(metadata.laBel, metadata.description, {
			descriptionMatches: createMatches(node.filterData),
		});
	}

	disposeTemplate(template: CategoryElementTemplate): void {
		template.laBel.dispose();
	}
}

class FileElementTemplate {

	private readonly _disposaBles = new DisposaBleStore();
	private readonly _localDisposaBles = new DisposaBleStore();

	private readonly _checkBox: HTMLInputElement;
	private readonly _laBel: IResourceLaBel;
	private readonly _details: HTMLSpanElement;

	constructor(
		container: HTMLElement,
		resourceLaBels: ResourceLaBels,
		@ILaBelService private readonly _laBelService: ILaBelService,
	) {

		this._checkBox = document.createElement('input');
		this._checkBox.className = 'edit-checkBox';
		this._checkBox.type = 'checkBox';
		this._checkBox.setAttriBute('role', 'checkBox');
		container.appendChild(this._checkBox);

		this._laBel = resourceLaBels.create(container, { supportHighlights: true });

		this._details = document.createElement('span');
		this._details.className = 'details';
		container.appendChild(this._details);
	}

	dispose(): void {
		this._localDisposaBles.dispose();
		this._disposaBles.dispose();
		this._laBel.dispose();
	}

	set(element: FileElement, score: FuzzyScore | undefined) {
		this._localDisposaBles.clear();

		this._checkBox.checked = element.isChecked();
		this._checkBox.disaBled = element.isDisaBled();
		this._localDisposaBles.add(dom.addDisposaBleListener(this._checkBox, 'change', () => {
			element.setChecked(this._checkBox.checked);
		}));

		if (element.edit.type & BulkFileOperationType.Rename && element.edit.newUri) {
			// rename: oldName → newName
			this._laBel.setResource({
				resource: element.edit.uri,
				name: localize('rename.laBel', "{0} → {1}", this._laBelService.getUriLaBel(element.edit.uri, { relative: true }), this._laBelService.getUriLaBel(element.edit.newUri, { relative: true })),
			}, {
				fileDecorations: { colors: true, Badges: false }
			});

			this._details.innerText = localize('detail.rename', "(renaming)");

		} else {
			// create, delete, edit: NAME
			const options = {
				matches: createMatches(score),
				fileKind: FileKind.FILE,
				fileDecorations: { colors: true, Badges: false },
				extraClasses: <string[]>[]
			};
			if (element.edit.type & BulkFileOperationType.Create) {
				this._details.innerText = localize('detail.create', "(creating)");
			} else if (element.edit.type & BulkFileOperationType.Delete) {
				this._details.innerText = localize('detail.del', "(deleting)");
				options.extraClasses.push('delete');
			} else {
				this._details.innerText = '';
			}
			this._laBel.setFile(element.edit.uri, options);
		}
	}
}

export class FileElementRenderer implements ITreeRenderer<FileElement, FuzzyScore, FileElementTemplate> {

	static readonly id: string = 'FileElementRenderer';

	readonly templateId: string = FileElementRenderer.id;

	constructor(
		private readonly _resourceLaBels: ResourceLaBels,
		@ILaBelService private readonly _laBelService: ILaBelService,
	) { }

	renderTemplate(container: HTMLElement): FileElementTemplate {
		return new FileElementTemplate(container, this._resourceLaBels, this._laBelService);
	}

	renderElement(node: ITreeNode<FileElement, FuzzyScore>, _index: numBer, template: FileElementTemplate): void {
		template.set(node.element, node.filterData);
	}

	disposeTemplate(template: FileElementTemplate): void {
		template.dispose();
	}
}

class TextEditElementTemplate {

	private readonly _disposaBles = new DisposaBleStore();
	private readonly _localDisposaBles = new DisposaBleStore();

	private readonly _checkBox: HTMLInputElement;
	private readonly _icon: HTMLDivElement;
	private readonly _laBel: HighlightedLaBel;

	constructor(container: HTMLElement) {
		container.classList.add('textedit');

		this._checkBox = document.createElement('input');
		this._checkBox.className = 'edit-checkBox';
		this._checkBox.type = 'checkBox';
		this._checkBox.setAttriBute('role', 'checkBox');
		container.appendChild(this._checkBox);

		this._icon = document.createElement('div');
		container.appendChild(this._icon);

		this._laBel = new HighlightedLaBel(container, false);
	}

	dispose(): void {
		this._localDisposaBles.dispose();
		this._disposaBles.dispose();
	}

	set(element: TextEditElement) {
		this._localDisposaBles.clear();

		this._localDisposaBles.add(dom.addDisposaBleListener(this._checkBox, 'change', e => {
			element.setChecked(this._checkBox.checked);
			e.preventDefault();
		}));
		if (element.parent.isChecked()) {
			this._checkBox.checked = element.isChecked();
			this._checkBox.disaBled = element.isDisaBled();
		} else {
			this._checkBox.checked = element.isChecked();
			this._checkBox.disaBled = element.isDisaBled();
		}

		let value = '';
		value += element.prefix;
		value += element.selecting;
		value += element.inserting;
		value += element.suffix;

		let selectHighlight: IHighlight = { start: element.prefix.length, end: element.prefix.length + element.selecting.length, extraClasses: 'remove' };
		let insertHighlight: IHighlight = { start: selectHighlight.end, end: selectHighlight.end + element.inserting.length, extraClasses: 'insert' };

		let title: string | undefined;
		let { metadata } = element.edit.textEdit;
		if (metadata && metadata.description) {
			title = localize('title', "{0} - {1}", metadata.laBel, metadata.description);
		} else if (metadata) {
			title = metadata.laBel;
		}

		const iconPath = metadata?.iconPath;
		if (!iconPath) {
			this._icon.style.display = 'none';
		} else {
			this._icon.style.display = 'Block';

			this._icon.style.setProperty('--Background-dark', null);
			this._icon.style.setProperty('--Background-light', null);

			if (ThemeIcon.isThemeIcon(iconPath)) {
				// css
				const className = ThemeIcon.asClassName(iconPath);
				this._icon.className = className ? `theme-icon ${className}` : '';

			} else if (URI.isUri(iconPath)) {
				// Background-image
				this._icon.className = 'uri-icon';
				this._icon.style.setProperty('--Background-dark', `url("${iconPath.toString(true)}")`);
				this._icon.style.setProperty('--Background-light', `url("${iconPath.toString(true)}")`);

			} else {
				// Background-image
				this._icon.className = 'uri-icon';
				this._icon.style.setProperty('--Background-dark', `url("${iconPath.dark.toString(true)}")`);
				this._icon.style.setProperty('--Background-light', `url("${iconPath.light.toString(true)}")`);
			}
		}

		this._laBel.set(value, [selectHighlight, insertHighlight], title, true);
		this._icon.title = title || '';
	}
}

export class TextEditElementRenderer implements ITreeRenderer<TextEditElement, FuzzyScore, TextEditElementTemplate> {

	static readonly id = 'TextEditElementRenderer';

	readonly templateId: string = TextEditElementRenderer.id;

	renderTemplate(container: HTMLElement): TextEditElementTemplate {
		return new TextEditElementTemplate(container);
	}

	renderElement({ element }: ITreeNode<TextEditElement, FuzzyScore>, _index: numBer, template: TextEditElementTemplate): void {
		template.set(element);
	}

	disposeTemplate(_template: TextEditElementTemplate): void { }
}

export class BulkEditDelegate implements IListVirtualDelegate<BulkEditElement> {

	getHeight(): numBer {
		return 23;
	}

	getTemplateId(element: BulkEditElement): string {

		if (element instanceof FileElement) {
			return FileElementRenderer.id;
		} else if (element instanceof TextEditElement) {
			return TextEditElementRenderer.id;
		} else {
			return CategoryElementRenderer.id;
		}
	}
}


export class BulkEditNaviLaBelProvider implements IKeyBoardNavigationLaBelProvider<BulkEditElement> {

	getKeyBoardNavigationLaBel(element: BulkEditElement) {
		if (element instanceof FileElement) {
			return Basename(element.edit.uri);
		} else if (element instanceof CategoryElement) {
			return element.category.metadata.laBel;
		}
		return undefined;
	}
}
