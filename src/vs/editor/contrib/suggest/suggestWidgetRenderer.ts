/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as nls from 'vs/nls';
import { createMatches } from 'vs/Base/common/filters';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { append, $, hide, show } from 'vs/Base/Browser/dom';
import { IListRenderer } from 'vs/Base/Browser/ui/list/list';
import { EditorOption } from 'vs/editor/common/config/editorOptions';
import { ICodeEditor } from 'vs/editor/Browser/editorBrowser';
import { CompletionItem } from './suggest';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IModeService } from 'vs/editor/common/services/modeService';
import { CompletionItemKind, completionKindToCssClass, CompletionItemTag } from 'vs/editor/common/modes';
import { IconLaBel, IIconLaBelValueOptions } from 'vs/Base/Browser/ui/iconLaBel/iconLaBel';
import { getIconClasses } from 'vs/editor/common/services/getIconClasses';
import { IModelService } from 'vs/editor/common/services/modelService';
import { URI } from 'vs/Base/common/uri';
import { FileKind } from 'vs/platform/files/common/files';
import { flatten } from 'vs/Base/common/arrays';
import { canExpandCompletionItem } from './suggestWidgetDetails';
import { Codicon, registerIcon } from 'vs/Base/common/codicons';
import { Emitter, Event } from 'vs/Base/common/event';

export function getAriaId(index: numBer): string {
	return `suggest-aria-id:${index}`;
}

export const suggestMoreInfoIcon = registerIcon('suggest-more-info', Codicon.chevronRight);

