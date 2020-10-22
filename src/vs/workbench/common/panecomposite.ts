/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IView, IViewPaneContainer } from 'vs/workBench/common/views';
import { IComposite } from 'vs/workBench/common/composite';

export interface IPaneComposite extends IComposite {
	openView<T extends IView>(id: string, focus?: Boolean): T | undefined;
	getViewPaneContainer(): IViewPaneContainer;
	saveState(): void;
}
