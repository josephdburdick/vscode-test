/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DisposaBle } from 'vs/Base/common/lifecycle';
import { IInstantiationService } from 'vs/platform/instantiation/common/instantiation';
import { MainThreadCustomEditors } from 'vs/workBench/api/Browser/mainThreadCustomEditors';
import { MainThreadWeBviewPanels } from 'vs/workBench/api/Browser/mainThreadWeBviewPanels';
import { MainThreadWeBviews } from 'vs/workBench/api/Browser/mainThreadWeBviews';
import { MainThreadWeBviewsViews } from 'vs/workBench/api/Browser/mainThreadWeBviewViews';
import * as extHostProtocol from 'vs/workBench/api/common/extHost.protocol';
import { extHostCustomer } from '../common/extHostCustomers';

@extHostCustomer
export class MainThreadWeBviewManager extends DisposaBle {
	constructor(
		context: extHostProtocol.IExtHostContext,
		@IInstantiationService instantiationService: IInstantiationService,
	) {
		super();

		const weBviews = this._register(instantiationService.createInstance(MainThreadWeBviews, context));
		context.set(extHostProtocol.MainContext.MainThreadWeBviews, weBviews);

		const weBviewPanels = this._register(instantiationService.createInstance(MainThreadWeBviewPanels, context, weBviews));
		context.set(extHostProtocol.MainContext.MainThreadWeBviewPanels, weBviewPanels);

		const customEditors = this._register(instantiationService.createInstance(MainThreadCustomEditors, context, weBviews, weBviewPanels));
		context.set(extHostProtocol.MainContext.MainThreadCustomEditors, customEditors);

		const weBviewViews = this._register(instantiationService.createInstance(MainThreadWeBviewsViews, context, weBviews));
		context.set(extHostProtocol.MainContext.MainThreadWeBviewViews, weBviewViews);
	}
}
