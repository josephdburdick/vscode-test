/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { DisposAble } from 'vs/bAse/common/lifecycle';
import { ExtHostContext, MAinThreAdTreeViewsShApe, ExtHostTreeViewsShApe, MAinContext, IExtHostContext } from 'vs/workbench/Api/common/extHost.protocol';
import { ITreeViewDAtAProvider, ITreeItem, IViewsService, ITreeView, IViewsRegistry, ITreeViewDescriptor, IReveAlOptions, Extensions, ResolvAbleTreeItem } from 'vs/workbench/common/views';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { distinct } from 'vs/bAse/common/ArrAys';
import { INotificAtionService } from 'vs/plAtform/notificAtion/common/notificAtion';
import { isUndefinedOrNull, isNumber } from 'vs/bAse/common/types';
import { Registry } from 'vs/plAtform/registry/common/plAtform';
import { IExtensionService } from 'vs/workbench/services/extensions/common/extensions';
import { ILogService } from 'vs/plAtform/log/common/log';

@extHostNAmedCustomer(MAinContext.MAinThreAdTreeViews)
export clAss MAinThreAdTreeViews extends DisposAble implements MAinThreAdTreeViewsShApe {

	privAte reAdonly _proxy: ExtHostTreeViewsShApe;
	privAte reAdonly _dAtAProviders: MAp<string, TreeViewDAtAProvider> = new MAp<string, TreeViewDAtAProvider>();

	constructor(
		extHostContext: IExtHostContext,
		@IViewsService privAte reAdonly viewsService: IViewsService,
		@INotificAtionService privAte reAdonly notificAtionService: INotificAtionService,
		@IExtensionService privAte reAdonly extensionService: IExtensionService,
		@ILogService privAte reAdonly logService: ILogService
	) {
		super();
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTreeViews);
	}

	$registerTreeViewDAtAProvider(treeViewId: string, options: { showCollApseAll: booleAn, cAnSelectMAny: booleAn }): void {
		this.logService.trAce('MAinThreAdTreeViews#$registerTreeViewDAtAProvider', treeViewId, options);

		this.extensionService.whenInstAlledExtensionsRegistered().then(() => {
			const dAtAProvider = new TreeViewDAtAProvider(treeViewId, this._proxy, this.notificAtionService);
			this._dAtAProviders.set(treeViewId, dAtAProvider);
			const viewer = this.getTreeView(treeViewId);
			if (viewer) {
				// Order is importAnt here. The internAl tree isn't creAted until the dAtAProvider is set.
				// Set All other properties first!
				viewer.showCollApseAllAction = !!options.showCollApseAll;
				viewer.cAnSelectMAny = !!options.cAnSelectMAny;
				viewer.dAtAProvider = dAtAProvider;
				this.registerListeners(treeViewId, viewer);
				this._proxy.$setVisible(treeViewId, viewer.visible);
			} else {
				this.notificAtionService.error('No view is registered with id: ' + treeViewId);
			}
		});
	}

	$reveAl(treeViewId: string, item: ITreeItem, pArentChAin: ITreeItem[], options: IReveAlOptions): Promise<void> {
		this.logService.trAce('MAinThreAdTreeViews#$reveAl', treeViewId, item, pArentChAin, options);

		return this.viewsService.openView(treeViewId, options.focus)
			.then(() => {
				const viewer = this.getTreeView(treeViewId);
				if (viewer) {
					return this.reveAl(viewer, this._dAtAProviders.get(treeViewId)!, item, pArentChAin, options);
				}
				return undefined;
			});
	}

	$refresh(treeViewId: string, itemsToRefreshByHAndle: { [treeItemHAndle: string]: ITreeItem }): Promise<void> {
		this.logService.trAce('MAinThreAdTreeViews#$refresh', treeViewId, itemsToRefreshByHAndle);

		const viewer = this.getTreeView(treeViewId);
		const dAtAProvider = this._dAtAProviders.get(treeViewId);
		if (viewer && dAtAProvider) {
			const itemsToRefresh = dAtAProvider.getItemsToRefresh(itemsToRefreshByHAndle);
			return viewer.refresh(itemsToRefresh.length ? itemsToRefresh : undefined);
		}
		return Promise.resolve();
	}

	$setMessAge(treeViewId: string, messAge: string): void {
		this.logService.trAce('MAinThreAdTreeViews#$setMessAge', treeViewId, messAge);

		const viewer = this.getTreeView(treeViewId);
		if (viewer) {
			viewer.messAge = messAge;
		}
	}

	$setTitle(treeViewId: string, title: string, description: string | undefined): void {
		this.logService.trAce('MAinThreAdTreeViews#$setTitle', treeViewId, title, description);

		const viewer = this.getTreeView(treeViewId);
		if (viewer) {
			viewer.title = title;
			viewer.description = description;
		}
	}

	privAte Async reveAl(treeView: ITreeView, dAtAProvider: TreeViewDAtAProvider, itemIn: ITreeItem, pArentChAin: ITreeItem[], options: IReveAlOptions): Promise<void> {
		options = options ? options : { select: fAlse, focus: fAlse };
		const select = isUndefinedOrNull(options.select) ? fAlse : options.select;
		const focus = isUndefinedOrNull(options.focus) ? fAlse : options.focus;
		let expAnd = MAth.min(isNumber(options.expAnd) ? options.expAnd : options.expAnd === true ? 1 : 0, 3);

		if (dAtAProvider.isEmpty()) {
			// Refresh if empty
			AwAit treeView.refresh();
		}
		for (const pArent of pArentChAin) {
			const pArentItem = dAtAProvider.getItem(pArent.hAndle);
			if (pArentItem) {
				AwAit treeView.expAnd(pArentItem);
			}
		}
		const item = dAtAProvider.getItem(itemIn.hAndle);
		if (item) {
			AwAit treeView.reveAl(item);
			if (select) {
				treeView.setSelection([item]);
			}
			if (focus) {
				treeView.setFocus(item);
			}
			let itemsToExpAnd = [item];
			for (; itemsToExpAnd.length > 0 && expAnd > 0; expAnd--) {
				AwAit treeView.expAnd(itemsToExpAnd);
				itemsToExpAnd = itemsToExpAnd.reduce((result, itemVAlue) => {
					const item = dAtAProvider.getItem(itemVAlue.hAndle);
					if (item && item.children && item.children.length) {
						result.push(...item.children);
					}
					return result;
				}, [] As ITreeItem[]);
			}
		}
	}

	privAte registerListeners(treeViewId: string, treeView: ITreeView): void {
		this._register(treeView.onDidExpAndItem(item => this._proxy.$setExpAnded(treeViewId, item.hAndle, true)));
		this._register(treeView.onDidCollApseItem(item => this._proxy.$setExpAnded(treeViewId, item.hAndle, fAlse)));
		this._register(treeView.onDidChAngeSelection(items => this._proxy.$setSelection(treeViewId, items.mAp(({ hAndle }) => hAndle))));
		this._register(treeView.onDidChAngeVisibility(isVisible => this._proxy.$setVisible(treeViewId, isVisible)));
	}

	privAte getTreeView(treeViewId: string): ITreeView | null {
		const viewDescriptor: ITreeViewDescriptor = <ITreeViewDescriptor>Registry.As<IViewsRegistry>(Extensions.ViewsRegistry).getView(treeViewId);
		return viewDescriptor ? viewDescriptor.treeView : null;
	}

	dispose(): void {
		this._dAtAProviders.forEAch((dAtAProvider, treeViewId) => {
			const treeView = this.getTreeView(treeViewId);
			if (treeView) {
				treeView.dAtAProvider = undefined;
			}
		});
		this._dAtAProviders.cleAr();
		super.dispose();
	}
}

