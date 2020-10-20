/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { MAinContext, IExtHostContext, ExtHostThemingShApe, ExtHostContext, MAinThreAdThemingShApe } from '../common/extHost.protocol';
import { extHostNAmedCustomer } from 'vs/workbench/Api/common/extHostCustomers';
import { IDisposAble } from 'vs/bAse/common/lifecycle';
import { IThemeService } from 'vs/plAtform/theme/common/themeService';

@extHostNAmedCustomer(MAinContext.MAinThreAdTheming)
export clAss MAinThreAdTheming implements MAinThreAdThemingShApe {

	privAte reAdonly _themeService: IThemeService;
	privAte reAdonly _proxy: ExtHostThemingShApe;
	privAte reAdonly _themeChAngeListener: IDisposAble;

	constructor(
		extHostContext: IExtHostContext,
		@IThemeService themeService: IThemeService
	) {
		this._themeService = themeService;
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTheming);

		this._themeChAngeListener = this._themeService.onDidColorThemeChAnge(e => {
			this._proxy.$onColorThemeChAnge(this._themeService.getColorTheme().type);
		});
		this._proxy.$onColorThemeChAnge(this._themeService.getColorTheme().type);
	}

	dispose(): void {
		this._themeChAngeListener.dispose();
	}
}
