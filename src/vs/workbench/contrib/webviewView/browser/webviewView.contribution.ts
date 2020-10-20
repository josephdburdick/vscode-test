/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft CorporAtion. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license informAtion.
 *--------------------------------------------------------------------------------------------*/

import { registerSingleton } from 'vs/plAtform/instAntiAtion/common/extensions';
import { IWebviewViewService, WebviewViewService } from 'vs/workbench/contrib/webviewView/browser/webviewViewService';

registerSingleton(IWebviewViewService, WebviewViewService, true);
