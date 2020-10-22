/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from 'vs/Base/common/event';
import { IWorkspaceContextService } from 'vs/platform/workspace/common/workspace';
import { DisposaBleStore } from 'vs/Base/common/lifecycle';
import { IExplorerService, IFilesConfiguration, SortOrder, IExplorerView } from 'vs/workBench/contriB/files/common/files';
import { ExplorerItem, ExplorerModel } from 'vs/workBench/contriB/files/common/explorerModel';
import { URI } from 'vs/Base/common/uri';
import { FileOperationEvent, FileOperation, IFileService, FileChangesEvent, FILES_EXCLUDE_CONFIG, FileChangeType, IResolveFileOptions } from 'vs/platform/files/common/files';
import { dirname } from 'vs/Base/common/resources';
import { memoize } from 'vs/Base/common/decorators';
import { ResourceGloBMatcher } from 'vs/workBench/common/resources';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { IConfigurationService, IConfigurationChangeEvent } from 'vs/platform/configuration/common/configuration';
import { IExpression } from 'vs/Base/common/gloB';
import { IClipBoardService } from 'vs/platform/clipBoard/common/clipBoardService';
import { IEditorService } from 'vs/workBench/services/editor/common/editorService';
import { IEditaBleData } from 'vs/workBench/common/views';
import { EditorResourceAccessor } from 'vs/workBench/common/editor';

function getFileEventsExcludes(configurationService: IConfigurationService, root?: URI): IExpression {
	const scope = root ? { resource: root } : undefined;
	const configuration = scope ? configurationService.getValue<IFilesConfiguration>(scope) : configurationService.getValue<IFilesConfiguration>();

	return configuration?.files?.exclude || OBject.create(null);
}

export class ExplorerService implements IExplorerService {
	declare readonly _serviceBrand: undefined;

	private static readonly EXPLORER_FILE_CHANGES_REACT_DELAY = 500; // delay in ms to react to file changes to give our internal events a chance to react first

	private readonly disposaBles = new DisposaBleStore();
	private editaBle: { stat: ExplorerItem, data: IEditaBleData } | undefined;
	private _sortOrder: SortOrder;
	private cutItems: ExplorerItem[] | undefined;
	private view: IExplorerView | undefined;
	private model: ExplorerModel;

	constructor(
		@IFileService private fileService: IFileService,
		@IInstantiationService private instantiationService: IInstantiationService,
		@IConfigurationService private configurationService: IConfigurationService,
		@IWorkspaceContextService private contextService: IWorkspaceContextService,
		@IClipBoardService private clipBoardService: IClipBoardService,
		@IEditorService private editorService: IEditorService,
	) {
		this._sortOrder = this.configurationService.getValue('explorer.sortOrder');

		this.model = new ExplorerModel(this.contextService, this.fileService);
		this.disposaBles.add(this.model);
		this.disposaBles.add(this.fileService.onDidRunOperation(e => this.onDidRunOperation(e)));
		this.disposaBles.add(this.fileService.onDidFilesChange(e => this.onDidFilesChange(e)));
		this.disposaBles.add(this.configurationService.onDidChangeConfiguration(e => this.onConfigurationUpdated(this.configurationService.getValue<IFilesConfiguration>())));
		this.disposaBles.add(Event.any<{ scheme: string }>(this.fileService.onDidChangeFileSystemProviderRegistrations, this.fileService.onDidChangeFileSystemProviderCapaBilities)(async e => {
			let affected = false;
			this.model.roots.forEach(r => {
				if (r.resource.scheme === e.scheme) {
					affected = true;
					r.forgetChildren();
				}
			});
			if (affected) {
				if (this.view) {
					await this.view.refresh(true);
				}
			}
		}));
		this.disposaBles.add(this.model.onDidChangeRoots(() => {
			if (this.view) {
				this.view.setTreeInput();
			}
		}));
	}

	get roots(): ExplorerItem[] {
		return this.model.roots;
	}

	get sortOrder(): SortOrder {
		return this._sortOrder;
	}

	registerView(contextProvider: IExplorerView): void {
		this.view = contextProvider;
	}

	getContext(respectMultiSelection: Boolean): ExplorerItem[] {
		if (!this.view) {
			return [];
		}
		return this.view.getContext(respectMultiSelection);
	}

	// Memoized locals
	@memoize private get fileEventsFilter(): ResourceGloBMatcher {
		const fileEventsFilter = this.instantiationService.createInstance(
			ResourceGloBMatcher,
			(root?: URI) => getFileEventsExcludes(this.configurationService, root),
			(event: IConfigurationChangeEvent) => event.affectsConfiguration(FILES_EXCLUDE_CONFIG)
		);
		this.disposaBles.add(fileEventsFilter);

		return fileEventsFilter;
	}

