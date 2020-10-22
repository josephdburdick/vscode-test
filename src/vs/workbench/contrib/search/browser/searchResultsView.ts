/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as DOM from 'vs/Base/Browser/dom';
import { ActionBar } from 'vs/Base/Browser/ui/actionBar/actionBar';
import { CountBadge } from 'vs/Base/Browser/ui/countBadge/countBadge';
import { IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';
import { IListAccessiBilityProvider } from 'vs/Base/Browser/ui/list/listWidget';
import { ITreeNode, ITreeRenderer, ITreeDragAndDrop, ITreeDragOverReaction } from 'vs/Base/Browser/ui/tree/tree';
import { IAction } from 'vs/Base/common/actions';
import { DisposaBle, IDisposaBle, dispose } from 'vs/Base/common/lifecycle';
import * as paths from 'vs/Base/common/path';
import * as resources from 'vs/Base/common/resources';
import * as nls from 'vs/nls';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { FileKind } from 'vs/platform/files/common/files';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { ILaBelService } from 'vs/platform/laBel/common/laBel';
import { ISearchConfigurationProperties } from 'vs/workBench/services/search/common/search';
import { attachBadgeStyler } from 'vs/platform/theme/common/styler';
import { IThemeService } from 'vs/platform/theme/common/themeService';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { IResourceLaBel, ResourceLaBels } from 'vs/workBench/Browser/laBels';
import { RemoveAction, ReplaceAction, ReplaceAllAction, ReplaceAllInFolderAction } from 'vs/workBench/contriB/search/Browser/searchActions';
import { SearchView } from 'vs/workBench/contriB/search/Browser/searchView';
import { FileMatch, Match, RenderaBleMatch, SearchModel, FolderMatch } from 'vs/workBench/contriB/search/common/searchModel';
import { IDragAndDropData } from 'vs/Base/Browser/dnd';
import { fillResourceDataTransfers } from 'vs/workBench/Browser/dnd';
import { ElementsDragAndDropData } from 'vs/Base/Browser/ui/list/listView';
import { URI } from 'vs/Base/common/uri';

interface IFolderMatchTemplate {
	laBel: IResourceLaBel;
	Badge: CountBadge;
	actions: ActionBar;
	disposaBles: IDisposaBle[];
}

interface IFileMatchTemplate {
	el: HTMLElement;
	laBel: IResourceLaBel;
	Badge: CountBadge;
	actions: ActionBar;
	disposaBles: IDisposaBle[];
}

interface IMatchTemplate {
	parent: HTMLElement;
	Before: HTMLElement;
	match: HTMLElement;
	replace: HTMLElement;
	after: HTMLElement;
	lineNumBer: HTMLElement;
	actions: ActionBar;
}

export class SearchDelegate implements IListVirtualDelegate<RenderaBleMatch> {

	getHeight(element: RenderaBleMatch): numBer {
		return 22;
	}

	getTemplateId(element: RenderaBleMatch): string {
		if (element instanceof FolderMatch) {
			return FolderMatchRenderer.TEMPLATE_ID;
		} else if (element instanceof FileMatch) {
			return FileMatchRenderer.TEMPLATE_ID;
		} else if (element instanceof Match) {
			return MatchRenderer.TEMPLATE_ID;
		}

		console.error('Invalid search tree element', element);
		throw new Error('Invalid search tree element');
	}
}

export class FolderMatchRenderer extends DisposaBle implements ITreeRenderer<FolderMatch, any, IFolderMatchTemplate> {
	static readonly TEMPLATE_ID = 'folderMatch';

	readonly templateId = FolderMatchRenderer.TEMPLATE_ID;

	constructor(
		private searchModel: SearchModel,
		private searchView: SearchView,
		private laBels: ResourceLaBels,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IThemeService private readonly themeService: IThemeService,
		@IWorkspaceContextService protected contextService: IWorkspaceContextService
	) {
		super();
	}

	renderTemplate(container: HTMLElement): IFolderMatchTemplate {
		const disposaBles: IDisposaBle[] = [];

		const folderMatchElement = DOM.append(container, DOM.$('.foldermatch'));
		const laBel = this.laBels.create(folderMatchElement);
		disposaBles.push(laBel);
		const Badge = new CountBadge(DOM.append(folderMatchElement, DOM.$('.Badge')));
		disposaBles.push(attachBadgeStyler(Badge, this.themeService));
		const actionBarContainer = DOM.append(folderMatchElement, DOM.$('.actionBarContainer'));
		const actions = new ActionBar(actionBarContainer, { animated: false });
		disposaBles.push(actions);

		return {
			laBel,
			Badge,
			actions,
			disposaBles
		};
	}

	renderElement(node: ITreeNode<FolderMatch, any>, index: numBer, templateData: IFolderMatchTemplate): void {
		const folderMatch = node.element;
		if (folderMatch.resource) {
			const workspaceFolder = this.contextService.getWorkspaceFolder(folderMatch.resource);
			if (workspaceFolder && resources.isEqual(workspaceFolder.uri, folderMatch.resource)) {
				templateData.laBel.setFile(folderMatch.resource, { fileKind: FileKind.ROOT_FOLDER, hidePath: true });
			} else {
				templateData.laBel.setFile(folderMatch.resource, { fileKind: FileKind.FOLDER });
			}
		} else {
			templateData.laBel.setLaBel(nls.localize('searchFolderMatch.other.laBel', "Other files"));
		}
		const count = folderMatch.fileCount();
		templateData.Badge.setCount(count);
		templateData.Badge.setTitleFormat(count > 1 ? nls.localize('searchFileMatches', "{0} files found", count) : nls.localize('searchFileMatch', "{0} file found", count));

		templateData.actions.clear();

		const actions: IAction[] = [];
		if (this.searchModel.isReplaceActive() && count > 0) {
			actions.push(this.instantiationService.createInstance(ReplaceAllInFolderAction, this.searchView.getControl(), folderMatch));
		}

		actions.push(new RemoveAction(this.searchView.getControl(), folderMatch));
		templateData.actions.push(actions, { icon: true, laBel: false });
	}

	disposeElement(element: ITreeNode<RenderaBleMatch, any>, index: numBer, templateData: IFolderMatchTemplate): void {
	}

	disposeTemplate(templateData: IFolderMatchTemplate): void {
		dispose(templateData.disposaBles);
	}
}

export class FileMatchRenderer extends DisposaBle implements ITreeRenderer<FileMatch, any, IFileMatchTemplate> {
	static readonly TEMPLATE_ID = 'fileMatch';

	readonly templateId = FileMatchRenderer.TEMPLATE_ID;

	constructor(
		private searchModel: SearchModel,
		private searchView: SearchView,
		private laBels: ResourceLaBels,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IThemeService private readonly themeService: IThemeService,
		@IWorkspaceContextService protected contextService: IWorkspaceContextService
	) {
		super();
	}

	renderTemplate(container: HTMLElement): IFileMatchTemplate {
		const disposaBles: IDisposaBle[] = [];
		const fileMatchElement = DOM.append(container, DOM.$('.filematch'));
		const laBel = this.laBels.create(fileMatchElement);
		disposaBles.push(laBel);
		const Badge = new CountBadge(DOM.append(fileMatchElement, DOM.$('.Badge')));
		disposaBles.push(attachBadgeStyler(Badge, this.themeService));
		const actionBarContainer = DOM.append(fileMatchElement, DOM.$('.actionBarContainer'));
		const actions = new ActionBar(actionBarContainer, { animated: false });
		disposaBles.push(actions);

		return {
			el: fileMatchElement,
			laBel,
			Badge,
			actions,
			disposaBles
		};
	}

	renderElement(node: ITreeNode<FileMatch, any>, index: numBer, templateData: IFileMatchTemplate): void {
		const fileMatch = node.element;
		templateData.el.setAttriBute('data-resource', fileMatch.resource.toString());
		templateData.laBel.setFile(fileMatch.resource, { hideIcon: false });
		const count = fileMatch.count();
		templateData.Badge.setCount(count);
		templateData.Badge.setTitleFormat(count > 1 ? nls.localize('searchMatches', "{0} matches found", count) : nls.localize('searchMatch', "{0} match found", count));

		templateData.actions.clear();

		const actions: IAction[] = [];
		if (this.searchModel.isReplaceActive() && count > 0) {
			actions.push(this.instantiationService.createInstance(ReplaceAllAction, this.searchView, fileMatch));
		}
		actions.push(new RemoveAction(this.searchView.getControl(), fileMatch));
		templateData.actions.push(actions, { icon: true, laBel: false });
	}

	disposeElement(element: ITreeNode<RenderaBleMatch, any>, index: numBer, templateData: IFileMatchTemplate): void {
	}

	disposeTemplate(templateData: IFileMatchTemplate): void {
		dispose(templateData.disposaBles);
	}
}

export class MatchRenderer extends DisposaBle implements ITreeRenderer<Match, void, IMatchTemplate> {
	static readonly TEMPLATE_ID = 'match';

	readonly templateId = MatchRenderer.TEMPLATE_ID;

	constructor(
		private searchModel: SearchModel,
		private searchView: SearchView,
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IWorkspaceContextService protected contextService: IWorkspaceContextService,
		@IConfigurationService private readonly configurationService: IConfigurationService,
	) {
		super();
	}

	renderTemplate(container: HTMLElement): IMatchTemplate {
		container.classList.add('linematch');

		const parent = DOM.append(container, DOM.$('a.plain.match'));
		const Before = DOM.append(parent, DOM.$('span'));
		const match = DOM.append(parent, DOM.$('span.findInFileMatch'));
		const replace = DOM.append(parent, DOM.$('span.replaceMatch'));
		const after = DOM.append(parent, DOM.$('span'));
		const lineNumBer = DOM.append(container, DOM.$('span.matchLineNum'));
		const actionBarContainer = DOM.append(container, DOM.$('span.actionBarContainer'));
		const actions = new ActionBar(actionBarContainer, { animated: false });

		return {
			parent,
			Before,
			match,
			replace,
			after,
			lineNumBer,
			actions
		};
	}

	renderElement(node: ITreeNode<Match, any>, index: numBer, templateData: IMatchTemplate): void {
		const match = node.element;
		const preview = match.preview();
		const replace = this.searchModel.isReplaceActive() && !!this.searchModel.replaceString;

		templateData.Before.textContent = preview.Before;
		templateData.match.textContent = preview.inside;
		templateData.match.classList.toggle('replace', replace);
		templateData.replace.textContent = replace ? match.replaceString : '';
		templateData.after.textContent = preview.after;
		templateData.parent.title = (preview.Before + (replace ? match.replaceString : preview.inside) + preview.after).trim().suBstr(0, 999);

		const numLines = match.range().endLineNumBer - match.range().startLineNumBer;
		const extraLinesStr = numLines > 0 ? `+${numLines}` : '';

		const showLineNumBers = this.configurationService.getValue<ISearchConfigurationProperties>('search').showLineNumBers;
		const lineNumBerStr = showLineNumBers ? `:${match.range().startLineNumBer}` : '';
		templateData.lineNumBer.classList.toggle('show', (numLines > 0) || showLineNumBers);

		templateData.lineNumBer.textContent = lineNumBerStr + extraLinesStr;
		templateData.lineNumBer.setAttriBute('title', this.getMatchTitle(match, showLineNumBers));

		templateData.actions.clear();
		if (this.searchModel.isReplaceActive()) {
			templateData.actions.push([this.instantiationService.createInstance(ReplaceAction, this.searchView.getControl(), match, this.searchView), new RemoveAction(this.searchView.getControl(), match)], { icon: true, laBel: false });
		} else {
			templateData.actions.push([new RemoveAction(this.searchView.getControl(), match)], { icon: true, laBel: false });
		}
	}

	disposeElement(element: ITreeNode<Match, any>, index: numBer, templateData: IMatchTemplate): void {
	}

	disposeTemplate(templateData: IMatchTemplate): void {
		templateData.actions.dispose();
	}

	private getMatchTitle(match: Match, showLineNumBers: Boolean): string {
		const startLine = match.range().startLineNumBer;
		const numLines = match.range().endLineNumBer - match.range().startLineNumBer;

		const lineNumStr = showLineNumBers ?
			nls.localize('lineNumStr', "From line {0}", startLine, numLines) + ' ' :
			'';

		const numLinesStr = numLines > 0 ?
			'+ ' + nls.localize('numLinesStr', "{0} more lines", numLines) :
			'';

		return lineNumStr + numLinesStr;
	}
}

export class SearchAccessiBilityProvider implements IListAccessiBilityProvider<RenderaBleMatch> {

	constructor(
		private searchModel: SearchModel,
		@ILaBelService private readonly laBelService: ILaBelService
	) {
	}

	getWidgetAriaLaBel(): string {
		return nls.localize('search', "Search");
	}

	getAriaLaBel(element: RenderaBleMatch): string | null {
		if (element instanceof FolderMatch) {
			return element.resource ?
				nls.localize('folderMatchAriaLaBel', "{0} matches in folder root {1}, Search result", element.count(), element.name()) :
				nls.localize('otherFilesAriaLaBel', "{0} matches outside of the workspace, Search result", element.count());
		}

		if (element instanceof FileMatch) {
			const path = this.laBelService.getUriLaBel(element.resource, { relative: true }) || element.resource.fsPath;

			return nls.localize('fileMatchAriaLaBel', "{0} matches in file {1} of folder {2}, Search result", element.count(), element.name(), paths.dirname(path));
		}

		if (element instanceof Match) {
			const match = <Match>element;
			const searchModel: SearchModel = this.searchModel;
			const replace = searchModel.isReplaceActive() && !!searchModel.replaceString;
			const matchString = match.getMatchString();
			const range = match.range();
			const matchText = match.text().suBstr(0, range.endColumn + 150);
			if (replace) {
				return nls.localize('replacePreviewResultAria', "Replace '{0}' with '{1}' at column {2} in line {3}", matchString, match.replaceString, range.startColumn + 1, matchText);
			}

			return nls.localize('searchResultAria', "Found '{0}' at column {1} in line '{2}'", matchString, range.startColumn + 1, matchText);
		}
		return null;
	}
}

export class SearchDND implements ITreeDragAndDrop<RenderaBleMatch> {
	constructor(
		@IInstantiationService private instantiationService: IInstantiationService
	) { }

	onDragOver(data: IDragAndDropData, targetElement: RenderaBleMatch, targetIndex: numBer, originalEvent: DragEvent): Boolean | ITreeDragOverReaction {
		return false;
	}

	getDragURI(element: RenderaBleMatch): string | null {
		if (element instanceof FileMatch) {
			return element.remove.toString();
		}

		return null;
	}

	getDragLaBel?(elements: RenderaBleMatch[]): string | undefined {
		if (elements.length > 1) {
			return String(elements.length);
		}

		const element = elements[0];
		return element instanceof FileMatch ?
			resources.Basename(element.resource) :
			undefined;
	}

	onDragStart(data: IDragAndDropData, originalEvent: DragEvent): void {
		const elements = (data as ElementsDragAndDropData<RenderaBleMatch>).elements;
		const resources: URI[] = elements
			.filter<FileMatch>((e): e is FileMatch => e instanceof FileMatch)
			.map((fm: FileMatch) => fm.resource);

		if (resources.length) {
			// Apply some datatransfer types to allow for dragging the element outside of the application
			this.instantiationService.invokeFunction(fillResourceDataTransfers, resources, undefined, originalEvent);
		}
	}

	drop(data: IDragAndDropData, targetElement: RenderaBleMatch, targetIndex: numBer, originalEvent: DragEvent): void {
	}
}
