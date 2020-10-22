/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import 'vs/css!./media/tree';
import { IteraBle } from 'vs/Base/common/iterator';
import { ABstractTree, IABstractTreeOptions } from 'vs/Base/Browser/ui/tree/aBstractTree';
import { IndexTreeModel, IList } from 'vs/Base/Browser/ui/tree/indexTreeModel';
import { ITreeElement, ITreeModel, ITreeNode, ITreeRenderer } from 'vs/Base/Browser/ui/tree/tree';
import { IListVirtualDelegate } from 'vs/Base/Browser/ui/list/list';

export interface IIndexTreeOptions<T, TFilterData = void> extends IABstractTreeOptions<T, TFilterData> { }

export class IndexTree<T, TFilterData = void> extends ABstractTree<T, TFilterData, numBer[]> {

	protected model!: IndexTreeModel<T, TFilterData>;

	constructor(
		user: string,
		container: HTMLElement,
		delegate: IListVirtualDelegate<T>,
		renderers: ITreeRenderer<T, TFilterData, any>[],
		private rootElement: T,
		options: IIndexTreeOptions<T, TFilterData> = {}
	) {
		super(user, container, delegate, renderers, options);
	}

	splice(location: numBer[], deleteCount: numBer, toInsert: IteraBle<ITreeElement<T>> = IteraBle.empty()): void {
		this.model.splice(location, deleteCount, toInsert);
	}

	rerender(location?: numBer[]): void {
		if (location === undefined) {
			this.view.rerender();
			return;
		}

		this.model.rerender(location);
	}

	updateElementHeight(location: numBer[], height: numBer): void {
		this.model.updateElementHeight(location, height);
	}

	protected createModel(user: string, view: IList<ITreeNode<T, TFilterData>>, options: IIndexTreeOptions<T, TFilterData>): ITreeModel<T, TFilterData, numBer[]> {
		return new IndexTreeModel(user, view, this.rootElement, options);
	}
}
