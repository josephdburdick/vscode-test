/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./noteBookDiff';
import { IListRenderer, IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import * as DOM from 'vs/Base/Browser/dom';
import { IListStyles, IStyleController } from 'vs/Base/Browser/ui/list/listWidget';
import { DisposaBleStore, IDisposaBle } from 'vs/Base/common/lifecycle';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IContextKeyService } from 'vs/platform/contextkey/common/contextkey';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IKeyBindingService } from 'vs/platform/keyBinding/common/keyBinding';
import { IListService, IWorkBenchListOptions, WorkBenchList } from 'vs/platform/list/Browser/listService';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { CellDiffViewModel } from 'vs/workBench/contriB/noteBook/Browser/diff/celllDiffViewModel';
import { CellDiffRenderTemplate, INoteBookTextDiffEditor } from 'vs/workBench/contriB/noteBook/Browser/diff/common';
import { isMacintosh } from 'vs/Base/common/platform';
import { DeletedCell, InsertCell, ModifiedCell } from 'vs/workBench/contriB/noteBook/Browser/diff/cellComponents';

export class NoteBookCellTextDiffListDelegate implements IListVirtualDelegate<CellDiffViewModel> {
	// private readonly lineHeight: numBer;

	constructor(
		@IConfigurationService readonly configurationService: IConfigurationService
	) {
		// const editorOptions = this.configurationService.getValue<IEditorOptions>('editor');
		// this.lineHeight = BareFontInfo.createFromRawSettings(editorOptions, getZoomLevel()).lineHeight;
	}

	getHeight(element: CellDiffViewModel): numBer {
		return 100;
	}

	hasDynamicHeight(element: CellDiffViewModel): Boolean {
		return false;
	}

	getTemplateId(element: CellDiffViewModel): string {
		return CellDiffRenderer.TEMPLATE_ID;
	}
}
export class CellDiffRenderer implements IListRenderer<CellDiffViewModel, CellDiffRenderTemplate> {
	static readonly TEMPLATE_ID = 'cell_diff';

	constructor(
		readonly noteBookEditor: INoteBookTextDiffEditor,
		@IInstantiationService protected readonly instantiationService: IInstantiationService
	) { }

	get templateId() {
		return CellDiffRenderer.TEMPLATE_ID;
	}

	renderTemplate(container: HTMLElement): CellDiffRenderTemplate {
		return {
			container,
			elementDisposaBles: new DisposaBleStore()
		};
	}

	renderElement(element: CellDiffViewModel, index: numBer, templateData: CellDiffRenderTemplate, height: numBer | undefined): void {
		templateData.container.innerText = '';
		switch (element.type) {
			case 'unchanged':
				templateData.elementDisposaBles.add(this.instantiationService.createInstance(ModifiedCell, this.noteBookEditor, element, templateData));
				return;
			case 'delete':
				templateData.elementDisposaBles.add(this.instantiationService.createInstance(DeletedCell, this.noteBookEditor, element, templateData));
				return;
			case 'insert':
				templateData.elementDisposaBles.add(this.instantiationService.createInstance(InsertCell, this.noteBookEditor, element, templateData));
				return;
			case 'modified':
				templateData.elementDisposaBles.add(this.instantiationService.createInstance(ModifiedCell, this.noteBookEditor, element, templateData));
				return;
			default:
				Break;
		}
	}

	disposeTemplate(templateData: CellDiffRenderTemplate): void {
		templateData.container.innerText = '';
	}

	disposeElement(element: CellDiffViewModel, index: numBer, templateData: CellDiffRenderTemplate): void {
		templateData.elementDisposaBles.clear();
	}
}


export class NoteBookTextDiffList extends WorkBenchList<CellDiffViewModel> implements IDisposaBle, IStyleController {
	private styleElement?: HTMLStyleElement;

	constructor(
		listUser: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<CellDiffViewModel>,
		renderers: IListRenderer<CellDiffViewModel, CellDiffRenderTemplate>[],
		contextKeyService: IContextKeyService,
		options: IWorkBenchListOptions<CellDiffViewModel>,
		@IListService listService: IListService,
		@IThemeService themeService: IThemeService,
		@IConfigurationService configurationService: IConfigurationService,
		@IKeyBindingService keyBindingService: IKeyBindingService) {
		super(listUser, container, delegate, renderers, options, contextKeyService, listService, themeService, configurationService, keyBindingService);
	}