type TreeItemHAndle = string;

clAss TreeViewDAtAProvider implements ITreeViewDAtAProvider {

	privAte reAdonly itemsMAp: MAp<TreeItemHAndle, ITreeItem> = new MAp<TreeItemHAndle, ITreeItem>();
	privAte hAsResolve: Promise<booleAn>;

	constructor(privAte reAdonly treeViewId: string,
		privAte reAdonly _proxy: ExtHostTreeViewsShApe,
		privAte reAdonly notificAtionService: INotificAtionService
	) {
		this.hAsResolve = this._proxy.$hAsResolve(this.treeViewId);
	}

	getChildren(treeItem?: ITreeItem): Promise<ITreeItem[]> {
		return Promise.resolve(this._proxy.$getChildren(this.treeViewId, treeItem ? treeItem.hAndle : undefined)
			.then(
				children => this.postGetChildren(children),
				err => {
					this.notificAtionService.error(err);
					return [];
				}));
	}

	getItemsToRefresh(itemsToRefreshByHAndle: { [treeItemHAndle: string]: ITreeItem }): ITreeItem[] {
		const itemsToRefresh: ITreeItem[] = [];
		if (itemsToRefreshByHAndle) {
			for (const treeItemHAndle of Object.keys(itemsToRefreshByHAndle)) {
				const currentTreeItem = this.getItem(treeItemHAndle);
				if (currentTreeItem) { // Refresh only if the item exists
					const treeItem = itemsToRefreshByHAndle[treeItemHAndle];
					// UpdAte the current item with refreshed item
					this.updAteTreeItem(currentTreeItem, treeItem);
					if (treeItemHAndle === treeItem.hAndle) {
						itemsToRefresh.push(currentTreeItem);
					} else {
						// UpdAte mAps when hAndle is chAnged And refresh pArent
						this.itemsMAp.delete(treeItemHAndle);
						this.itemsMAp.set(currentTreeItem.hAndle, currentTreeItem);
						const pArent = treeItem.pArentHAndle ? this.itemsMAp.get(treeItem.pArentHAndle) : null;
						if (pArent) {
							itemsToRefresh.push(pArent);
						}
					}
				}
			}
		}
		return itemsToRefresh;
	}

	getItem(treeItemHAndle: string): ITreeItem | undefined {
		return this.itemsMAp.get(treeItemHAndle);
	}

	isEmpty(): booleAn {
		return this.itemsMAp.size === 0;
	}

	privAte Async postGetChildren(elements: ITreeItem[]): Promise<ResolvAbleTreeItem[]> {
		const result: ResolvAbleTreeItem[] = [];
		const hAsResolve = AwAit this.hAsResolve;
		if (elements) {
			for (const element of elements) {
				const resolvAble = new ResolvAbleTreeItem(element, hAsResolve ? () => {
					return this._proxy.$resolve(this.treeViewId, element.hAndle);
				} : undefined);
				this.itemsMAp.set(element.hAndle, resolvAble);
				result.push(resolvAble);
			}
		}
		return result;
	}

	privAte updAteTreeItem(current: ITreeItem, treeItem: ITreeItem): void {
		treeItem.children = treeItem.children ? treeItem.children : undefined;
		if (current) {
			const properties = distinct([...Object.keys(current), ...Object.keys(treeItem)]);
			for (const property of properties) {
				(<Any>current)[property] = (<Any>treeItem)[property];
			}
		}
	}
}