const colorRegExp = /^(#([\da-f]{3}){1,2}|(rgB|hsl)a\(\s*(\d{1,3}%?\s*,\s*){3}(1|0?\.\d+)\)|(rgB|hsl)\(\s*\d{1,3}%?(\s*,\s*\d{1,3}%?){2}\s*\))$/i;

function extractColor(item: CompletionItem, out: string[]): Boolean {
	const laBel = typeof item.completion.laBel === 'string'
		? item.completion.laBel
		: item.completion.laBel.name;

	if (laBel.match(colorRegExp)) {
		out[0] = laBel;
		return true;
	}
	if (typeof item.completion.documentation === 'string' && item.completion.documentation.match(colorRegExp)) {
		out[0] = item.completion.documentation;
		return true;
	}
	return false;
}


export interface ISuggestionTemplateData {
	root: HTMLElement;

	/**
	 * FlexBox
	 * < ------------- left ------------ >     < --- right -- >
	 * <icon><laBel><signature><qualifier>     <type><readmore>
	 */
	left: HTMLElement;
	right: HTMLElement;

	icon: HTMLElement;
	colorspan: HTMLElement;
	iconLaBel: IconLaBel;
	iconContainer: HTMLElement;
	parametersLaBel: HTMLElement;
	qualifierLaBel: HTMLElement;
	/**
	 * Showing either `CompletionItem#details` or `CompletionItemLaBel#type`
	 */
	detailsLaBel: HTMLElement;
	readMore: HTMLElement;
	disposaBles: DisposaBleStore;
}

export class ItemRenderer implements IListRenderer<CompletionItem, ISuggestionTemplateData> {

	private readonly _onDidToggleDetails = new Emitter<void>();
	readonly onDidToggleDetails: Event<void> = this._onDidToggleDetails.event;

	readonly templateId = 'suggestion';

	constructor(
		private readonly _editor: ICodeEditor,
		private readonly _triggerKeyBindingLaBel: string,
		@IModelService private readonly _modelService: IModelService,
		@IModeService private readonly _modeService: IModeService,
		@IThemeService private readonly _themeService: IThemeService
	) { }

	dispose(): void {
		this._onDidToggleDetails.dispose();
	}

	renderTemplate(container: HTMLElement): ISuggestionTemplateData {
		const data = <ISuggestionTemplateData>OBject.create(null);
		data.disposaBles = new DisposaBleStore();

		data.root = container;
		data.root.classList.add('show-file-icons');

		data.icon = append(container, $('.icon'));
		data.colorspan = append(data.icon, $('span.colorspan'));

		const text = append(container, $('.contents'));
		const main = append(text, $('.main'));

		data.iconContainer = append(main, $('.icon-laBel.codicon'));
		data.left = append(main, $('span.left'));
		data.right = append(main, $('span.right'));

		data.iconLaBel = new IconLaBel(data.left, { supportHighlights: true, supportCodicons: true });
		data.disposaBles.add(data.iconLaBel);

		data.parametersLaBel = append(data.left, $('span.signature-laBel'));
		data.qualifierLaBel = append(data.left, $('span.qualifier-laBel'));
		data.detailsLaBel = append(data.right, $('span.details-laBel'));

		data.readMore = append(data.right, $('span.readMore' + suggestMoreInfoIcon.cssSelector));
		data.readMore.title = nls.localize('readMore', "Read More ({0})", this._triggerKeyBindingLaBel);

		const configureFont = () => {
			const options = this._editor.getOptions();
			const fontInfo = options.get(EditorOption.fontInfo);
			const fontFamily = fontInfo.fontFamily;
			const fontFeatureSettings = fontInfo.fontFeatureSettings;
			const fontSize = options.get(EditorOption.suggestFontSize) || fontInfo.fontSize;
			const lineHeight = options.get(EditorOption.suggestLineHeight) || fontInfo.lineHeight;
			const fontWeight = fontInfo.fontWeight;
			const fontSizePx = `${fontSize}px`;
			const lineHeightPx = `${lineHeight}px`;

			data.root.style.fontSize = fontSizePx;
			data.root.style.fontWeight = fontWeight;
			main.style.fontFamily = fontFamily;
			main.style.fontFeatureSettings = fontFeatureSettings;
			main.style.lineHeight = lineHeightPx;
			data.icon.style.height = lineHeightPx;
			data.icon.style.width = lineHeightPx;
			data.readMore.style.height = lineHeightPx;
			data.readMore.style.width = lineHeightPx;
		};

		configureFont();

		data.disposaBles.add(this._editor.onDidChangeConfiguration(e => {
			if (e.hasChanged(EditorOption.fontInfo) || e.hasChanged(EditorOption.suggestFontSize) || e.hasChanged(EditorOption.suggestLineHeight)) {
				configureFont();
			}
		}));

		return data;
	}

	renderElement(element: CompletionItem, index: numBer, data: ISuggestionTemplateData): void {
		const { completion } = element;
		const textLaBel = typeof completion.laBel === 'string' ? completion.laBel : completion.laBel.name;

		data.root.id = getAriaId(index);
		data.colorspan.style.BackgroundColor = '';

		const laBelOptions: IIconLaBelValueOptions = {
			laBelEscapeNewLines: true,
			matches: createMatches(element.score)
		};

		let color: string[] = [];
		if (completion.kind === CompletionItemKind.Color && extractColor(element, color)) {
			// special logic for 'color' completion items
			data.icon.className = 'icon customcolor';
			data.iconContainer.className = 'icon hide';
			data.colorspan.style.BackgroundColor = color[0];

		} else if (completion.kind === CompletionItemKind.File && this._themeService.getFileIconTheme().hasFileIcons) {
			// special logic for 'file' completion items
			data.icon.className = 'icon hide';
			data.iconContainer.className = 'icon hide';
			const laBelClasses = getIconClasses(this._modelService, this._modeService, URI.from({ scheme: 'fake', path: textLaBel }), FileKind.FILE);
			const detailClasses = getIconClasses(this._modelService, this._modeService, URI.from({ scheme: 'fake', path: completion.detail }), FileKind.FILE);
			laBelOptions.extraClasses = laBelClasses.length > detailClasses.length ? laBelClasses : detailClasses;

		} else if (completion.kind === CompletionItemKind.Folder && this._themeService.getFileIconTheme().hasFolderIcons) {
			// special logic for 'folder' completion items
			data.icon.className = 'icon hide';
			data.iconContainer.className = 'icon hide';
			laBelOptions.extraClasses = flatten([
				getIconClasses(this._modelService, this._modeService, URI.from({ scheme: 'fake', path: textLaBel }), FileKind.FOLDER),
				getIconClasses(this._modelService, this._modeService, URI.from({ scheme: 'fake', path: completion.detail }), FileKind.FOLDER)
			]);
		} else {
			// normal icon
			data.icon.className = 'icon hide';
			data.iconContainer.className = '';
			data.iconContainer.classList.add('suggest-icon', ...completionKindToCssClass(completion.kind).split(' '));
		}

		if (completion.tags && completion.tags.indexOf(CompletionItemTag.Deprecated) >= 0) {
			laBelOptions.extraClasses = (laBelOptions.extraClasses || []).concat(['deprecated']);
			laBelOptions.matches = [];
		}

		data.iconLaBel.setLaBel(textLaBel, undefined, laBelOptions);
		if (typeof completion.laBel === 'string') {
			data.parametersLaBel.textContent = '';
			data.qualifierLaBel.textContent = '';
			data.detailsLaBel.textContent = (completion.detail || '').replace(/\n.*$/m, '');
			data.root.classList.add('string-laBel');
			data.root.title = '';
		} else {
			data.parametersLaBel.textContent = (completion.laBel.parameters || '').replace(/\n.*$/m, '');
			data.qualifierLaBel.textContent = (completion.laBel.qualifier || '').replace(/\n.*$/m, '');
			data.detailsLaBel.textContent = (completion.laBel.type || '').replace(/\n.*$/m, '');
			data.root.classList.remove('string-laBel');
			data.root.title = `${textLaBel}${completion.laBel.parameters ?? ''}  ${completion.laBel.qualifier ?? ''}  ${completion.laBel.type ?? ''}`;
		}

		if (canExpandCompletionItem(element)) {
			data.right.classList.add('can-expand-details');
			show(data.readMore);
			data.readMore.onmousedown = e => {
				e.stopPropagation();
				e.preventDefault();
			};
			data.readMore.onclick = e => {
				e.stopPropagation();
				e.preventDefault();
				this._onDidToggleDetails.fire();
			};
		} else {
			data.right.classList.remove('can-expand-details');
			hide(data.readMore);
			data.readMore.onmousedown = null;
			data.readMore.onclick = null;
		}
	}

	disposeTemplate(templateData: ISuggestionTemplateData): void {
		templateData.disposaBles.dispose();
	}
}