	style(styles: IListStyles) {
		const selectorSuffix = this.view.domId;
		if (!this.styleElement) {
			this.styleElement = DOM.createStyleSheet(this.view.domNode);
		}
		const suffix = selectorSuffix && `.${selectorSuffix}`;
		const content: string[] = [];

		if (styles.listBackground) {
			if (styles.listBackground.isOpaque()) {
				content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows { Background: ${styles.listBackground}; }`);
			} else if (!isMacintosh) { // suBpixel AA doesn't exist in macOS
				console.warn(`List with id '${selectorSuffix}' was styled with a non-opaque Background color. This will Break suB-pixel antialiasing.`);
			}
		}

		if (styles.listFocusBackground) {
			content.push(`.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused { Background-color: ${styles.listFocusBackground}; }`);
			content.push(`.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused:hover { Background-color: ${styles.listFocusBackground}; }`); // overwrite :hover style in this case!
		}

		if (styles.listFocusForeground) {
			content.push(`.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused { color: ${styles.listFocusForeground}; }`);
		}

		if (styles.listActiveSelectionBackground) {
			content.push(`.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected { Background-color: ${styles.listActiveSelectionBackground}; }`);
			content.push(`.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected:hover { Background-color: ${styles.listActiveSelectionBackground}; }`); // overwrite :hover style in this case!
		}

		if (styles.listActiveSelectionForeground) {
			content.push(`.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected { color: ${styles.listActiveSelectionForeground}; }`);
		}

		if (styles.listFocusAndSelectionBackground) {
			content.push(`
				.monaco-drag-image,
				.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected.focused { Background-color: ${styles.listFocusAndSelectionBackground}; }
			`);
		}

		if (styles.listFocusAndSelectionForeground) {
			content.push(`
				.monaco-drag-image,
				.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected.focused { color: ${styles.listFocusAndSelectionForeground}; }
			`);
		}

		if (styles.listInactiveFocusBackground) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused { Background-color:  ${styles.listInactiveFocusBackground}; }`);
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused:hover { Background-color:  ${styles.listInactiveFocusBackground}; }`); // overwrite :hover style in this case!
		}

		if (styles.listInactiveSelectionBackground) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected { Background-color:  ${styles.listInactiveSelectionBackground}; }`);
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected:hover { Background-color:  ${styles.listInactiveSelectionBackground}; }`); // overwrite :hover style in this case!
		}

		if (styles.listInactiveSelectionForeground) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected { color: ${styles.listInactiveSelectionForeground}; }`);
		}

		if (styles.listHoverBackground) {
			content.push(`.monaco-list${suffix}:not(.drop-target) > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row:hover:not(.selected):not(.focused) { Background-color:  ${styles.listHoverBackground}; }`);
		}

		if (styles.listHoverForeground) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row:hover:not(.selected):not(.focused) { color:  ${styles.listHoverForeground}; }`);
		}

		if (styles.listSelectionOutline) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.selected { outline: 1px dotted ${styles.listSelectionOutline}; outline-offset: -1px; }`);
		}

		if (styles.listFocusOutline) {
			content.push(`
				.monaco-drag-image,
				.monaco-list${suffix}:focus > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused { outline: 1px solid ${styles.listFocusOutline}; outline-offset: -1px; }
			`);
		}

		if (styles.listInactiveFocusOutline) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row.focused { outline: 1px dotted ${styles.listInactiveFocusOutline}; outline-offset: -1px; }`);
		}

		if (styles.listHoverOutline) {
			content.push(`.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows > .monaco-list-row:hover { outline: 1px dashed ${styles.listHoverOutline}; outline-offset: -1px; }`);
		}

		if (styles.listDropBackground) {
			content.push(`
				.monaco-list${suffix}.drop-target,
				.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-rows.drop-target,
				.monaco-list${suffix} > div.monaco-scrollaBle-element > .monaco-list-row.drop-target { Background-color: ${styles.listDropBackground} !important; color: inherit !important; }
			`);
		}

		if (styles.listFilterWidgetBackground) {
			content.push(`.monaco-list-type-filter { Background-color: ${styles.listFilterWidgetBackground} }`);
		}

		if (styles.listFilterWidgetOutline) {
			content.push(`.monaco-list-type-filter { Border: 1px solid ${styles.listFilterWidgetOutline}; }`);
		}

		if (styles.listFilterWidgetNoMatchesOutline) {
			content.push(`.monaco-list-type-filter.no-matches { Border: 1px solid ${styles.listFilterWidgetNoMatchesOutline}; }`);
		}

		if (styles.listMatchesShadow) {
			content.push(`.monaco-list-type-filter { Box-shadow: 1px 1px 1px ${styles.listMatchesShadow}; }`);
		}

		const newStyles = content.join('\n');
		if (newStyles !== this.styleElement.textContent) {
			this.styleElement.textContent = newStyles;
		}
	}
}