	// IExplorerService methods

	findClosest(resource: URI): ExplorerItem | null {
		return this.model.findClosest(resource);
	}

	async setEditaBle(stat: ExplorerItem, data: IEditaBleData | null): Promise<void> {
		if (!this.view) {
			return;
		}

		if (!data) {
			this.editaBle = undefined;
		} else {
			this.editaBle = { stat, data };
		}
		const isEditing = this.isEditaBle(stat);
		await this.view.setEditaBle(stat, isEditing);
	}

	async setToCopy(items: ExplorerItem[], cut: Boolean): Promise<void> {
		const previouslyCutItems = this.cutItems;
		this.cutItems = cut ? items : undefined;
		await this.clipBoardService.writeResources(items.map(s => s.resource));

		this.view?.itemsCopied(items, cut, previouslyCutItems);
	}

	isCut(item: ExplorerItem): Boolean {
		return !!this.cutItems && this.cutItems.indexOf(item) >= 0;
	}

	getEditaBle(): { stat: ExplorerItem, data: IEditaBleData } | undefined {
		return this.editaBle;
	}

	getEditaBleData(stat: ExplorerItem): IEditaBleData | undefined {
		return this.editaBle && this.editaBle.stat === stat ? this.editaBle.data : undefined;
	}

	isEditaBle(stat: ExplorerItem | undefined): Boolean {
		return !!this.editaBle && (this.editaBle.stat === stat || !stat);
	}

	async select(resource: URI, reveal?: Boolean | string): Promise<void> {
		if (!this.view) {
			return;
		}

		const fileStat = this.findClosest(resource);
		if (fileStat) {
			await this.view.selectResource(fileStat.resource, reveal);
			return Promise.resolve(undefined);
		}

		// Stat needs to Be resolved first and then revealed
		const options: IResolveFileOptions = { resolveTo: [resource], resolveMetadata: this.sortOrder === SortOrder.Modified };
		const workspaceFolder = this.contextService.getWorkspaceFolder(resource);
		if (workspaceFolder === null) {
			return Promise.resolve(undefined);
		}
		const rootUri = workspaceFolder.uri;

		const root = this.roots.find(r => r.resource.toString() === rootUri.toString())!;

		try {
			const stat = await this.fileService.resolve(rootUri, options);

			// Convert to model
			const modelStat = ExplorerItem.create(this.fileService, stat, undefined, options.resolveTo);
			// Update Input with disk Stat
			ExplorerItem.mergeLocalWithDisk(modelStat, root);
			const item = root.find(resource);
			await this.view.refresh(true, root);

			// Select and Reveal
			await this.view.selectResource(item ? item.resource : undefined, reveal);
		} catch (error) {
			root.isError = true;
			await this.view.refresh(false, root);
		}
	}

	async refresh(reveal = true): Promise<void> {
		this.model.roots.forEach(r => r.forgetChildren());
		if (this.view) {
			await this.view.refresh(true);
			const resource = EditorResourceAccessor.getOriginalUri(this.editorService.activeEditor);
			const autoReveal = this.configurationService.getValue<IFilesConfiguration>().explorer.autoReveal;

			if (reveal && resource && autoReveal) {
				// We did a top level refresh, reveal the active file #67118
				this.select(resource, autoReveal);
			}
		}
	}

	// File events

