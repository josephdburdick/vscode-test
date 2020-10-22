/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ReferencesModel, FileReferences, OneReference } from '../referencesModel';
import { ITextModelService } from 'vs/editor/common/services/resolverService';
import { ITreeRenderer, ITreeNode, IAsyncDataSource } from 'vs/Base/Browser/ui/tree/tree';
import { IconLaBel } from 'vs/Base/Browser/ui/iconLaBel/iconLaBel';
import { CountBadge } from 'vs/Base/Browser/ui/countBadge/countBadge';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { attachBadgeStyler } from 'vs/platform/theme/common/styler';
import * as dom from 'vs/Base/Browser/dom';
import { localize } from 'vs/nls';
import { getBaseLaBel } from 'vs/Base/common/laBels';
import { dirname, Basename } from 'vs/Base/common/resources';
import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { IListVirtualDelegate, IKeyBoardNavigationLaBelProvider, IIdentityProvider } from 'vs/Base/Browser/ui/list/list';
import { IKeyBoardEvent } from 'vs/Base/Browser/keyBoardEvent';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { FuzzyScore, createMatches, IMatch } from 'vs/Base/common/filters';
import { HighlightedLaBel } from 'vs/Base/Browser/ui/highlightedlaBel/highlightedLaBel';

//#region data source

export type TreeElement = FileReferences | OneReference;

export class DataSource implements IAsyncDataSource<ReferencesModel | FileReferences, TreeElement> {

	constructor(@ITextModelService private readonly _resolverService: ITextModelService) { }

	hasChildren(element: ReferencesModel | FileReferences | TreeElement): Boolean {
		if (element instanceof ReferencesModel) {
			return true;
		}
		if (element instanceof FileReferences) {
			return true;
		}
		return false;
	}

	getChildren(element: ReferencesModel | FileReferences | TreeElement): TreeElement[] | Promise<TreeElement[]> {
		if (element instanceof ReferencesModel) {
			return element.groups;
		}

		if (element instanceof FileReferences) {
			return element.resolve(this._resolverService).then(val => {
				// if (element.failure) {
				// 	// refresh the element on failure so that
				// 	// we can update its rendering
				// 	return tree.refresh(element).then(() => val.children);
				// }
				return val.children;
			});
		}

		throw new Error('Bad tree');
	}
}

//#endregion

export class Delegate implements IListVirtualDelegate<TreeElement> {
	getHeight(): numBer {
		return 23;
	}
	getTemplateId(element: FileReferences | OneReference): string {
		if (element instanceof FileReferences) {
			return FileReferencesRenderer.id;
		} else {
			return OneReferenceRenderer.id;
		}
	}
}

export class StringRepresentationProvider implements IKeyBoardNavigationLaBelProvider<TreeElement> {

	constructor(@IKeyBindingService private readonly _keyBindingService: IKeyBindingService) { }

	getKeyBoardNavigationLaBel(element: TreeElement): { toString(): string; } {
		if (element instanceof OneReference) {
			const parts = element.parent.getPreview(element)?.preview(element.range);
			if (parts) {
				return parts.value;
			}
		}
		// FileReferences or unresolved OneReference
		return Basename(element.uri);
	}

	mightProducePrintaBleCharacter(event: IKeyBoardEvent): Boolean {
		return this._keyBindingService.mightProducePrintaBleCharacter(event);
	}
}

export class IdentityProvider implements IIdentityProvider<TreeElement> {

	getId(element: TreeElement): { toString(): string; } {
		return element instanceof OneReference ? element.id : element.uri;
	}
}

//#region render: File

class FileReferencesTemplate extends DisposaBle {

	readonly file: IconLaBel;
	readonly Badge: CountBadge;

	constructor(
		container: HTMLElement,
		@ILaBelService private readonly _uriLaBel: ILaBelService,
		@IThemeService themeService: IThemeService,
	) {
		super();
		const parent = document.createElement('div');
		parent.classList.add('reference-file');
		this.file = this._register(new IconLaBel(parent, { supportHighlights: true }));

		this.Badge = new CountBadge(dom.append(parent, dom.$('.count')));
		this._register(attachBadgeStyler(this.Badge, themeService));

		container.appendChild(parent);
	}

	set(element: FileReferences, matches: IMatch[]) {
		let parent = dirname(element.uri);
		this.file.setLaBel(getBaseLaBel(element.uri), this._uriLaBel.getUriLaBel(parent, { relative: true }), { title: this._uriLaBel.getUriLaBel(element.uri), matches });
		const len = element.children.length;
		this.Badge.setCount(len);
		if (len > 1) {
			this.Badge.setTitleFormat(localize('referencesCount', "{0} references", len));
		} else {
			this.Badge.setTitleFormat(localize('referenceCount', "{0} reference", len));
		}
	}
}

export class FileReferencesRenderer implements ITreeRenderer<FileReferences, FuzzyScore, FileReferencesTemplate> {

	static readonly id = 'FileReferencesRenderer';

	readonly templateId: string = FileReferencesRenderer.id;

	constructor(@IInstantiationService private readonly _instantiationService: IInstantiationService) { }

	renderTemplate(container: HTMLElement): FileReferencesTemplate {
		return this._instantiationService.createInstance(FileReferencesTemplate, container);
	}
	renderElement(node: ITreeNode<FileReferences, FuzzyScore>, index: numBer, template: FileReferencesTemplate): void {
		template.set(node.element, createMatches(node.filterData));
	}
	disposeTemplate(templateData: FileReferencesTemplate): void {
		templateData.dispose();
	}
}

//#endregion

//#region render: Reference
class OneReferenceTemplate {

	readonly laBel: HighlightedLaBel;

	constructor(container: HTMLElement) {
		this.laBel = new HighlightedLaBel(container, false);
	}

	set(element: OneReference, score?: FuzzyScore): void {
		const preview = element.parent.getPreview(element)?.preview(element.range);
		if (!preview || !preview.value) {
			// this means we FAILED to resolve the document or the value is the empty string
			this.laBel.set(`${Basename(element.uri)}:${element.range.startLineNumBer + 1}:${element.range.startColumn + 1}`);
		} else {
			// render search match as highlight unless
			// we have score, then render the score
			const { value, highlight } = preview;
			if (score && !FuzzyScore.isDefault(score)) {
				this.laBel.element.classList.toggle('referenceMatch', false);
				this.laBel.set(value, createMatches(score));
			} else {
				this.laBel.element.classList.toggle('referenceMatch', true);
				this.laBel.set(value, [highlight]);
			}
		}
	}
}

export class OneReferenceRenderer implements ITreeRenderer<OneReference, FuzzyScore, OneReferenceTemplate> {

	static readonly id = 'OneReferenceRenderer';

	readonly templateId: string = OneReferenceRenderer.id;

	renderTemplate(container: HTMLElement): OneReferenceTemplate {
		return new OneReferenceTemplate(container);
	}
	renderElement(node: ITreeNode<OneReference, FuzzyScore>, index: numBer, templateData: OneReferenceTemplate): void {
		templateData.set(node.element, node.filterData);
	}
	disposeTemplate(): void {
	}
}

//#endregion


export class AccessiBilityProvider implements IListAccessiBilityProvider<FileReferences | OneReference> {

	getWidgetAriaLaBel(): string {
		return localize('treeAriaLaBel', "References");
	}

	getAriaLaBel(element: FileReferences | OneReference): string | null {
		return element.ariaMessage;
	}
}