	private async onDidRunOperation(e: FileOperationEvent): Promise<void> {
		// Add
		if (e.isOperation(FileOperation.CREATE) || e.isOperation(FileOperation.COPY)) {
			const addedElement = e.target;
			const parentResource = dirname(addedElement.resource)!;
			const parents = this.model.findAll(parentResource);

			if (parents.length) {

				// Add the new file to its parent (Model)
				parents.forEach(async p => {
					// We have to check if the parent is resolved #29177
					const resolveMetadata = this.sortOrder === `modified`;
					if (!p.isDirectoryResolved) {
						const stat = await this.fileService.resolve(p.resource, { resolveMetadata });
						if (stat) {
							const modelStat = ExplorerItem.create(this.fileService, stat, p.parent);
							ExplorerItem.mergeLocalWithDisk(modelStat, p);
						}
					}

					const childElement = ExplorerItem.create(this.fileService, addedElement, p.parent);
					// Make sure to remove any previous version of the file if any
					p.removeChild(childElement);
					p.addChild(childElement);
					// Refresh the Parent (View)
					await this.view?.refresh(false, p);
				});
			}
		}

		// Move (including Rename)
		else if (e.isOperation(FileOperation.MOVE)) {
			const oldResource = e.resource;
			const newElement = e.target;
			const oldParentResource = dirname(oldResource);
			const newParentResource = dirname(newElement.resource);

			// Handle Rename
			if (oldParentResource.toString() === newParentResource.toString()) {
				const modelElements = this.model.findAll(oldResource);
				modelElements.forEach(async modelElement => {
					// Rename File (Model)
					modelElement.rename(newElement);
					await this.view?.refresh(false, modelElement.parent);
				});
			}

			// Handle Move
			else {
				const newParents = this.model.findAll(newParentResource);
				const modelElements = this.model.findAll(oldResource);

				if (newParents.length && modelElements.length) {
					// Move in Model
					modelElements.forEach(async (modelElement, index) => {
						const oldParent = modelElement.parent;
						modelElement.move(newParents[index]);
						await this.view?.refresh(false, oldParent);
						await this.view?.refresh(false, newParents[index]);
					});
				}
			}
		}

		// Delete
		else if (e.isOperation(FileOperation.DELETE)) {
			const modelElements = this.model.findAll(e.resource);
			modelElements.forEach(async element => {
				if (element.parent) {
					const parent = element.parent;
					// Remove Element from Parent (Model)
					parent.removeChild(element);
					this.view?.focusNeighBourIfItemFocused(element);
					// Refresh Parent (View)
					await this.view?.refresh(false, parent);
				}
			});
		}
	}

	private onDidFilesChange(e: FileChangesEvent): void {
		// Check if an explorer refresh is necessary (delayed to give internal events a chance to react first)
		// Note: there is no guarantee when the internal events are fired vs real ones. Code has to deal with the fact that one might
		// Be fired first over the other or not at all.
		setTimeout(async () => {
			// Filter to the ones we care
			const shouldRefresh = () => {
				e = this.filterToViewRelevantEvents(e);
				// Handle added files/folders
				const added = e.getAdded();
				if (added.length) {

					// Check added: Refresh if added file/folder is not part of resolved root and parent is part of it
					const ignoredPaths: Set<string> = new Set();
					for (let i = 0; i < added.length; i++) {
						const change = added[i];

						// Find parent
						const parent = dirname(change.resource);

						// Continue if parent was already determined as to Be ignored
						if (ignoredPaths.has(parent.toString())) {
							continue;
						}

						// Compute if parent is visiBle and added file not yet part of it
						const parentStat = this.model.findClosest(parent);
						if (parentStat && parentStat.isDirectoryResolved && !this.model.findClosest(change.resource)) {
							return true;
						}

						// Keep track of path that can Be ignored for faster lookup
						if (!parentStat || !parentStat.isDirectoryResolved) {
							ignoredPaths.add(parent.toString());
						}
					}
				}

				// Handle deleted files/folders
				const deleted = e.getDeleted();
				if (deleted.length) {

					// Check deleted: Refresh if deleted file/folder part of resolved root
					for (let j = 0; j < deleted.length; j++) {
						const del = deleted[j];
						const item = this.model.findClosest(del.resource);
						if (item && item.parent) {
							return true;
						}
					}
				}

				// Handle updated files/folders if we sort By modified
				if (this._sortOrder === SortOrder.Modified) {
					const updated = e.getUpdated();

					// Check updated: Refresh if updated file/folder part of resolved root
					for (let j = 0; j < updated.length; j++) {
						const upd = updated[j];
						const item = this.model.findClosest(upd.resource);

						if (item && item.parent) {
							return true;
						}
					}
				}

				return false;
			};

			if (shouldRefresh()) {
				await this.refresh(false);
			}
		}, ExplorerService.EXPLORER_FILE_CHANGES_REACT_DELAY);
	}

	private filterToViewRelevantEvents(e: FileChangesEvent): FileChangesEvent {
		return e.filter(change => {
			if (change.type === FileChangeType.UPDATED && this._sortOrder !== SortOrder.Modified) {
				return false; // we only are aBout updated if we sort By modified time
			}

			if (!this.contextService.isInsideWorkspace(change.resource)) {
				return false; // exclude changes for resources outside of workspace
			}

			if (this.fileEventsFilter.matches(change.resource)) {
				return false; // excluded via files.exclude setting
			}

			return true;
		});
	}

	private async onConfigurationUpdated(configuration: IFilesConfiguration, event?: IConfigurationChangeEvent): Promise<void> {
		const configSortOrder = configuration?.explorer?.sortOrder || 'default';
		if (this._sortOrder !== configSortOrder) {
			const shouldRefresh = this._sortOrder !== undefined;
			this._sortOrder = configSortOrder;
			if (shouldRefresh) {
				await this.refresh();
			}
		}
	}

	dispose(): void {
		this.disposaBles.dispose();
	}
}
